import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const SIGNAL_COLORS = {
  buy: { bg: "bg-emerald-900/40", text: "text-emerald-400", border: "border-emerald-500/30" },
  sell: { bg: "bg-red-900/40", text: "text-red-400", border: "border-red-500/30" },
  hold: { bg: "bg-yellow-900/40", text: "text-yellow-400", border: "border-yellow-500/30" },
};

function SignalBadge({ signal }) {
  const s = signal || "hold";
  const colors = SIGNAL_COLORS[s] || SIGNAL_COLORS.hold;
  const icon = s === "buy" ? <TrendingUp size={14} /> : s === "sell" ? <TrendingDown size={14} /> : <Minus size={14} />;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} border`}>
      {icon}
      {s === "buy" ? "Buy" : s === "sell" ? "Sell" : "Hold"}
    </span>
  );
}

export default function StockCard({ symbol, price, change, shortTerm, longTerm, onClick }) {
  const symClean = symbol.replace(".CA", "");
  return (
    <div
      onClick={onClick}
      className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 hover:border-gray-500/50 transition-all cursor-pointer backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-bold text-lg">{symClean}</h3>
          <p className="text-gray-400 text-xs">EGX</p>
        </div>
        <div className="text-right">
          <p className="text-white font-bold text-xl">${price?.toFixed(2) || "—"}</p>
          {change != null && (
            <p className={`text-xs ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs">Short-term</span>
          <SignalBadge signal={shortTerm} />
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-gray-500 text-xs">Long-term</span>
          <SignalBadge signal={longTerm} />
        </div>
      </div>
    </div>
  );
}
