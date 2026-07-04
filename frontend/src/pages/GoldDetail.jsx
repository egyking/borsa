import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle, Coins } from "lucide-react";
import PriceChart from "../components/PriceChart";
import SignalDisplay from "../components/SignalDisplay";
import LogTradeButton from "../components/LogTradeButton";
import * as api from "../services/api";
import { fmtEGP } from "../services/api";

const KARAT_LABELS = { "24k": "عيار 24", "22k": "عيار 22", "21k": "عيار 21", "18k": "عيار 18" };

export default function GoldDetail() {
  const navigate = useNavigate();
  const [gold, setGold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const g = await api.getGold();
        if (!g) throw new Error("no gold");
        setGold(g);
      } catch {
        setError("تعذّر تحميل بيانات الذهب");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="animate-pulse h-64 bg-gray-800 rounded-xl" />;
  if (error || !gold) {
    return (
      <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-6 flex items-center gap-3">
        <AlertCircle className="text-red-400 shrink-0" size={24} />
        <p className="text-red-300">{error || "غير متاح"}</p>
      </div>
    );
  }

  const up = gold.change_pct != null && gold.change_pct >= 0;
  const grams = gold.grams || {};

  return (
    <div>
      <button onClick={() => navigate("/")} className="flex items-center gap-1 text-gray-400 hover:text-white transition mb-4 text-sm">
        <ArrowRight size={16} /> العودة للوحة
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/15 p-3 rounded-xl">
            <Coins className="text-yellow-400" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">الذهب</h2>
            <p className="text-gray-400 text-sm">سعر الجرام بالجنيه المصري</p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-2xl font-bold text-yellow-300">{fmtEGP(gold.price_21k)}</p>
          <p className="text-xs text-gray-500">عيار 21</p>
          {gold.change_pct != null && (
            <p className={`text-sm ${up ? "text-emerald-400" : "text-red-400"}`}>
              {up ? "▲" : "▼"} {Math.abs(gold.change_pct).toFixed(2)}%
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(KARAT_LABELS).map(([k, label]) => (
          <div key={k} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-lg font-bold text-yellow-300">{fmtEGP(grams[k], 0)}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <LogTradeButton gold={gold} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <SignalDisplay title="توصية المضاربة" subtitle="أفق قصير" data={gold.short_term} />
        <SignalDisplay title="توصية الاستثمار طويل الأجل" data={gold.long_term} />
      </div>

      <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">سعر جرام عيار 21 (آخر سنة)</h3>
        <PriceChart data={gold.history} unit="ج.م" />
      </div>

      <p className="text-gray-600 text-[11px] text-center mt-6">
        السعر تقديري محسوب من سعر الأونصة العالمي وسعر صرف الدولار، وقد يختلف قليلاً عن السوق المحلي.
      </p>
    </div>
  );
}
