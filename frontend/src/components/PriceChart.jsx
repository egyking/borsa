import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function fmt(v) {
  return Number(v).toLocaleString("ar-EG", { maximumFractionDigits: 2 });
}

function makeTooltip(unit) {
  return function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-white font-bold">{fmt(payload[0].value)} {unit}</p>
      </div>
    );
  };
}

export default function PriceChart({ data, unit = "ج.م" }) {
  const [range, setRange] = useState("3mo");
  if (!data?.length) return <div className="text-gray-500 text-center py-8">لا توجد بيانات متاحة</div>;

  const ranges = { "1mo": 21, "3mo": 63, "6mo": 126, "1y": 252, "الكل": data.length };
  const limit = ranges[range] || data.length;
  const filtered = data.slice(-limit);

  const chartData = filtered.map((d) => ({
    date: typeof d.date === "string" ? d.date.slice(0, 10) : d.date,
    price: d.close,
  }));

  const prices = chartData.map((d) => d.price);
  const minY = Math.min(...prices) * 0.98;
  const maxY = Math.max(...prices) * 1.02;
  const Tip = makeTooltip(unit);

  return (
    <div dir="ltr">
      <div className="flex gap-2 mb-4" dir="rtl">
        {Object.keys(ranges).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs rounded-lg transition ${
              range === r ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
          <YAxis
            domain={[minY, maxY]}
            orientation="right"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmt(v)}
            width={56}
          />
          <Tooltip content={<Tip />} />
          <Area type="monotone" dataKey="price" stroke="#10b981" fill="url(#priceGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
