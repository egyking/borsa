import os
import sys
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))

from data_fetcher import fetch_historical, fetch_latest, EGX_SYMBOLS
from indicators import calculate_indicators, FEATURE_COLUMNS
from model import load_model, predict_both_timeframes, predict
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI(title="Borsa - EGX Stock Advisor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

firebase_app = None
base_dir = os.path.dirname(os.path.abspath(__file__))
svc_paths = [
    os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"),
    os.path.join(base_dir, "..", "firebase-service-account.json"),
    os.path.join(base_dir, "..", "..", "firebase-service-account.json"),
    os.path.join(base_dir, "firebase-service-account.json"),
]
db = None
for p in svc_paths:
    if p and os.path.exists(p):
        try:
            cred = credentials.Certificate(p)
            firebase_app = firebase_admin.initialize_app(cred)
            db = firestore.client()
            print(f"Firebase initialized from {p}")
            break
        except Exception:
            continue
if db is None:
    print("Firebase init skipped: no service account found")

model, scaler = load_model()
if model is None:
    print("WARNING: No trained model found. Run train_model.py first.")

@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}

@app.get("/api/symbols")
def get_symbols():
    return {"symbols": EGX_SYMBOLS}

@app.get("/api/prices")
def get_prices():
    data = fetch_latest(EGX_SYMBOLS)
    return data

@app.get("/api/history/{symbol}")
def get_history(symbol: str, period: str = "1y"):
    if f"{symbol}.CA" not in EGX_SYMBOLS and symbol not in EGX_SYMBOLS:
        raise HTTPException(404, f"Symbol {symbol} not in tracked list")
    if not symbol.endswith(".CA"):
        symbol = f"{symbol}.CA"
    df = fetch_historical(symbol, period)
    records = []
    for idx, row in df.iterrows():
        records.append({
            "date": str(idx.date()),
            "open": round(float(row["open"]), 2),
            "high": round(float(row["high"]), 2),
            "low": round(float(row["low"]), 2),
            "close": round(float(row["close"]), 2),
            "volume": int(row["volume"]),
        })
    return {"symbol": symbol, "data": records}

@app.get("/api/indicators/{symbol}")
def get_indicators(symbol: str, period: str = "1y"):
    if not symbol.endswith(".CA"):
        symbol = f"{symbol}.CA"
    df = fetch_historical(symbol, period)
    enriched = calculate_indicators(df)
    latest = enriched.iloc[-1]
    return {
        "symbol": symbol,
        "date": str(latest.name.date()),
        "close": round(float(latest["close"]), 2),
        "indicators": {col: round(float(latest[col]), 2) for col in FEATURE_COLUMNS if col in latest},
    }

@app.get("/api/recommend/{symbol}")
def get_recommendation(symbol: str):
    global model, scaler
    if model is None:
        model, scaler = load_model()
    if model is None:
        raise HTTPException(503, "Model not trained yet")

    if not symbol.endswith(".CA"):
        symbol = f"{symbol}.CA"

    df_short = fetch_historical(symbol, "6mo")
    df_long = fetch_historical(symbol, "2y")

    rec = predict_both_timeframes(df_short, df_long, model, scaler)
    latest = df_short.iloc[-1]
    return {
        "symbol": symbol,
        "date": str(latest.name.date()),
        "close": round(float(latest["close"]), 2),
        **rec,
    }

@app.post("/api/update-all")
def update_all_recommendations():
    global model, scaler
    if model is None:
        model, scaler = load_model()
    if model is None:
        raise HTTPException(503, "Model not trained yet")

    results = []
    for sym in EGX_SYMBOLS:
        try:
            df_short = fetch_historical(sym, "6mo")
            df_long = fetch_historical(sym, "2y")
            rec = predict_both_timeframes(df_short, df_long, model, scaler)
            latest = df_short.iloc[-1]
            entry = {
                "symbol": sym,
                "date": str(latest.name.date()),
                "close": round(float(latest["close"]), 2),
                **rec,
                "updated_at": datetime.utcnow().isoformat(),
            }
            results.append(entry)
            if db is not None:
                db.collection("recommendations").document(sym.replace(".", "_")).set(entry)
        except Exception as e:
            results.append({"symbol": sym, "error": str(e)})

    return {"count": len(results), "results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
