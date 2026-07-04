"""
Static Egyptian market reference rates — update manually after each CBE auction.

T-bill rates: Central Bank of Egypt holds auctions every Tuesday and Thursday.
Savings certs: Check each bank's website for current offers.
Source: https://www.cbe.org.eg  |  https://www.egx.com.eg/ar/TbillsResult.aspx
"""

# ── Treasury Bills (أذون الخزانة) ─────────────────────────────────────────
# Annualised yield (%) from the most recent CBE auction.
T_BILLS = [
    {"label": "3 أشهر",  "days": 91,  "rate_pct": 25.5},
    {"label": "6 أشهر",  "days": 182, "rate_pct": 24.8},
    {"label": "سنة",     "days": 364, "rate_pct": 24.0},
]

# ── Savings Certificates (شهادات الادخار) — best available offers ─────────
SAVINGS_CERTS = [
    {"bank": "البنك الأهلي المصري", "rate_pct": 22.5, "period": "3 سنوات", "type": "ثابت"},
    {"bank": "بنك مصر",             "rate_pct": 22.0, "period": "3 سنوات", "type": "ثابت"},
    {"bank": "بنك الإسكندرية",      "rate_pct": 21.0, "period": "سنتان",   "type": "ثابت"},
    {"bank": "بنك القاهرة",         "rate_pct": 20.5, "period": "سنة",     "type": "ثابت"},
    {"bank": "CIB",                 "rate_pct": 20.0, "period": "سنة",     "type": "ثابت"},
]

# ── Metadata ───────────────────────────────────────────────────────────────
MARKET_RATES = {
    "last_updated": "2026-07-04",
    "note": "أسعار تقريبية — يُنصح بمراجعة موقع البنك المركزي لأحدث نتائج الطرح",
    "t_bills": T_BILLS,
    "savings_certs": SAVINGS_CERTS,
}
