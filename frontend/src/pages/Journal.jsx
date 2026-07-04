import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Plus, Trash2, TrendingUp, TrendingDown,
  ArrowRight, X, ChevronDown,
} from "lucide-react";
import { getTrades, addTrade, deleteTrade } from "../services/journal";
import { loadSnapshot, fmtEGP } from "../services/api";

const HORIZON_LABEL = { short: "مضاربة", long: "استثمار" };
const ACTION_LABEL  = { buy: "شراء", sell: "بيع" };
const SIG_LABEL     = { buy: "شراء", sell: "بيع", hold: "انتظار" };
const SIG_COLOR     = { buy: "text-emerald-400", sell: "text-red-400", hold: "text-gray-400" };
const GOLD_KARATS   = ["24k", "22k", "21k", "18k"];
const KARAT_LABELS  = { "24k": "عيار 24", "22k": "عيار 22", "21k": "عيار 21", "18k": "عيار 18" };

// ── helpers ─────────────────────────────────────────────────────────────────

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("ar-EG", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function currentPrice(trade, snap) {
  if (!snap) return null;
  if (trade.symbol === "gold") {
    const g = snap.gold;
    if (!g) return null;
    return g.grams?.[trade.karat || "21k"] ?? null;
  }
  const s = (snap.stocks || []).find((x) => x.symbol === trade.symbol);
  return s ? s.close : null;
}

// ── Add-trade modal ─────────────────────────────────────────────────────────

function AddModal({ snap, onClose, onSaved }) {
  const stocks  = snap?.stocks || [];
  const hasGold = !!snap?.gold;

  const [symbol,    setSymbol]    = useState(stocks[0]?.symbol || "");
  const [isGold,    setIsGold]    = useState(false);
  const [karat,     setKarat]     = useState("21k");
  const [action,    setAction]    = useState("buy");
  const [horizon,   setHorizon]   = useState("short");
  const [amount,    setAmount]    = useState("");
  const [price,     setPrice]     = useState("");
  const [date,      setDate]      = useState(new Date().toISOString().slice(0, 10));
  const [notes,     setNotes]     = useState("");

  // derive asset info
  const asset = isGold
    ? snap?.gold
    : stocks.find((s) => s.symbol === symbol);

  const assetPrice = isGold
    ? (snap?.gold?.grams?.[karat] ?? 0)
    : (asset?.close ?? 0);

  const rec = asset ? (horizon === "short" ? asset.short_term : asset.long_term) : null;

  // pre-fill price when asset changes
  useEffect(() => {
    setPrice(assetPrice ? String(Math.round(assetPrice * 100) / 100) : "");
  }, [symbol, isGold, karat, horizon]);

  const units = amount && price ? (parseFloat(amount) / parseFloat(price)) : 0;

  function handleAssetChange(val) {
    if (val === "__gold__") { setIsGold(true); setSymbol(""); }
    else                    { setIsGold(false); setSymbol(val); }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const p = parseFloat(price);
    const a = parseFloat(amount);
    if (!a || !p) return;

    addTrade({
      symbol:         isGold ? "gold" : symbol,
      name:           isGold ? "الذهب" : (asset?.name || symbol),
      action,
      horizon,
      karat:          isGold ? karat : null,
      amount:         a,
      price:          p,
      units:          parseFloat((a / p).toFixed(4)),
      rec_signal:     rec?.signal || null,
      rec_confidence: rec?.confidence || null,
      rec_entry:      rec?.risk?.entry || null,
      date,
      notes,
    });
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800">
          <h3 className="font-bold text-lg">تسجيل صفقة جديدة</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* asset picker */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">الأصل</label>
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm appearance-none pr-8"
                value={isGold ? "__gold__" : symbol}
                onChange={(e) => handleAssetChange(e.target.value)}
              >
                <optgroup label="أسهم">
                  {stocks.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.name} ({s.symbol.replace(".CA", "")})
                    </option>
                  ))}
                </optgroup>
                {hasGold && (
                  <optgroup label="معادن">
                    <option value="__gold__">الذهب</option>
                  </optgroup>
                )}
              </select>
              <ChevronDown size={14} className="absolute left-3 top-3 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* karat (gold only) */}
          {isGold && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">العيار</label>
              <div className="grid grid-cols-4 gap-2">
                {GOLD_KARATS.map((k) => (
                  <button
                    key={k} type="button"
                    onClick={() => setKarat(k)}
                    className={`py-1.5 rounded-lg text-sm border transition ${
                      karat === k
                        ? "bg-yellow-500/20 border-yellow-500/60 text-yellow-300"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}
                  >
                    {KARAT_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* action + horizon */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">الإجراء</label>
              <div className="grid grid-cols-2 gap-1">
                {["buy", "sell"].map((a) => (
                  <button key={a} type="button" onClick={() => setAction(a)}
                    className={`py-2 rounded-lg text-sm border transition ${
                      action === a
                        ? a === "buy"
                          ? "bg-emerald-600/20 border-emerald-500/60 text-emerald-300"
                          : "bg-red-600/20 border-red-500/60 text-red-300"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}
                  >
                    {ACTION_LABEL[a]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">النوع</label>
              <div className="grid grid-cols-2 gap-1">
                {["short", "long"].map((h) => (
                  <button key={h} type="button" onClick={() => setHorizon(h)}
                    className={`py-2 rounded-lg text-sm border transition ${
                      horizon === h
                        ? "bg-blue-600/20 border-blue-500/60 text-blue-300"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}
                  >
                    {HORIZON_LABEL[h]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* recommendation badge */}
          {rec && (
            <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl px-4 py-3 text-sm">
              <p className="text-gray-400 text-xs mb-1">توصية النموذج ({HORIZON_LABEL[horizon]})</p>
              <div className="flex items-center justify-between">
                <span className={`font-bold text-base ${SIG_COLOR[rec.signal]}`}>
                  {SIG_LABEL[rec.signal]}
                </span>
                <span className="text-gray-400 text-xs">
                  ثقة {Math.round((rec.confidence || 0) * 100)}%
                </span>
                {rec.risk?.entry && (
                  <span className="text-gray-300 text-xs">
                    دخول مقترح: {fmtEGP(rec.risk.entry)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* price + amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                سعر {isGold ? "الجرام" : "السهم"} (ج.م)
              </label>
              <input
                type="number" min="0" step="0.01" required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                المبلغ الكلي (ج.م)
              </label>
              <input
                type="number" min="0" step="1" required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
                placeholder="0"
              />
            </div>
          </div>

          {/* units preview */}
          {units > 0 && (
            <p className="text-xs text-gray-400 text-center -mt-1">
              ≈ {fmt(units, 2)} {isGold ? "جرام" : "سهم"}
            </p>
          )}

          {/* date */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">تاريخ الصفقة</label>
            <input
              type="date" required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          {/* notes */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">ملاحظات (اختياري)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm resize-none"
              placeholder="سبب الصفقة أو أي ملاحظة..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition"
          >
            حفظ الصفقة
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Trade card ───────────────────────────────────────────────────────────────

function TradeCard({ trade, snap, onDelete }) {
  const curPrice = currentPrice(trade, snap);
  const plAbs = curPrice ? (curPrice - trade.price) * trade.units : null;
  const plPct = curPrice ? ((curPrice - trade.price) / trade.price) * 100 : null;
  const isProfit = plAbs > 0;

  const isBuy  = trade.action === "buy";
  const isGold = trade.symbol === "gold";

  return (
    <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4">
      {/* top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isBuy
                ? "bg-emerald-600/20 text-emerald-300"
                : "bg-red-600/20 text-red-300"
            }`}>
              {ACTION_LABEL[trade.action]}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300">
              {HORIZON_LABEL[trade.horizon]}
            </span>
            {isGold && trade.karat && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-600/20 text-yellow-300">
                {KARAT_LABELS[trade.karat]}
              </span>
            )}
          </div>
          <p className="font-bold mt-1">{trade.name}</p>
          {!isGold && (
            <p className="text-xs text-gray-500">{trade.symbol?.replace(".CA", "")}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{trade.date}</span>
          <button
            onClick={() => onDelete(trade.id)}
            className="text-gray-600 hover:text-red-400 transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* amounts grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-gray-900/50 rounded-lg py-2">
          <p className="text-[10px] text-gray-500 mb-0.5">المبلغ</p>
          <p className="text-sm font-bold text-white">{fmtEGP(trade.amount, 0)}</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg py-2">
          <p className="text-[10px] text-gray-500 mb-0.5">
            سعر {isGold ? "الجرام" : "السهم"}
          </p>
          <p className="text-sm font-bold text-white">{fmtEGP(trade.price)}</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg py-2">
          <p className="text-[10px] text-gray-500 mb-0.5">
            {isGold ? "الجرامات" : "الأسهم"}
          </p>
          <p className="text-sm font-bold text-white">{fmt(trade.units, 2)}</p>
        </div>
      </div>

      {/* recommendation row */}
      {trade.rec_signal && (
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3 bg-gray-900/40 rounded-lg px-3 py-2">
          <span>توصية النموذج:</span>
          <span className={`font-semibold ${SIG_COLOR[trade.rec_signal]}`}>
            {SIG_LABEL[trade.rec_signal]}
          </span>
          {trade.rec_confidence != null && (
            <span>ثقة {Math.round(trade.rec_confidence * 100)}%</span>
          )}
          {trade.rec_entry != null && (
            <span>· دخول مقترح {fmtEGP(trade.rec_entry)}</span>
          )}
        </div>
      )}

      {/* P&L */}
      {plAbs != null && isBuy && (
        <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
          isProfit
            ? "bg-emerald-900/20 border border-emerald-700/30"
            : "bg-red-900/20 border border-red-700/30"
        }`}>
          <div className="flex items-center gap-1.5">
            {isProfit
              ? <TrendingUp size={14} className="text-emerald-400" />
              : <TrendingDown size={14} className="text-red-400" />
            }
            <span className="text-gray-400 text-xs">
              السعر الحالي {fmtEGP(curPrice)}
            </span>
          </div>
          <div className="text-left">
            <span className={`font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
              {isProfit ? "+" : ""}{fmtEGP(plAbs, 0)}
            </span>
            <span className={`text-xs mr-1.5 ${isProfit ? "text-emerald-500" : "text-red-500"}`}>
              ({isProfit ? "+" : ""}{fmt(plPct, 1)}%)
            </span>
          </div>
        </div>
      )}

      {/* notes */}
      {trade.notes && (
        <p className="text-xs text-gray-500 mt-2 border-t border-gray-700/30 pt-2">
          {trade.notes}
        </p>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Journal() {
  const navigate  = useNavigate();
  const [trades,  setTrades]  = useState([]);
  const [snap,    setSnap]    = useState(null);
  const [modal,   setModal]   = useState(false);

  useEffect(() => {
    setTrades(getTrades());
    loadSnapshot().then(setSnap).catch(() => {});
  }, []);

  function reload() { setTrades(getTrades()); }

  function handleDelete(id) {
    deleteTrade(id);
    reload();
  }

  const totalBuy  = trades.filter(t => t.action === "buy").reduce((s, t) => s + t.amount, 0);
  const totalSell = trades.filter(t => t.action === "sell").reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      {modal && (
        <AddModal
          snap={snap}
          onClose={() => setModal(false)}
          onSaved={reload}
        />
      )}

      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1 text-gray-400 hover:text-white transition mb-4 text-sm"
      >
        <ArrowRight size={16} /> العودة للوحة
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="text-emerald-400" size={22} />
          <div>
            <h2 className="text-xl font-bold">دفتر صفقاتي</h2>
            <p className="text-gray-400 text-xs">سجّل صفقاتك واتبّع أداءها</p>
          </div>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-sm font-medium transition"
        >
          <Plus size={16} /> صفقة جديدة
        </button>
      </div>

      {/* summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">إجمالي الصفقات</p>
          <p className="text-2xl font-bold">{trades.length}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">إجمالي الشراء</p>
          <p className="text-lg font-bold text-emerald-400">{fmtEGP(totalBuy, 0)}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">إجمالي البيع</p>
          <p className="text-lg font-bold text-red-400">{fmtEGP(totalSell, 0)}</p>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg mb-1">لا توجد صفقات مسجّلة بعد</p>
          <p className="text-sm">اضغط «صفقة جديدة» لتسجيل أول صفقة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trades.map((t) => (
            <TradeCard
              key={t.id}
              trade={t}
              snap={snap}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
