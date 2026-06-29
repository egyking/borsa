"""Generate snapshot.json — the precomputed data the frontend reads directly.

Run by the daily GitHub Action (and locally). Writing a static snapshot is what
makes the app reliable + free: the frontend never calls Yahoo live, so there are
no rate limits, cold starts or serverless size limits on the read path.
"""
import os
import sys
import json
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (EGX_SYMBOLS, stock_name, CURRENCY,
                    SNAPSHOT_PATH, PUBLIC_SNAPSHOT_PATH)
from data_fetcher import fetch_cached
from indicators import calculate_indicators, FEATURE_COLUMNS
from model import load_models, predict_both_timeframes


def build_stock(symbol: str, model_short, model_long, scaler) -> dict:
    df = fetch_cached(symbol, period="2y", max_age_hours=10)
    enriched = calculate_indicators(df)
    rec = predict_both_timeframes(df, model_short, model_long, scaler)

    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest
    change_pct = ((float(latest["close"]) - float(prev["close"]))
                  / float(prev["close"]) * 100) if float(prev["close"]) else 0.0

    indicators = {}
    if not enriched.empty:
        row = enriched.iloc[-1]
        indicators = {c: round(float(row[c]), 2) for c in FEATURE_COLUMNS if c in row}

    history = [
        {"date": str(idx.date()), "close": round(float(r["close"]), 2)}
        for idx, r in df.tail(365).iterrows()
    ]

    return {
        "symbol": symbol,
        "name": stock_name(symbol),
        "close": round(float(latest["close"]), 2),
        "change_pct": round(change_pct, 2),
        "date": str(latest.name.date()),
        "indicators": indicators,
        "history": history,
        **rec,
    }


def generate() -> dict:
    model_short, model_long, scaler = load_models()
    if model_short is None:
        print("WARNING: no ML model found — using rule-based (TA) recommendations.")

    stocks = []
    for sym in EGX_SYMBOLS:
        try:
            stocks.append(build_stock(sym, model_short, model_long, scaler))
            print(f"  ok {sym}")
        except Exception as e:
            print(f"  FAILED {sym}: {e}")
        time.sleep(3)

    gold = None
    try:
        from gold import get_gold_snapshot
        gold = get_gold_snapshot()
        print("  ok gold")
    except Exception as e:
        print(f"  FAILED gold: {e}")

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "currency": CURRENCY,
        "stocks": stocks,
        "gold": gold,
    }


def main():
    snap = generate()
    for path in (SNAPSHOT_PATH, PUBLIC_SNAPSHOT_PATH):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(snap, f, ensure_ascii=False, indent=2)
        print(f"Wrote {path}")
    print(f"Stocks: {len(snap['stocks'])} | Gold: {'yes' if snap['gold'] else 'no'}")


if __name__ == "__main__":
    main()
