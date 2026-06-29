import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const SIGNAL_LABELS = { buy: "شراء", sell: "بيع", hold: "انتظار" };

export const SIGNAL_COLORS = {
  buy: { bg: "bg-emerald-900/40", text: "text-emerald-400", border: "border-emerald-500/30" },
  sell: { bg: "bg-red-900/40", text: "text-red-400", border: "border-red-500/30" },
  hold: { bg: "bg-yellow-900/30", text: "text-yellow-400", border: "border-yellow-500/30" },
};

export const RISK_LABELS = { low: "منخفضة", medium: "متوسطة", high: "عالية" };
export const RISK_COLORS = {
  low: "text-emerald-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

export function signalIcon(signal, size = 14) {
  if (signal === "buy") return <TrendingUp size={size} />;
  if (signal === "sell") return <TrendingDown size={size} />;
  return <Minus size={size} />;
}

export function SignalBadge({ signal }) {
  const s = signal || "hold";
  const c = SIGNAL_COLORS[s] || SIGNAL_COLORS.hold;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${c.bg} ${c.text} ${c.border} border`}
    >
      {signalIcon(signal)}
      {SIGNAL_LABELS[s]}
    </span>
  );
}
