import { Coins } from "lucide-react";
import { SignalBadge } from "../lib/signals.jsx";
import { fmtEGP } from "../services/api";

export default function GoldCard({ gold, onClick }) {
  if (!gold) return null;
  const change = gold.change_pct;
  const up = change != null && change >= 0;
  const grams = gold.grams || {};
  return (
    <div
      onClick={onClick}
      className="bg-gradient-to-br from-yellow-900/30 to-gray-800/60 border border-yellow-600/30 rounded-xl p-4 hover:border-yellow-500/50 transition-all cursor-pointer backdrop-blur-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-500/15 p-2 rounded-lg">
            <Coins className="text-yellow-400" size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">الذهب</h3>
            <p className="text-gray-400 text-xs">عيار 21 / جرام</p>
          </div>
        </div>
        <div className="text-left shrink-0">
          <p className="text-yellow-300 font-bold text-lg">{fmtEGP(gold.price_21k)}</p>
          {change != null && (
            <p className={`text-xs ${up ? "text-emerald-400" : "text-red-400"}`}>
              {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        {["24k", "21k", "18k"].map((k) => (
          <div key={k} className="bg-gray-900/30 rounded-lg p-1.5">
            <p className="text-[10px] text-gray-500">عيار {k.replace("k", "")}</p>
            <p className="text-xs font-semibold text-gray-200">{fmtEGP(grams[k], 0)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-yellow-700/30">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs">مضاربة</span>
          <SignalBadge signal={gold.short_term?.signal} />
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-gray-500 text-xs">استثمار طويل</span>
          <SignalBadge signal={gold.long_term?.signal} />
        </div>
      </div>
    </div>
  );
}
