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

from config import (EGX_SYMBOLS, stock_name, stock_sector, stock_search_name, CURRENCY,
                    SNAPSHOT_PATH, PUBLIC_SNAPSHOT_PATH)
from data_fetcher import fetch_cached
from indicators import calculate_indicators, FEATURE_COLUMNS
from model import load_models, predict_both_timeframes

# Long-horizon calls are 60-day fundamentals -- less reactive to today's
# headlines than the 5-day speculation horizon, so news moves it less.
NEWS_WEIGHT_SHORT = 1.0
NEWS_WEIGHT_LONG = 0.4


def build_stock(symbol: str, model_short, model_long, scaler, macro_egypt=None) -> dict:
    df = fetch_cached(symbol, period="2y", max_age_hours=10)
    enriched = calculate_indicators(df)
    rec = predict_both_timeframes(df, model_short, model_long, scaler)

    if macro_egypt is not None:
        try:
            from news_sentiment import get_company_sentiment, apply_news_adjustment
            sentiment = get_company_sentiment(stock_search_name(symbol), macro_egypt)
            rec["short_term"] = apply_news_adjustment(rec["short_term"], sentiment, NEWS_WEIGHT_SHORT)
            rec["long_term"] = apply_news_adjustment(rec["long_term"], sentiment, NEWS_WEIGHT_LONG)
        except Exception as e:
            print(f"    news adjustment skipped for {symbol}: {e}")

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
        "sector": stock_sector(symbol),
        "close": round(float(latest["close"]), 2),
        "change_pct": round(change_pct, 2),
        "date": str(latest.name.date()),
        "indicators": indicators,
        "history": history,
        **rec,
    }


def generate(run_eval: bool = True, run_news: bool = True) -> dict:
    model_short, model_long, scaler = load_models()
    if model_short is None:
        print("WARNING: no ML model found — using rule-based (TA) recommendations.")

    macro_news = None
    if run_news:
        try:
            from news_sentiment import get_macro_sentiment
            print("  fetching macro news sentiment (GDELT)...")
            macro_news = get_macro_sentiment()
            print(f"  ok macro news: egypt={macro_news['egypt']['score']} "
                  f"gold={macro_news['gold']['score']}")
        except Exception as e:
            print(f"  FAILED macro news: {e}")

    stocks = []
    fetched = {}
    for sym in EGX_SYMBOLS:
        try:
            macro_egypt = macro_news["egypt"] if macro_news else None
            stocks.append(build_stock(sym, model_short, model_long, scaler, macro_egypt))
            fetched[sym] = fetch_cached(sym)  # cached, no extra network
            print(f"  ok {sym}")
        except Exception as e:
            print(f"  FAILED {sym}: {e}")
        time.sleep(3)

    gold = None
    try:
        from gold import get_gold_snapshot
        gold_macro = macro_news["gold"] if macro_news else None
        gold = get_gold_snapshot(gold_macro)
        print("  ok gold")
    except Exception as e:
        print(f"  FAILED gold: {e}")

    evaluation = None
    if run_eval and model_short is not None and fetched:
        try:
            from backtest import evaluate
            print("  running walk-forward backtest...")
            evaluation = evaluate(fetched)
            print("  ok evaluation")
        except Exception as e:
            print(f"  FAILED evaluation: {e}")

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "currency": CURRENCY,
        "stocks": stocks,
        "gold": gold,
        "evaluation": evaluation,
        "macro_news": macro_news,
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
