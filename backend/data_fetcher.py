import os
import time
import pandas as pd
import yfinance as yf

from config import EGX_SYMBOLS, CACHE_DIR  # noqa: F401 (EGX_SYMBOLS re-exported)

# A browser-like session reduces Yahoo rate-limiting from cloud IPs.
try:
    import requests
    _SESSION = requests.Session()
    _SESSION.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        )
    })
except Exception:  # pragma: no cover
    _SESSION = None


def _ticker(symbol: str):
    try:
        return yf.Ticker(symbol, session=_SESSION) if _SESSION else yf.Ticker(symbol)
    except TypeError:
        return yf.Ticker(symbol)


def fetch_historical(symbol: str, period: str = "2y", retries: int = 4) -> pd.DataFrame:
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            df = _ticker(symbol).history(period=period, auto_adjust=True)
            if df.empty:
                raise ValueError(f"No data for {symbol}")
            df.columns = [c.lower() for c in df.columns]
            df.index.name = "date"
            return df[["open", "high", "low", "close", "volume"]]
        except Exception as e:
            last_err = e
            if attempt < retries:
                wait = attempt * 6
                print(f"  Retry {symbol} in {wait}s (attempt {attempt}/{retries}): {e}")
                time.sleep(wait)
    raise last_err


def fetch_cached(symbol: str, period: str = "2y", max_age_hours: float = 12) -> pd.DataFrame:
    """Fetch with an on-disk CSV cache to survive rate limits across runs."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"{symbol.replace('.', '_')}.csv")
    if os.path.exists(path):
        age_h = (time.time() - os.path.getmtime(path)) / 3600
        if age_h < max_age_hours:
            try:
                return pd.read_csv(path, index_col=0, parse_dates=True)
            except Exception:
                pass
    try:
        df = fetch_historical(symbol, period)
        df.to_csv(path)
        return df
    except Exception:
        if os.path.exists(path):  # stale cache is better than nothing
            return pd.read_csv(path, index_col=0, parse_dates=True)
        raise


def fetch_latest(symbols: list[str] = None) -> dict:
    if symbols is None:
        symbols = EGX_SYMBOLS
    result = {}
    for sym in symbols:
        try:
            df = fetch_cached(sym, period="2y")
            if not df.empty:
                latest = df.iloc[-1]
                prev = df.iloc[-2] if len(df) > 1 else latest
                change_pct = ((float(latest["close"]) - float(prev["close"]))
                              / float(prev["close"]) * 100) if float(prev["close"]) else 0.0
                result[sym] = {
                    "close": round(float(latest["close"]), 2),
                    "open": round(float(latest["open"]), 2),
                    "high": round(float(latest["high"]), 2),
                    "low": round(float(latest["low"]), 2),
                    "volume": int(latest["volume"]),
                    "change_pct": round(change_pct, 2),
                    "date": str(latest.name.date()),
                }
        except Exception as e:
            print(f"Error fetching {sym}: {e}")
    return result


def fetch_all_history(symbols: list[str] = None, period: str = "5y",
                      delay: float = 4.0) -> dict[str, pd.DataFrame]:
    if symbols is None:
        symbols = EGX_SYMBOLS
    result = {}
    for sym in symbols:
        try:
            result[sym] = fetch_cached(sym, period, max_age_hours=24)
            time.sleep(delay)
        except Exception as e:
            print(f"  Skipping {sym}: {e}")
    return result
