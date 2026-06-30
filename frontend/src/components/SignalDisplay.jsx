import { SIGNAL_LABELS, SIGNAL_COLORS, RISK_LABELS, RISK_COLORS, signalIcon } from "../lib/signals.jsx";
import { fmtEGP } from "../services/api";

export default function SignalDisplay({ title, data, subtitle }) {
  if (!data) return null;
  const s = data.signal || "hold";
  const c = SIGNAL_COLORS[s] || SIGNAL_COLORS.hold;
  const risk = data.risk || {};
  const reasons = data.reasons || [];
  const news = data.news;
  const NEWS_COLOR = { "إيجابية": "text-emerald-400", "سلبية": "text-red-400", "محايدة": "text-gray-400" };

  return (
    <div className={`${c.bg} rounded-xl p-4 border ${c.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-gray-400 text-xs">{title}</p>
          {subtitle && <p className="text-gray-500 text-[11px]">{subtitle}</p>}
        </div>
        <span className={`flex items-center gap-1 text-xl font-extrabold ${c.text}`}>
          {signalIcon(s, 20)} {SIGNAL_LABELS[s]}
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-2">
        الثقة: <span className="text-gray-200 font-semibold">{((data.confidence || 0) * 100).toFixed(0)}%</span>
      </p>
      <div className="flex gap-3 text-[11px] mb-3">
        <span className="text-emerald-400">شراء {((data.prob_buy || 0) * 100).toFixed(0)}%</span>
        <span className="text-yellow-400">انتظار {((data.prob_hold || 0) * 100).toFixed(0)}%</span>
        <span className="text-red-400">بيع {((data.prob_sell || 0) * 100).toFixed(0)}%</span>
      </div>

      {news && news.n_articles > 0 && (
        <p className="text-[11px] mb-2 flex items-center gap-1">
          <span>📰</span>
          <span className="text-gray-400">المعنويات الإخبارية:</span>
          <span className={`font-semibold ${NEWS_COLOR[news.label] || "text-gray-300"}`}>{news.label}</span>
          <span className="text-gray-600">
            ({news.source === "company" ? "أخبار الشركة" : "أخبار عامة"} · {news.n_articles} مقال)
          </span>
        </p>
      )}

      {(risk.stop_loss || risk.take_profit) && (
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="bg-gray-900/40 rounded-lg p-1.5">
            <p className="text-[10px] text-gray-500">دخول</p>
            <p className="text-xs font-semibold text-gray-200">{fmtEGP(risk.entry, 2)}</p>
          </div>
          <div className="bg-gray-900/40 rounded-lg p-1.5">
            <p className="text-[10px] text-gray-500">وقف خسارة</p>
            <p className="text-xs font-semibold text-red-300">{fmtEGP(risk.stop_loss, 2)}</p>
          </div>
          <div className="bg-gray-900/40 rounded-lg p-1.5">
            <p className="text-[10px] text-gray-500">هدف</p>
            <p className="text-xs font-semibold text-emerald-300">{fmtEGP(risk.take_profit, 2)}</p>
          </div>
        </div>
      )}

      {risk.level && (
        <p className="text-[11px] mb-2">
          درجة المخاطرة:{" "}
          <span className={`font-semibold ${RISK_COLORS[risk.level] || "text-gray-300"}`}>
            {RISK_LABELS[risk.level] || risk.level}
          </span>
          {risk.atr_pct != null && <span className="text-gray-500"> (تذبذب {risk.atr_pct}%)</span>}
        </p>
      )}

      {reasons.length > 0 && (
        <ul className="space-y-1 mt-2">
          {reasons.map((r, i) => (
            <li key={i} className="text-[11px] text-gray-300 flex gap-1.5">
              <span className="text-gray-500">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
