import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Landmark, TrendingUp, ExternalLink, AlertCircle } from "lucide-react";
import { loadSnapshot } from "../services/api";

// ── Static mutual funds list ────────────────────────────────────────────────
// NAV data is published daily on Mubasher and EGX — no API available.
const MUTUAL_FUNDS = [
  // ── صناديق الأسهم (Equity) ─────────────────────────────────────────────
  {
    name: "الصندوق الأول لبنك مصر",
    manager: "بنك مصر",
    type: "أسهم",
    desc: "يستثمر في أسهم الشركات المدرجة بالبورصة المصرية",
  },
  {
    name: "صندوق EFG هيرميس للأسهم",
    manager: "EFG هيرميس",
    type: "أسهم",
    desc: "أحد أقدم صناديق الأسهم وأكثرها سيولة في مصر",
  },
  {
    name: "صندوق CI كابيتال للأسهم",
    manager: "CI كابيتال",
    type: "أسهم",
    desc: "صندوق أسهم متنوع يركز على الشركات الكبرى في EGX 30",
  },
  {
    name: "الصندوق الأول للبنك الأهلي المصري",
    manager: "البنك الأهلي المصري",
    type: "أسهم",
    desc: "صندوق أسهم مصري بإدارة البنك الأهلي",
  },
  {
    name: "صندوق بيلتون للأسهم",
    manager: "بيلتون المالية القابضة",
    type: "أسهم",
    desc: "يستثمر في محفظة متنوعة من أسهم البورصة المصرية",
  },
  {
    name: "صندوق فاروس للأسهم",
    manager: "فاروس القابضة",
    type: "أسهم",
    desc: "صندوق نشط يستهدف فرص النمو في السوق المصري",
  },
  {
    name: "صندوق بنك CIB للأسهم",
    manager: "البنك التجاري الدولي CIB",
    type: "أسهم",
    desc: "صندوق أسهم بإدارة CIB يستهدف عوائد طويلة الأجل",
  },
  {
    name: "صندوق بنك القاهرة للأسهم",
    manager: "بنك القاهرة",
    type: "أسهم",
    desc: "يركز على الشركات ذات القيمة السوقية الكبيرة والمتوسطة",
  },
  // ── صناديق متوازنة (Balanced) ──────────────────────────────────────────
  {
    name: "صندوق هيرميس المتوازن",
    manager: "EFG هيرميس",
    type: "متوازن",
    desc: "يجمع بين الأسهم والأدوات ذات الدخل الثابت لتوازن المخاطر",
  },
  // ── صناديق النقد (Money Market) ────────────────────────────────────────
  {
    name: "صندوق بنك مصر للنقد",
    manager: "بنك مصر",
    type: "نقد",
    desc: "عائد يومي سائل — يستثمر في أذون الخزانة وأدوات سوق المال",
  },
  {
    name: "الصندوق الأهلي للنقد",
    manager: "البنك الأهلي المصري",
    type: "نقد",
    desc: "صندوق نقدي موثوق بعوائد شبه يومية وسيولة عالية",
  },
  {
    name: "صندوق EFG هيرميس للنقد",
    manager: "EFG هيرميس",
    type: "نقد",
    desc: "بديل منخفض المخاطر للودائع — عائد يتعلق بسعر الفائدة السائد",
  },
];

const TYPE_COLOR = {
  "أسهم":   "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
  "نقد":    "bg-blue-600/20   text-blue-300   border-blue-600/30",
  "متوازن": "bg-purple-600/20 text-purple-300 border-purple-600/30",
  "سندات":  "bg-yellow-600/20 text-yellow-300 border-yellow-600/30",
};

// ── Rate badge color based on % ─────────────────────────────────────────────
function rateColor(pct) {
  if (pct >= 24) return "text-emerald-300";
  if (pct >= 20) return "text-yellow-300";
  return "text-gray-300";
}

