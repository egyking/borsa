// Snapshot-first data layer.
// Primary source = the static snapshot.json produced daily by the GitHub Action
// (free, instant, no rate limits). Optional live backend via VITE_API_URL.

const API_BASE = import.meta.env.VITE_API_URL || "";
const SNAPSHOT_URL = import.meta.env.VITE_SNAPSHOT_URL || "/snapshot.json";

let _snapshotCache = null;
let _snapshotPromise = null;

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function loadSnapshot(force = false) {
  if (_snapshotCache && !force) return _snapshotCache;
  if (_snapshotPromise && !force) return _snapshotPromise;
  _snapshotPromise = (async () => {
    // Try the live backend snapshot first if configured, else the static file.
    const sources = API_BASE
      ? [`${API_BASE}/api/snapshot`, SNAPSHOT_URL]
      : [SNAPSHOT_URL];
    let lastErr;
    for (const url of sources) {
      try {
        const data = await fetchJSON(url);
        if (data && Array.isArray(data.stocks)) {
          _snapshotCache = data;
          return data;
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("No snapshot available");
  })();
  return _snapshotPromise;
}

export async function getStocks() {
  const snap = await loadSnapshot();
  return snap.stocks || [];
}

export async function getStock(symbol) {
  const snap = await loadSnapshot();
  const sym = symbol.endsWith(".CA") ? symbol : `${symbol}.CA`;
  return (snap.stocks || []).find((s) => s.symbol === sym) || null;
}

export async function getGold() {
  const snap = await loadSnapshot();
  return snap.gold || null;
}

export async function getMeta() {
  const snap = await loadSnapshot();
  return { generatedAt: snap.generated_at, currency: snap.currency || "EGP" };
}

export async function getEvaluation() {
  const snap = await loadSnapshot();
  return snap.evaluation || null;
}

// ---- Currency helpers (EGX trades in Egyptian Pounds) --------------------
export function fmtEGP(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Number(value).toLocaleString("ar-EG", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ج.م`;
}
