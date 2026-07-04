import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { addTrade } from "../services/journal";
import { fmtEGP } from "../services/api";

const SIG_COLOR = { buy: "text-emerald-400", sell: "text-red-400", hold: "text-gray-400" };
const SIG_LABEL = { buy: "شراء", sell: "بيع", hold: "انتظار" };
const GOLD_KARATS = ["24k", "22k", "21k", "18k"];
const KARAT_LABELS = { "24k": "عيار 24", "22k": "عيار 22", "21k": "عيار 21", "18k": "عيار 18" };

export default function LogTradeButton({ stock, gold }) {
  const [open,    setOpen]    = useState(false);
  const [action,  setAction]  = useState("buy");
  const [horizon, setHorizon] = useState("short");
  const [karat,   setKarat]   = useState("21k");
  const [price,   setPrice]   = useState("");
  const [amount,  setAmount]  = useState("");
  const [date,    setDate]    = useState(new Date().toISOString().slice(0, 10));
  const [notes,   setNotes]   = useState("");
  const [saved,   setSaved]   = useState(false);

  const isGold = !!gold;
  const name   = isGold ? "الذهب" : (stock?.name || "");
  const symbol = isGold ? "gold"  : (stock?.symbol || "");

  const rec = isGold
    ? (horizon === "short" ? gold?.short_term  : gold?.long_term)
    : (horizon === "short" ? stock?.short_term : stock?.long_term);

  useEffect(() => {
    const p = isGold
      ? (gold?.grams?.[karat] ?? 0)
      : (stock?.close ?? 0);
    setPrice(p ? String(Math.round(p * 100) / 100) : "");
  }, [isGold, karat, stock?.close, gold]);

  function openWith(act) {
    setAction(act);
    setAmount("");
    setNotes("");
    setHorizon("short");
    setSaved(false);
    setDate(new Date().toISOString().slice(0, 10));
    setOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const p = parseFloat(price);
    const a = parseFloat(amount);
    if (!a || !p) return;
    addTrade({
      symbol, name, action, horizon,
      karat: isGold ? karat : null,
      amount: a, price: p,
      units: parseFloat((a / p).toFixed(4)),
      rec_signal:     rec?.signal      || null,
      rec_confidence: rec?.confidence  || null,
      rec_entry:      rec?.risk?.entry || null,
      date, notes,
    });
    setSaved(true);
    setTimeout(() => { setOpen(false); setSaved(false); }, 1400);
  }

  const units = amount && price ? parseFloat(amount) / parseFloat(price) : 0;

  return (
    <>
      {/* ── trigger buttons ───────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={() => openWith("buy")}
          className="flex-1 bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-400 font-semibold py-2 rounded-xl text-sm transition"
        >
          شراء ↗
        </button>
        <button
          onClick={() => openWith("sell")}
          className="flex-1 bg-red-600/15 hover:bg-red-600/30 border border-red-600/40 text-red-400 font-semibold py-2 rounded-xl text-sm transition"
        >
          بيع ↘
        </button>
      </div>

      {/* ── modal ─────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800">
              <div>
                <p className="text-xs text-gray-500">تسجيل صفقة</p>
                <h3 className="font-bold">{name}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {saved ? (
              <div className="py-10 text-center">
                <p className="text-4xl mb-3">✓</p>
                <p className="text-emerald-400 font-semibold">تم حفظ الصفقة</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

                {/* action + horizon */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">الإجراء</label>
                    <div className="grid grid-cols-2 gap-1">
                      {[["buy","شراء"],["sell","بيع"]].map(([a, lbl]) => (
                        <button key={a} type="button" onClick={() => setAction(a)}
                          className={`py-2 rounded-lg text-sm border transition ${
                            action === a
                              ? a === "buy"
                                ? "bg-emerald-600/20 border-emerald-500/60 text-emerald-300"
                                : "bg-red-600/20 border-red-500/60 text-red-300"
                              : "bg-gray-800 border-gray-700 text-gray-400"
                          }`}
                        >{lbl}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">النوع</label>
                    <div className="grid grid-cols-2 gap-1">
                      {[["short","مضاربة"],["long","استثمار"]].map(([h, lbl]) => (
                        <button key={h} type="button" onClick={() => setHorizon(h)}
                          className={`py-2 rounded-lg text-sm border transition ${
                            horizon === h
                              ? "bg-blue-600/20 border-blue-500/60 text-blue-300"
                              : "bg-gray-800 border-gray-700 text-gray-400"
                          }`}
                        >{lbl}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* karat — gold only */}
                {isGold && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">العيار</label>
                    <div className="grid grid-cols-4 gap-1">
                      {GOLD_KARATS.map((k) => (
                        <button key={k} type="button" onClick={() => setKarat(k)}
                          className={`py-1.5 rounded-lg text-xs border transition ${
                            karat === k
                              ? "bg-yellow-500/20 border-yellow-500/60 text-yellow-300"
                              : "bg-gray-800 border-gray-700 text-gray-400"
                          }`}
                        >{KARAT_LABELS[k]}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* recommendation */}
                {rec && (
                  <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl px-4 py-3">
                    <p className="text-gray-400 text-xs mb-2">
                      توصية النموذج ({horizon === "short" ? "مضاربة" : "استثمار"})
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className={`font-bold ${SIG_COLOR[rec.signal] || "text-gray-300"}`}>
                        {SIG_LABEL[rec.signal] || rec.signal}
                      </span>
                      {rec.confidence != null && (
                        <span className="text-gray-400 text-xs">
                          ثقة {Math.round(rec.confidence * 100)}%
                        </span>
                      )}
                      {rec.risk?.entry != null && (
                        <span className="text-gray-300 text-xs">دخول {fmtEGP(rec.risk.entry)}</span>
                      )}
                      {rec.risk?.take_profit != null && (
                        <span className="text-emerald-500 text-xs">هدف {fmtEGP(rec.risk.take_profit)}</span>
                      )}
                      {rec.risk?.stop_loss != null && (
                        <span className="text-red-500 text-xs">وقف {fmtEGP(rec.risk.stop_loss)}</span>
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
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">المبلغ (ج.م)</label>
                    <input
                      type="number" min="0" step="1" required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                </div>

                {units > 0 && (
                  <p className="text-xs text-gray-500 text-center -mt-1">
                    ≈ {units.toFixed(2)} {isGold ? "جرام" : "سهم"}
                  </p>
                )}

                <input
                  type="date" required value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"
                />

                <textarea
                  rows={2} value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm resize-none"
                  placeholder="ملاحظات (اختياري)..."
                />

                <button
                  type="submit"
                  className={`w-full font-semibold py-2.5 rounded-xl transition text-white ${
                    action === "buy"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {action === "buy" ? "تأكيد الشراء" : "تأكيد البيع"}
                </button>

              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
