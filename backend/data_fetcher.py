import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

EGX_SYMBOLS = [
    "CCAP.CA", "COMI.CA", "EAST.CA", "EFG.CA", "HRHO.CA",
    "JUH.CA", "KIMA.CA", "TMGH.CA", "SWDY.CA", "FWRY.CA",
]

def fetch_historical(symbol: str, period: str = "5y") -> pd.DataFrame:
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period)
    if df.empty:
        raise ValueError(f"No data for {symbol}")
    df.columns = [c.lower() for c in df.columns]
    df.index.name = "date"
    return df

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
    return {sym: fetch_historical(sym, period) for sym in symbols}
