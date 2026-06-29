import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import time

EGX_SYMBOLS = [
    "CCAP.CA", "COMI.CA", "EAST.CA",
    "HRHO.CA", "TMGH.CA", "SWDY.CA", "FWRY.CA",
]

def fetch_historical(symbol: str, period: str = "5y", retries: int = 3) -> pd.DataFrame:
    for attempt in range(1, retries + 1):
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period)
            if df.empty:
                raise ValueError(f"No data for {symbol}")
            df.columns = [c.lower() for c in df.columns]
            df.index.name = "date"
            return df
        except Exception as e:
            if attempt < retries:
                wait = attempt * 5
                print(f"  Retry {symbol} in {wait}s (attempt {attempt}/{retries}): {e}")
                time.sleep(wait)
            else:
                raise

def fetch_latest(symbols: list[str] = None) -> dict:
    if symbols is None:
        symbols = EGX_SYMBOLS
    result = {}
    for sym in symbols:
        try:
            df = fetch_historical(sym, period="5d")
            if not df.empty:
                latest = df.iloc[-1]
                result[sym] = {
                    "close": round(float(latest["close"]), 2),
                    "open": round(float(latest["open"]), 2),
                    "high": round(float(latest["high"]), 2),
                    "low": round(float(latest["low"]), 2),
                    "volume": int(latest["volume"]),
                    "date": str(latest.name.date()),
                }
        except Exception as e:
            print(f"Error fetching {sym}: {e}")
    return result

def fetch_all_history(symbols: list[str] = None, period: str = "5y") -> dict[str, pd.DataFrame]:
    if symbols is None:
        symbols = EGX_SYMBOLS
    result = {}
    for sym in symbols:
        try:
            result[sym] = fetch_historical(sym, period)
            time.sleep(2)
        except Exception as e:
            print(f"  Skipping {sym}: {e}")
    return result
