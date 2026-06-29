import os
import sys
import json
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (EGX_SYMBOLS, EGX_STOCKS, stock_name, CURRENCY,
                    SNAPSHOT_PATH, PUBLIC_SNAPSHOT_PATH)
from data_fetcher import fetch_historical, fetch_latest
from indicators import calculate_indicators, FEATURE_COLUMNS
from model import load_models, predict_both_timeframes

app = FastAPI(title="Borsa — EGX Stock & Gold Advisor API", version="2.0")

# Safe CORS: credentials are not used, so an open origin list is valid.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---- Optional Firebase (recommendations mirror) --------------------------
db = None
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for p in (os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"),
              os.path.join(base_dir, "..", "firebase-service-account.json"),
              os.path.join(base_dir, "firebase-service-account.json")):
        if p and os.path.exists(p):
            firebase_admin.initialize_app(credentials.Certificate(p))
            db = firestore.client()
            print(f"Firebase initialized from {p}")
            break
except Exception as e:  # pragma: no cover
    print(f"Firebase init skipped: {e}")

model_short, model_long, scaler = load_models()
if model_short is None:
    print("INFO: no ML model found — serving rule-based (TA) recommendations.")


def _load_snapshot():
    for p in (SNAPSHOT_PATH, PUBLIC_SNAPSHOT_PATH):
        if p and os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                continue
    return None


def _snapshot_stock(symbol: str):
    snap = _load_snapshot()
    if not snap:
        return None
    for s in snap.get("stocks", []):
        if s["symbol"] == symbol:
            return s
    return None


def _norm(symbol: str) -> str:
    return symbol if symbol.endswith(".CA") else f"{symbol}.CA"


@app.get("/api/health")
def health():
    snap = _load_snapshot()
    return {
        "status": "ok",
        "model_loaded": model_short is not None,
        "snapshot": bool(snap),
        "snapshot_at": snap.get("generated_at") if snap else None,
    }


@app.get("/api/symbols")
def get_symbols():
    return {"currency": CURRENCY,
            "symbols": [{"symbol": s, "name": n} for s, n in EGX_STOCKS.items()]}


@app.get("/api/snapshot")
def get_snapshot():
    snap = _load_snapshot()
    if not snap:
        raise HTTPException(404, "Snapshot not generated yet. Run snapshot.py")
    return snap


@app.get("/api/prices")
def get_prices():
    snap = _load_snapshot()
    if snap:
        return {s["symbol"]: {"close": s["close"], "change_pct": s.get("change_pct"),
                              "date": s["date"]} for s in snap.get("stocks", [])}
    return fetch_latest(EGX_SYMBOLS)


@app.get("/api/gold")
def get_gold():
    snap = _load_snapshot()
    if snap and snap.get("gold"):
        return snap["gold"]
    from gold import get_gold_snapshot
    return get_gold_snapshot()


@app.get("/api/history/{symbol}")
def get_history(symbol: str, period: str = "2y"):
    cached = _snapshot_stock(_norm(symbol))
    if cached and cached.get("history"):
        return {"symbol": _norm(symbol), "currency": CURRENCY, "data": cached["history"]}
    df = fetch_historical(_norm(symbol), period)
    data = [{"date": str(idx.date()), "close": round(float(r["close"]), 2),
             "open": round(float(r["open"]), 2), "high": round(float(r["high"]), 2),
             "low": round(float(r["low"]), 2), "volume": int(r["volume"])}
            for idx, r in df.iterrows()]
    return {"symbol": _norm(symbol), "currency": CURRENCY, "data": data}


@app.get("/api/indicators/{symbol}")
def get_indicators(symbol: str, period: str = "2y"):
    cached = _snapshot_stock(_norm(symbol))
    if cached and cached.get("indicators"):
        return {"symbol": _norm(symbol), "date": cached["date"],
                "close": cached["close"], "indicators": cached["indicators"]}
    df = fetch_historical(_norm(symbol), period)
    enriched = calculate_indicators(df)
    latest = enriched.iloc[-1]
    return {"symbol": _norm(symbol), "date": str(latest.name.date()),
            "close": round(float(latest["close"]), 2),
            "indicators": {c: round(float(latest[c]), 2)
                           for c in FEATURE_COLUMNS if c in latest}}


@app.get("/api/recommend/{symbol}")
def get_recommendation(symbol: str):
    sym = _norm(symbol)
    cached = _snapshot_stock(sym)
    if cached:
        return {"symbol": sym, "name": cached.get("name"), "date": cached["date"],
                "close": cached["close"], "currency": CURRENCY,
                "short_term": cached["short_term"], "long_term": cached["long_term"]}
    df = fetch_historical(sym, "2y")
    rec = predict_both_timeframes(df, model_short, model_long, scaler)
    latest = df.iloc[-1]
    return {"symbol": sym, "name": stock_name(sym), "date": str(latest.name.date()),
            "close": round(float(latest["close"]), 2), "currency": CURRENCY, **rec}


@app.post("/api/update-all")
def update_all_recommendations():
    """Regenerate the snapshot and mirror recommendations to Firestore."""
    from snapshot import generate
    snap = generate()
    os.makedirs(os.path.dirname(SNAPSHOT_PATH), exist_ok=True)
    with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, indent=2)
    if db is not None:
        for s in snap["stocks"]:
            doc = {"symbol": s["symbol"], "close": s["close"], "date": s["date"],
                   "short_term": s["short_term"]["signal"],
                   "long_term": s["long_term"]["signal"],
                   "updated_at": datetime.now(timezone.utc).isoformat()}
            db.collection("recommendations").document(s["symbol"].replace(".", "_")).set(doc)
    return {"count": len(snap["stocks"]), "gold": bool(snap.get("gold")),
            "generated_at": snap["generated_at"]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
