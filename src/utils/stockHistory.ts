export const STOCK_HISTORY_KEY = 'pse_stock_history';

export interface StockHistoryEntry {
  date_add:          string;
  physical_quantity: number;
  sign:              1 | -1;
  reason:            string;
}

export function recordStockHistory(
  productId: number | string,
  qty: number,
  sign: 1 | -1,
  reason: string
) {
  const all: Record<string, StockHistoryEntry[]> = JSON.parse(
    localStorage.getItem(STOCK_HISTORY_KEY) || '{}'
  );
  const key = String(productId);
  if (!all[key]) all[key] = [];
  all[key].unshift({
    date_add:          new Date().toISOString(),
    physical_quantity: qty,
    sign,
    reason,
  });
  localStorage.setItem(STOCK_HISTORY_KEY, JSON.stringify(all));
}
