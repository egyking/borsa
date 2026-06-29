export default function IndicatorTable({ indicators }) {
  if (!indicators) return null;
  const rows = [
    { label: "RSI (14)", key: "rsi" },
    { label: "MACD", key: "macd" },
    { label: "إشارة MACD", key: "macd_signal" },
    { label: "هيستوجرام MACD", key: "macd_hist" },
    { label: "متوسط 20", key: "sma_20" },
    { label: "متوسط 50", key: "sma_50" },
    { label: "متوسط 200", key: "sma_200" },
    { label: "EMA (12)", key: "ema_12" },
    { label: "بولينجر علوي", key: "bb_upper" },
    { label: "بولينجر سفلي", key: "bb_lower" },
    { label: "ستوكاستيك %K", key: "stoch_k" },
    { label: "ستوكاستيك %D", key: "stoch_d" },
    { label: "نسبة الحجم", key: "volume_ratio" },
    { label: "ROC (10)", key: "roc_10" },
    { label: "ATR", key: "atr" },
  ];

  const getColor = (key, val) => {
    if (val == null) return "text-gray-500";
    if (key === "rsi") return val > 70 ? "text-red-400" : val < 30 ? "text-emerald-400" : "text-gray-300";
    if (key === "stoch_k") return val > 80 ? "text-red-400" : val < 20 ? "text-emerald-400" : "text-gray-300";
    if (key === "roc_10" || key === "macd_hist") return val > 0 ? "text-emerald-400" : "text-red-400";
    return "text-gray-300";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
      {rows.map(({ label, key }) => (
        <div key={key} className="bg-gray-800/40 border border-gray-700/30 rounded-lg p-2">
          <p className="text-gray-500 text-xs mb-0.5">{label}</p>
          <p className={`font-mono text-sm font-semibold ${getColor(key, indicators[key])}`} dir="ltr">
            {indicators[key] != null ? Number(indicators[key]).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
