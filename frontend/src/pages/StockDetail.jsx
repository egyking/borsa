import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import PriceChart from "../components/PriceChart";
import IndicatorTable from "../components/IndicatorTable";
import * as api from "../services/api";

const SIGNAL_LABELS = { buy: "Buy", sell: "Sell", hold: "Hold" };
const SIGNAL_COLORS = {
  buy: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
  sell: { text: "text-red-400", bg: "bg-red-500/10" },
  hold: { text: "text-yellow-400", bg: "bg-yellow-500/10" },
};

function SignalDisplay({ title, data }) {
  if (!data) return null;
  const s = data.signal || "hold";
  const colors = SIGNAL_COLORS[s] || SIGNAL_COLORS.hold;
  return (
    <div className={`${colors.bg} ${colors.text} rounded-xl p-4 border border-gray-700/50`}>
      <p className="text-gray-400 text-xs mb-1">{title}</p>
      <p className="text-2xl font-bold">{SIGNAL_LABELS[s]}</p>
      <p className="text-xs mt-1 opacity-80">Confidence: {(data.confidence * 100).toFixed(0)}%</p>
      <div className="mt-2 flex gap-2 text-xs">
        <span className="text-emerald-400">B: {(data.prob_buy * 100).toFixed(0)}%</span>
        <span className="text-yellow-400">H: {(data.prob_hold * 100).toFixed(0)}%</span>
        <span className="text-red-400">S: {(data.prob_sell * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rec, hist, ind] = await Promise.all([
          api.getRecommendation(symbol),
          api.getHistory(symbol, "2y"),
          api.getIndicators(symbol),
        ]);
        setData(rec);
        setHistory(hist.data || []);
        setIndicators(ind.indicators || null);
      } catch (err) {
        setError("Failed to load stock data");
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

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-6 flex items-center gap-3">
        <AlertCircle className="text-red-400 shrink-0" size={24} />
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate("/")} className="flex items-center gap-1 text-gray-400 hover:text-white transition mb-4 text-sm">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{symbol}</h2>
          <p className="text-gray-400 text-sm">EGX - {data?.close ? `$${data.close.toFixed(2)}` : "—"}</p>
        </div>
        <div className="hidden sm:flex gap-3">
          <SignalDisplay title="Short-term" data={data?.short_term} />
          <SignalDisplay title="Long-term" data={data?.long_term} />
        </div>
      </div>

      <div className="flex sm:hidden gap-3 mb-4">
        <SignalDisplay title="Short-term" data={data?.short_term} />
        <SignalDisplay title="Long-term" data={data?.long_term} />
      </div>

      <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Price Chart</h3>
        <PriceChart data={history} />
      </div>

      {indicators && (
        <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Technical Indicators</h3>
          <IndicatorTable indicators={indicators} />
        </div>
      )}
    </div>
  );
}