// ── Fallback rates used when snapshot market_rates is unavailable ──────────
const FALLBACK_RATES = {
  last_updated: null,
  note: "أسعار تقريبية — راجع موقع البنك المركزي لأحدث نتائج الطرح",
  t_bills: [
    { label: "3 أشهر", days: 91,  rate_pct: 25.5 },
    { label: "6 أشهر", days: 182, rate_pct: 24.8 },
    { label: "سنة",    days: 364, rate_pct: 24.0 },
  ],
  savings_certs: [
    { bank: "البنك الأهلي المصري", rate_pct: 22.5, period: "3 سنوات", type: "ثابت" },
    { bank: "بنك مصر",            rate_pct: 22.0, period: "3 سنوات", type: "ثابت" },
    { bank: "بنك الإسكندرية",     rate_pct: 21.0, period: "سنتان",   type: "ثابت" },
    { bank: "بنك القاهرة",        rate_pct: 20.5, period: "سنة",     type: "ثابت" },
    { bank: "CIB",                rate_pct: 20.0, period: "سنة",     type: "ثابت" },
  ],
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function Funds() {
  const navigate = useNavigate();
  const [rates, setRates] = useState(null);
  const [usdRate, setUsdRate] = useState(null);
  const [typeFilter, setTypeFilter] = useState("الكل");

  useEffect(() => {
    loadSnapshot()
      .then((snap) => {
        setRates(snap.market_rates || FALLBACK_RATES);
        setUsdRate(snap.gold?.usd_egp ?? null);
      })
      .catch(() => setRates(FALLBACK_RATES));
  }, []);

  const types = ["الكل", "أسهم", "نقد", "متوازن"];
  const filtered = typeFilter === "الكل"
    ? MUTUAL_FUNDS
    : MUTUAL_FUNDS.filter((f) => f.type === typeFilter);

  const r = rates || FALLBACK_RATES;

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1 text-gray-400 hover:text-white transition mb-4 text-sm"
      >
        <ArrowRight size={16} /> العودة للوحة
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-500/15 p-2.5 rounded-xl">
          <Landmark className="text-blue-400" size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold">صناديق وبدائل الاستثمار</h2>
          <p className="text-gray-400 text-xs">مقارنة بين أدوات الاستثمار في السوق المصري</p>
        </div>
      </div>

      {/* ── Section 1: Fixed Income (أذون الخزانة وشهادات الادخار) ─────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-200">بدائل ذات دخل ثابت</h3>
          {r.last_updated && (
            <span className="text-[11px] text-gray-600">آخر تحديث: {r.last_updated}</span>
          )}
        </div>

        {/* T-bills */}
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500/60" />
          أذون الخزانة (حكومي — بلا مخاطرة ائتمانية)
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {r.t_bills.map((tb) => (
            <div
              key={tb.days}
              className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center"
            >
              <p className="text-xs text-gray-400 mb-1">{tb.label}</p>
              <p className={`text-2xl font-bold ${rateColor(tb.rate_pct)}`}>
                {tb.rate_pct}%
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">سنوياً</p>
            </div>
          ))}
        </div>

        {/* Savings certificates */}
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500/60" />
          شهادات الادخار البنكية (أعلى العروض المتاحة)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {r.savings_certs.map((sc) => (
            <div
              key={sc.bank}
              className="bg-gray-800/40 border border-gray-700/30 rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium">{sc.bank}</p>
                <p className="text-[11px] text-gray-500">{sc.period} · {sc.type}</p>
              </div>
              <p className={`text-xl font-bold ${rateColor(sc.rate_pct)}`}>
                {sc.rate_pct}%
              </p>
            </div>
          ))}
        </div>

        {/* USD rate */}
        {usdRate && (
          <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium">الدولار الأمريكي</p>
              <p className="text-[11px] text-gray-500">سعر الصرف المرجعي (EGP=X)</p>
            </div>
            <p className="text-xl font-bold text-yellow-300">
              {Number(usdRate).toFixed(2)} <span className="text-xs text-gray-400">ج.م</span>
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 bg-gray-800/30 border border-gray-700/20 rounded-xl px-4 py-3 text-xs text-gray-500">
          <AlertCircle size={13} className="shrink-0 mt-0.5 text-gray-600" />
          <p>{r.note}</p>
        </div>
      </section>

      {/* ── Section 2: Mutual Funds ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-200 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            أبرز صناديق الاستثمار المصرية
          </h3>
          <a
            href="https://eg.mubasher.info/stocks/mutual-funds/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
          >
            <ExternalLink size={12} /> متابعة القيم اليومية
          </a>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          تُنشر القيمة الصافية للوحدة (NAV) يومياً — لا تتوفر بيانات آلية للصناديق المفتوحة على yfinance.
        </p>

        {/* Type filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                typeFilter === t
                  ? "bg-blue-600/30 border-blue-500/60 text-blue-300"
                  : "bg-gray-800/60 border-gray-700/40 text-gray-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((fund) => (
            <div
              key={fund.name}
              className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-sm leading-snug">{fund.name}</p>
                <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${TYPE_COLOR[fund.type] || "bg-gray-700 text-gray-400"}`}>
                  {fund.type}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{fund.manager}</p>
              <p className="text-xs text-gray-600">{fund.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <a
            href="https://www.egx.com.eg/ar/Funds.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition"
          >
            <ExternalLink size={12} />
            عرض قائمة الصناديق الكاملة على موقع البورصة المصرية
          </a>
        </div>
      </section>
    </div>
  );
}
