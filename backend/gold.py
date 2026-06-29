"""Egyptian gold pricing (gram in EGP) and TA-based recommendations.

Free data: gold spot via Yahoo (GC=F troy-ounce USD) and USD/EGP (EGP=X).
Gram price = (ounce_usd / 31.1035) * usd_egp, scaled by karat.
"""
import time
import pandas as pd

from data_fetcher import fetch_cached
from indicators import calculate_indicators, rule_based_recommendation

OUNCE_TO_GRAM = 31.1035
KARATS = {"24k": 24 / 24, "22k": 22 / 24, "21k": 21 / 24, "18k": 18 / 24}

# Long-horizon threshold for gold risk levels (investment view).
SHORT_TH = 2.0
LONG_TH = 8.0


def _gold_gram_series() -> pd.DataFrame:
    """Build a daily 21k gram-in-EGP OHLC series from spot gold and USD/EGP."""
    gold = fetch_cached("GC=F", period="2y", max_age_hours=12)
    time.sleep(1)
    fx = fetch_cached("EGP=X", period="2y", max_age_hours=12)

    g = gold[["open", "high", "low", "close", "volume"]].copy()
    rate = fx["close"].reindex(g.index).ffill().bfill()
    factor = (rate / OUNCE_TO_GRAM) * KARATS["21k"]

    out = pd.DataFrame(index=g.index)
    out["open"] = g["open"] * factor
    out["high"] = g["high"] * factor
    out["low"] = g["low"] * factor
    out["close"] = g["close"] * factor
    out["volume"] = g["volume"].fillna(0)
    out.dropna(inplace=True)
    return out, gold, fx


def get_gold_snapshot() -> dict:
    series, gold, fx = _gold_gram_series()
    enriched = calculate_indicators(series)

    latest_ounce = float(gold["close"].iloc[-1])
    latest_rate = float(fx["close"].reindex(gold.index).ffill().iloc[-1])
    base_24 = (latest_ounce / OUNCE_TO_GRAM) * latest_rate
    grams = {k: round(base_24 * f, 2) for k, f in KARATS.items()}

    prev_close = float(series["close"].iloc[-2]) if len(series) > 1 else float(series["close"].iloc[-1])
    change_pct = ((float(series["close"].iloc[-1]) - prev_close) / prev_close * 100) if prev_close else 0.0

    short = rule_based_recommendation(enriched, "short", SHORT_TH)
    long = rule_based_recommendation(enriched, "long", LONG_TH)

    history = [
        {"date": str(idx.date()), "close": round(float(v), 2)}
        for idx, v in series["close"].tail(365).items()
    ]

    return {
        "asset": "gold",
        "name": "الذهب",
        "currency": "EGP",
        "unit": "جرام",
        "date": str(series.index[-1].date()),
        "ounce_usd": round(latest_ounce, 2),
        "usd_egp": round(latest_rate, 2),
        "grams": grams,
        "price_21k": grams["21k"],
        "change_pct": round(change_pct, 2),
        "short_term": short,
        "long_term": long,
        "indicators": {
            k: round(float(enriched.iloc[-1][k]), 2)
            for k in ("rsi", "macd", "sma_50", "sma_200", "atr")
            if k in enriched.columns
        },
        "history": history,
    }
