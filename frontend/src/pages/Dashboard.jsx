import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, TrendingUp, TrendingDown, BarChart3, AlertCircle } from "lucide-react";
import StockCard from "../components/StockCard";
import * as api from "../services/api";

const EGX_SYMBOLS = [
  "CCAP.CA", "COMI.CA", "EAST.CA", "EFG.CA", "HRHO.CA",
  "JUH.CA", "KIMA.CA", "TMGH.CA", "SWDY.CA", "FWRY.CA",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const prices = await api.getPrices();
      const recs = await Promise.all(
        EGX_SYMBOLS.map((sym) => api.getRecommendation(sym.replace(".CA", "")).catch(() => null))
      );
      const combined = EGX_SYMBOLS.map((sym, i) => {
        const price = prices[sym];
        const rec = recs[i] || {};
        return {
          symbol: sym,
          price: price?.close,
          change: null,
          shortTerm: rec?.short_term?.signal || "hold",
          longTerm: rec?.long_term?.signal || "hold",
        };
      });
      setStocks(combined);
    } catch (err) {
      setError("Failed to load data. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const buyCount = stocks.filter((s) => s.shortTerm === "buy" || s.longTerm === "buy").length;
  const sellCount = stocks.filter((s) => s.shortTerm === "sell" || s.longTerm === "sell").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Dashboard</h2>
          <p className="text-gray-400 text-sm mt-0.5">EGX30 Stock Recommendations</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm transition"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs text-gray-400">Buy Signals</span>
          </div>
          <p className="text-2xl font-bold text-white">{buyCount}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <TrendingDown size={16} />
            <span className="text-xs text-gray-400">Sell Signals</span>
          </div>
          <p className="text-2xl font-bold text-white">{sellCount}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <BarChart3 size={16} />
            <span className="text-xs text-gray-400">Tracked</span>
          </div>
          <p className="text-2xl font-bold text-white">{stocks.length}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-red-400 mt-0.5 shrink-0" size={18} />
          <div>
            <p className="text-red-300 font-medium">Connection Error</p>
            <p className="text-red-400/80 text-sm mt-0.5">{error}</p>
            <p className="text-gray-400 text-xs mt-2">Start the backend: <code className="bg-gray-800 px-1.5 py-0.5 rounded">cd backend && python main.py</code></p>
          </div>
        </div>
      )}

      {loading && !error ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-gray-700 rounded w-16 mb-3" />
              <div className="h-7 bg-gray-700 rounded w-24 mb-3" />
              <div className="h-4 bg-gray-700 rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stocks.map((s) => (
            <StockCard
              key={s.symbol}
              symbol={s.symbol}
              price={s.price}
              change={s.change}
              shortTerm={s.shortTerm}
              longTerm={s.longTerm}
              onClick={() => navigate(`/stock/${s.symbol.replace(".CA", "")}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
