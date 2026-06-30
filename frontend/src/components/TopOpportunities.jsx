import { Sparkles, Zap, LineChart, ChevronLeft } from "lucide-react";
import { fmtEGP } from "../services/api";

function buildAssets(stocks, gold) {
  const assets = (stocks || []).map((s) => ({
    type: "stock",
    key: s.symbol,
    symbol: s.symbol.replace(".CA", ""),
    name: s.name,
    sector: s.sector,
    price: s.close,
    short: s.short_term,
    long: s.long_term,
    path: `/stock/${s.symbol.replace(".CA", "")}`,
  }));
  if (gold) {
    assets.push({
      type: "gold",
      key: "gold",
      symbol: "XAU",
      name: "الذهب (عيار 21)",
      sector: "معدن نفيس",
      price: gold.price_21k,
      short: gold.short_term,
      long: gold.long_term,
      path: "/gold",
    });
  }
  return assets;
}

function rankBuys(assets, horizonKey, limit = 5) {
  return assets
    .map((a) => ({ ...a, rec: a[horizonKey] }))
    .filter((a) => a.rec?.signal === "buy")
    .sort((a, b) => (b.rec.confidence ?? 0) - (a.rec.confidence ?? 0) || (b.rec.score ?? 0) - (a.rec.score ?? 0))
    .slice(0, limit);
}

const BULLISH_HINTS = ["تشبّع بيعي", "إيجابي", "صاعد", "فوق المتوسط", "فوق متوسط"];

function pickReason(reasons) {
  if (!reasons?.length) return null;
  return reasons.find((r) => BULLISH_HINTS.some((h) => r.includes(h))) || reasons[0];
}

function OpportunityRow({ rank, item, onClick }) {
  const reason = pickReason(item.rec.reasons);
  const risk = item.rec.risk || {};
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-gray-900/40 hover:bg-gray-900/70 border border-gray-700/40 rounded-lg p-3 transition text-right"
    >
      <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-white truncate">
            {item.symbol} <span className="text-gray-500 font-normal text-xs">{item.name}</span>
          </span>
          <span className="text-emerald-400 font-bold text-sm shrink-0">
            {((item.rec.confidence ?? 0) * 100).toFixed(0)}%
          </span>
        </div>
        {reason && <p className="text-[11px] text-gray-400 truncate mt-0.5">{reason}</p>}
        {(risk.entry || risk.take_profit) && (
          <p className="text-[10px] text-gray-500 mt-1">
            دخول {fmtEGP(risk.entry, 2)}
            {risk.take_profit && <> · هدف {fmtEGP(risk.take_profit, 2)}</>}
            {risk.stop_loss && <> · وقف {fmtEGP(risk.stop_loss, 2)}</>}
          </p>
        )}
      </div>
      <ChevronLeft size={16} className="text-gray-600 shrink-0" />
    </button>
  );
}

function OpportunityColumn({ icon, title, subtitle, items, emptyText, navigate }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-emerald-400">{icon}</span>
        <h4 className="font-bold text-white">{title}</h4>
        <span className="text-[11px] text-gray-500">{subtitle}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500 py-4 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <OpportunityRow key={item.key} rank={i + 1} item={item} onClick={() => navigate(item.path)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopOpportunities({ stocks, gold, navigate }) {
  const assets = buildAssets(stocks, gold);
  if (!assets.length) return null;

  const shortPicks = rankBuys(assets, "short");
  const longPicks = rankBuys(assets, "long");

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-yellow-400" size={18} />
        <h3 className="font-bold text-lg">أفضل الفرص المتاحة الآن</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <OpportunityColumn
          icon={<Zap size={16} />}
          title="فرص مضاربة"
          subtitle="أفق قصير ~5 أيام"
          items={shortPicks}
          emptyText="لا توجد فرص مضاربة قوية حالياً — السوق في حالة ترقّب"
          navigate={navigate}
        />
        <OpportunityColumn
          icon={<LineChart size={16} />}
          title="فرص استثمار"
          subtitle="أفق طويل ~60 يوم"
          items={longPicks}
          emptyText="لا توجد فرص استثمارية قوية حالياً — السوق في حالة ترقّب"
          navigate={navigate}
        />
      </div>
    </div>
  );
}
