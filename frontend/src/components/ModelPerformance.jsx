import { Activity, Info } from "lucide-react";

const pct = (v, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
const signed = (v, d = 1) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d)}%`);

function HorizonCard({ title, subtitle, e }) {
  if (!e) return null;
  const beat = (e.cum_return ?? 0) - (e.buy_hold_return ?? 0);
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="font-bold text-white">{title}</h4>
        <span className="text-[11px] text-gray-500">{subtitle}</span>
      </div>

      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-0.5">الدقة المتوازنة (مهارة النموذج)</p>
        <p className="text-2xl font-bold text-blue-300">{pct(e.balanced_accuracy)}</p>
        <p className="text-[10px] text-gray-500">عشوائي = 33% · دقّة الشراء {pct(e.buy_precision, 0)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-900/40 rounded-lg p-2">
          <p className="text-[10px] text-gray-500">عائد الاستراتيجية</p>
          <p className={`text-sm font-bold ${(e.cum_return ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {signed(e.cum_return)}
          </p>
        </div>
        <div className="bg-gray-900/40 rounded-lg p-2">
          <p className="text-[10px] text-gray-500">الشراء والاحتفاظ</p>
          <p className={`text-sm font-bold ${(e.buy_hold_return ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            {signed(e.buy_hold_return)}
          </p>
        </div>
      </div>

      <p className="text-[11px] mb-3">
        مقابل الشراء والاحتفاظ:{" "}
        <span className={`font-semibold ${beat >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {beat >= 0 ? "يتفوّق بـ " : "أقل بـ "}{signed(beat)}
        </span>
      </p>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="شارب" value={e.sharpe != null ? e.sharpe.toFixed(2) : "—"} good={(e.sharpe ?? 0) > 0} />
        <Metric label="أقصى تراجع" value={pct(e.max_drawdown, 0)} good={false} muted />
        <Metric label="رابحة" value={pct(e.win_rate, 0)} good={(e.win_rate ?? 0) >= 0.5} />
      </div>

      <p className="text-[10px] text-gray-600 mt-3">
        {e.n_trades} صفقة · {e.n_folds} نافذة اختبار · {e.n_stocks} سهم
        {e.n_trades < 15 && <span className="text-yellow-600/80"> · عيّنة صغيرة</span>}
      </p>
    </div>
  );
}

function Metric({ label, value, good, muted }) {
  const color = muted ? "text-gray-300" : good ? "text-emerald-400" : "text-red-400";
  return (
    <div className="bg-gray-900/40 rounded-lg p-1.5">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`text-sm font-semibold ${color}`} dir="ltr">{value}</p>
    </div>
  );
}

export default function ModelPerformance({ evaluation }) {
  if (!evaluation || (!evaluation.short_5d && !evaluation.long_60d)) return null;
  const span = evaluation.test_span;
  return (
    <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="text-blue-400" size={18} />
        <h3 className="font-bold">أداء النموذج (اختبار تاريخي)</h3>
      </div>
      <p className="text-[11px] text-gray-500 mb-4 flex items-start gap-1">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          تقييم خارج العيّنة بطريقة walk-forward تمنع تسرّب المستقبل، بعد خصم تكلفة تداول{" "}
          {evaluation.cost_per_trade ? `${(evaluation.cost_per_trade * 100).toFixed(1)}%` : ""} لكل صفقة
          {span?.start && ` · الفترة ${span.start} ← ${span.end}`}.
        </span>
      </p>
      <div className="grid md:grid-cols-2 gap-3">
        <HorizonCard title="المضاربة" subtitle="أفق 5 أيام" e={evaluation.short_5d} />
        <HorizonCard title="الاستثمار طويل الأجل" subtitle="أفق 60 يوم" e={evaluation.long_60d} />
      </div>
    </div>
  );
}
