import { SignalBadge } from "../lib/signals.jsx";
import { fmtEGP } from "../services/api";

export default function StockCard({ symbol, name, price, change, shortTerm, longTerm, onClick }) {
  const symClean = symbol.replace(".CA", "");
  const up = change != null && change >= 0;
  return (
    <div
      onClick={onClick}
      className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 hover:border-emerald-500/40 transition-all cursor-pointer backdrop-blur-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-white font-bold text-lg">{symClean}</h3>
          <p className="text-gray-400 text-xs truncate" title={name}>{name || "EGX"}</p>
        </div>
        <div className="text-left shrink-0">
          <p className="text-white font-bold text-lg">{fmtEGP(price)}</p>
          {change != null && (
            <p className={`text-xs ${up ? "text-emerald-400" : "text-red-400"}`}>
              {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs">مضاربة</span>
          <SignalBadge signal={shortTerm} />
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-gray-500 text-xs">استثمار طويل</span>
          <SignalBadge signal={longTerm} />
        </div>
      </div>
    </div>
  );
}
