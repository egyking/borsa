import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, TrendingUp, TrendingDown, BarChart3, AlertCircle, Clock } from "lucide-react";
import StockCard from "../components/StockCard";
import GoldCard from "../components/GoldCard";
import ModelPerformance from "../components/ModelPerformance";
import TopOpportunities from "../components/TopOpportunities";
import * as api from "../services/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [gold, setGold] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const snap = await api.loadSnapshot(force);
      setStocks(snap.stocks || []);
      setGold(snap.gold || null);
      setEvaluation(snap.evaluation || null);
      setMeta({ generatedAt: snap.generated_at, currency: snap.currency });
    } catch {
      setError("تعذّر تحميل البيانات. لم يتم توليد ملف snapshot.json بعد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sig = (s) => [s.short_term?.signal, s.long_term?.signal];
  const buyCount = stocks.filter((s) => sig(s).includes("buy")).length;
  const sellCount = stocks.filter((s) => sig(s).includes("sell")).length;

  const updatedLabel = meta?.generatedAt
    ? new Date(meta.generatedAt).toLocaleString("ar-EG-u-ca-gregory", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">لوحة التوصيات</h2>
          <p className="text-gray-400 text-sm mt-0.5">أسهم البورصة المصرية + الذهب</p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={loading}
          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm transition"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat icon={<TrendingUp size={16} />} color="text-emerald-400" label="إشارات شراء" value={buyCount} />
        <Stat icon={<TrendingDown size={16} />} color="text-red-400" label="إشارات بيع" value={sellCount} />
        <Stat icon={<BarChart3 size={16} />} color="text-blue-400" label="أصول متابَعة" value={stocks.length + (gold ? 1 : 0)} />
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Clock size={16} />
            <span className="text-xs">آخر تحديث</span>
          </div>
          <p className="text-xs font-semibold text-gray-200">{updatedLabel || "—"}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-red-400 mt-0.5 shrink-0" size={18} />
          <div>
            <p className="text-red-300 font-medium">خطأ في التحميل</p>
            <p className="text-red-400/80 text-sm mt-0.5">{error}</p>
            <p className="text-gray-400 text-xs mt-2">
              شغّل المولّد: <code className="bg-gray-800 px-1.5 py-0.5 rounded">python backend/snapshot.py</code>
            </p>
          </div>
        </div>
      )}

      {!loading && !error && <TopOpportunities stocks={stocks} gold={gold} navigate={navigate} />}

      {!loading && <ModelPerformance evaluation={evaluation} />}

      {loading && !error ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4 animate-pulse h-36">
              <div className="h-5 bg-gray-700 rounded w-16 mb-3" />
              <div className="h-7 bg-gray-700 rounded w-24 mb-3" />
              <div className="h-4 bg-gray-700 rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gold && <GoldCard gold={gold} onClick={() => navigate("/gold")} />}
          {stocks.map((s) => (
            <StockCard
              key={s.symbol}
              symbol={s.symbol}
              name={s.name}
              price={s.close}
              change={s.change_pct}
              shortTerm={s.short_term?.signal}
              longTerm={s.long_term?.signal}
              onClick={() => navigate(`/stock/${s.symbol.replace(".CA", "")}`)}
            />
          ))}
        </div>
      )}

      <p className="text-gray-600 text-[11px] text-center mt-8">
        هذه توصيات آلية لأغراض تعليمية فقط وليست نصيحة استثمارية. القرار ومسؤوليته عليك.
      </p>
    </div>
  );
}

function Stat({ icon, color, label, value }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
      <div className={`flex items-center gap-2 ${color} mb-1`}>
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
