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

# EGX stocks tracked by the app: symbol -> (Arabic name, sector).
# All tickers verified to return EGP data on Yahoo Finance with the .CA suffix.
EGX_STOCKS_INFO = {
    # Core / originally tracked
    "COMI.CA": ("البنك التجاري الدولي CIB", "بنوك"),
    "CCAP.CA": ("القلعة للاستثمارات المالية", "استثمار"),
    "EAST.CA": ("ايسترن كومباني (الشرقية للدخان)", "سلع استهلاكية"),
    "HRHO.CA": ("المجموعة المالية هيرميس", "خدمات مالية"),
    "TMGH.CA": ("مجموعة طلعت مصطفى", "عقارات"),
    "SWDY.CA": ("السويدي إليكتريك", "صناعات"),
    "FWRY.CA": ("فوري للتكنولوجيا", "تكنولوجيا مالية"),
    # Banks
    "ADIB.CA": ("مصرف أبوظبي الإسلامي - مصر", "بنوك"),
    "HDBK.CA": ("بنك التعمير والإسكان", "بنوك"),
    # Real estate
    "PHDC.CA": ("بالم هيلز للتعمير", "عقارات"),
    "OCDI.CA": ("سوديك - مدينة السادس من أكتوبر", "عقارات"),
    "MASR.CA": ("مدينة مصر للإسكان والتعمير", "عقارات"),
    "HELI.CA": ("مصر الجديدة للإسكان (هليوبوليس)", "عقارات"),
    "EMFD.CA": ("إعمار مصر للتنمية", "عقارات"),
    # Telecom / fintech
    "ETEL.CA": ("المصرية للاتصالات (تليكوم مصر)", "اتصالات"),
    "EFIH.CA": ("إي فاينانس للاستثمارات الرقمية", "تكنولوجيا مالية"),
    # Industrials
    "ESRS.CA": ("حديد عز (العز الدخيلة للصلب)", "صناعات"),
    "ABUK.CA": ("أبو قير للأسمدة", "صناعات"),
    "MFPC.CA": ("موبكو لإنتاج الأسمدة", "صناعات"),
    "SKPC.CA": ("سيدي كرير للبتروكيماويات", "صناعات"),
    # Consumer
    "ORWE.CA": ("النساجون الشرقيون للسجاد", "سلع استهلاكية"),
    "EFID.CA": ("إيديتا للصناعات الغذائية", "سلع استهلاكية"),
    # Healthcare
    "ISPH.CA": ("ابن سينا فارما", "رعاية صحية"),
    "CLHO.CA": ("مستشفى كليوباترا", "رعاية صحية"),
}

EGX_STOCKS = {sym: info[0] for sym, info in EGX_STOCKS_INFO.items()}
EGX_SYMBOLS = list(EGX_STOCKS.keys())


def stock_name(symbol: str) -> str:
    if not symbol.endswith(".CA"):
        symbol = f"{symbol}.CA"
    return EGX_STOCKS.get(symbol, symbol.replace(".CA", ""))


def stock_sector(symbol: str) -> str:
    if not symbol.endswith(".CA"):
        symbol = f"{symbol}.CA"
    info = EGX_STOCKS_INFO.get(symbol)
    return info[1] if info else ""
