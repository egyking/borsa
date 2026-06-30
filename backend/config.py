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

# EGX stocks tracked by the app: symbol -> (Arabic name, sector, English search name).
# English name is used to query global news APIs (GDELT) for company-specific sentiment.
# All tickers verified to return EGP data on Yahoo Finance with the .CA suffix.
EGX_STOCKS_INFO = {
    # Core / originally tracked
    "COMI.CA": ("البنك التجاري الدولي CIB", "بنوك", "Commercial International Bank Egypt"),
    "CCAP.CA": ("القلعة للاستثمارات المالية", "استثمار", "Citadel Capital Qalaa Holdings Egypt"),
    "EAST.CA": ("ايسترن كومباني (الشرقية للدخان)", "سلع استهلاكية", "Eastern Company Egypt tobacco"),
    "HRHO.CA": ("المجموعة المالية هيرميس", "خدمات مالية", "EFG Hermes Egypt"),
    "TMGH.CA": ("مجموعة طلعت مصطفى", "عقارات", "Talaat Moustafa Group Egypt"),
    "SWDY.CA": ("السويدي إليكتريك", "صناعات", "Elsewedy Electric Egypt"),
    "FWRY.CA": ("فوري للتكنولوجيا", "تكنولوجيا مالية", "Fawry Egypt fintech"),
    # Banks
    "ADIB.CA": ("مصرف أبوظبي الإسلامي - مصر", "بنوك", "Abu Dhabi Islamic Bank Egypt"),
    "HDBK.CA": ("بنك التعمير والإسكان", "بنوك", "Housing and Development Bank Egypt"),
    # Real estate
    "PHDC.CA": ("بالم هيلز للتعمير", "عقارات", "Palm Hills Developments Egypt"),
    "OCDI.CA": ("سوديك - مدينة السادس من أكتوبر", "عقارات", "SODIC Egypt real estate"),
    "MASR.CA": ("مدينة مصر للإسكان والتعمير", "عقارات", "Madinet Masr Egypt real estate"),
    "HELI.CA": ("مصر الجديدة للإسكان (هليوبوليس)", "عقارات", "Heliopolis Housing Egypt"),
    "EMFD.CA": ("إعمار مصر للتنمية", "عقارات", "Emaar Misr Egypt"),
    # Telecom / fintech
    "ETEL.CA": ("المصرية للاتصالات (تليكوم مصر)", "اتصالات", "Telecom Egypt"),
    "EFIH.CA": ("إي فاينانس للاستثمارات الرقمية", "تكنولوجيا مالية", "e-finance Egypt digital"),
    # Industrials
    "ESRS.CA": ("حديد عز (العز الدخيلة للصلب)", "صناعات", "Ezz Steel Egypt"),
    "ABUK.CA": ("أبو قير للأسمدة", "صناعات", "Abu Qir Fertilizers Egypt"),
    "MFPC.CA": ("موبكو لإنتاج الأسمدة", "صناعات", "MOPCO Misr Fertilizers Egypt"),
    "SKPC.CA": ("سيدي كرير للبتروكيماويات", "صناعات", "Sidi Kerir Petrochemicals Egypt"),
    # Consumer
    "ORWE.CA": ("النساجون الشرقيون للسجاد", "سلع استهلاكية", "Oriental Weavers Egypt carpets"),
    "EFID.CA": ("إيديتا للصناعات الغذائية", "سلع استهلاكية", "Edita Food Industries Egypt"),
    # Healthcare
    "ISPH.CA": ("ابن سينا فارما", "رعاية صحية", "Ibnsina Pharma Egypt"),
    "CLHO.CA": ("مستشفى كليوباترا", "رعاية صحية", "Cleopatra Hospitals Group Egypt"),
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


def stock_search_name(symbol: str) -> str:
    if not symbol.endswith(".CA"):
        symbol = f"{symbol}.CA"
    info = EGX_STOCKS_INFO.get(symbol)
    return info[2] if info else stock_name(symbol)
