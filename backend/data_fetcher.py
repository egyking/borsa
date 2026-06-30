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
            # Different markets report bars in their own exchange timezone
            # (e.g. GC=F in US/Eastern, EGP=X in London time). Drop tz info
            # so daily bars from different sources align on calendar date
            # when merged (e.g. gold.py reindexing FX onto the gold index).
            if df.index.tz is not None:
                df.index = df.index.tz_localize(None)
            return df[["open", "high", "low", "close", "volume"]]
        except Exception as e:
            last_err = e
            if attempt < retries:
                wait = attempt * 6
                print(f"  Retry {symbol} in {wait}s (attempt {attempt}/{retries}): {e}")
                time.sleep(wait)
    raise last_err


# Always cache the long window so any caller (snapshot, training, backtest)
# has enough history; the per-symbol cache key ignores the requested period.
MAX_PERIOD = "5y"


def _read_csv_cache(path: str) -> pd.DataFrame:
    """Read a cached OHLCV CSV with a clean, tz-naive, date-only index.

    Cache files may predate the tz-naive fix in fetch_historical (or mix
    sources with different exchange UTC offsets, e.g. GC=F -04:00 vs EGP=X
    +01:00). Parsing only the date portion of each timestamp sidesteps tz
    arithmetic entirely -- correct for daily bars, where time-of-day is not
    meaningful and offset-aware conversion would shift some rows a day.
    """
    df = pd.read_csv(path, index_col=0)
    df.index = pd.to_datetime(df.index.astype(str).str.split(" ").str[0])
    df.index.name = "date"
    return df


def fetch_cached(symbol: str, period: str = MAX_PERIOD, max_age_hours: float = 12) -> pd.DataFrame:
    """Fetch with an on-disk CSV cache to survive rate limits across runs.

    Always fetches/stores ~5y so backtesting has enough data; `period` is kept
    for API compatibility but the full cached frame is returned.
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"{symbol.replace('.', '_')}.csv")
    if os.path.exists(path):
        age_h = (time.time() - os.path.getmtime(path)) / 3600
        if age_h < max_age_hours:
            try:
                return _read_csv_cache(path)
            except Exception:
                pass
    try:
        df = fetch_historical(symbol, MAX_PERIOD)
        df.to_csv(path)
        return df
    except Exception:
        if os.path.exists(path):  # stale cache is better than nothing
            return _read_csv_cache(path)
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
