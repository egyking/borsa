const KEY = "borsa_journal_v1";

export function getTrades() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addTrade(trade) {
  const trades = getTrades();
  const entry = {
    ...trade,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  trades.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(trades));
  return entry;
}

export function deleteTrade(id) {
  localStorage.setItem(
    KEY,
    JSON.stringify(getTrades().filter((t) => t.id !== id))
  );
}
