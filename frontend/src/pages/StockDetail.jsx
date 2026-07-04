import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import PriceChart from "../components/PriceChart";
import IndicatorTable from "../components/IndicatorTable";
import SignalDisplay from "../components/SignalDisplay";
import LogTradeButton from "../components/LogTradeButton";
import * as api from "../services/api";
import { fmtEGP } from "../services/api";

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await api.getStock(symbol);
        if (!s) throw new Error("not found");
        setStock(s);
      } catch {
        setError("تعذّر تحميل بيانات السهم");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [symbol]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-800 rounded w-32" />
        <div className="h-64 bg-gray-800 rounded-xl" />
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-6 flex items-center gap-3">
        <AlertCircle className="text-red-400 shrink-0" size={24} />
        <p className="text-red-300">{error || "غير موجود"}</p>
      </div>
    );
  }

  const up = stock.change_pct != null && stock.change_pct >= 0;

  return (
    <div>
      <button onClick={() => navigate("/")} className="flex items-center gap-1 text-gray-400 hover:text-white transition mb-4 text-sm">
        <ArrowRight size={16} /> العودة للوحة
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{stock.symbol.replace(".CA", "")}</h2>
          <p className="text-gray-400 text-sm">{stock.name}</p>
        </div>
        <div className="text-left">
          <p className="text-2xl font-bold text-white">{fmtEGP(stock.close)}</p>
          {stock.change_pct != null && (
            <p className={`text-sm ${up ? "text-emerald-400" : "text-red-400"}`}>
              {up ? "▲" : "▼"} {Math.abs(stock.change_pct).toFixed(2)}%
            </p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <LogTradeButton stock={stock} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <SignalDisplay title="توصية المضاربة" subtitle="أفق ~5 أيام" data={stock.short_term} />
        <SignalDisplay title="توصية الاستثمار طويل الأجل" subtitle="أفق ~60 يوم" data={stock.long_term} />
      </div>

      <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">الرسم البياني للسعر</h3>
        <PriceChart data={stock.history} />
      </div>

      {stock.indicators && (
        <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">المؤشرات الفنية</h3>
          <IndicatorTable indicators={stock.indicators} />
        </div>
      )}
    </div>
  );
}
