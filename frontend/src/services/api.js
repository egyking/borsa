const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getSymbols() {
  return fetchJSON(`${API_BASE}/api/symbols`);
}

export async function getPrices() {
  return fetchJSON(`${API_BASE}/api/prices`);
}

export async function getHistory(symbol, period = "1y") {
  return fetchJSON(`${API_BASE}/api/history/${symbol}?period=${period}`);
}

export async function getIndicators(symbol, period = "1y") {
  return fetchJSON(`${API_BASE}/api/indicators/${symbol}?period=${period}`);
}

export async function getRecommendation(symbol) {
  return fetchJSON(`${API_BASE}/api/recommend/${symbol}`);
}

export async function updateAll() {
  return fetchJSON(`${API_BASE}/api/update-all`, { method: "POST" });
}

export async function getHealth() {
  return fetchJSON(`${API_BASE}/api/health`);
}
