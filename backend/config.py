"""Single source of truth for symbols, names, paths and app constants."""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _resolve_data_dir() -> str:
    for p in (os.path.join(BASE_DIR, "..", "data"), os.path.join(BASE_DIR, "data")):
        d = os.path.abspath(p)
        if os.path.isdir(d):
            return d
    d = os.path.abspath(os.path.join(BASE_DIR, "..", "data"))
    os.makedirs(d, exist_ok=True)
    return d


DATA_DIR = _resolve_data_dir()
CACHE_DIR = os.path.join(DATA_DIR, "cache")
SNAPSHOT_PATH = os.path.join(DATA_DIR, "snapshot.json")
# Static copy served by the frontend host (free, no backend needed).
PUBLIC_SNAPSHOT_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "..", "frontend", "public", "snapshot.json")
)

CURRENCY = "EGP"

# EGX stocks tracked by the app, with Arabic display names.
EGX_STOCKS = {
    "COMI.CA": "البنك التجاري الدولي CIB",
    "CCAP.CA": "القلعة للاستثمارات المالية",
    "EAST.CA": "ايسترن كومباني (الشرقية للدخان)",
    "HRHO.CA": "المجموعة المالية هيرميس",
    "TMGH.CA": "مجموعة طلعت مصطفى",
    "SWDY.CA": "السويدي إليكتريك",
    "FWRY.CA": "فوري للتكنولوجيا",
}
EGX_SYMBOLS = list(EGX_STOCKS.keys())


def stock_name(symbol: str) -> str:
    if not symbol.endswith(".CA"):
        symbol = f"{symbol}.CA"
    return EGX_STOCKS.get(symbol, symbol.replace(".CA", ""))
