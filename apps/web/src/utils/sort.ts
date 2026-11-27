import { MarketStore } from '../store/market-store';

export type SortKey = 'symbol' | 'ltp' | 'pct';
export interface Sort {
  key: SortKey;
  direction: 'asc' | 'desc';
}

/** Header clicks cycle: ascending → descending → selection order. */
export function nextSort(current: Sort | null, key: SortKey): Sort | null {
  if (current?.key !== key) return { key, direction: 'asc' };
  return current.direction === 'asc' ? { key, direction: 'desc' } : null;
}

export function sortSymbols(symbols: readonly string[], sort: Sort | null, store: MarketStore): readonly string[] {
  if (!sort) return symbols;
  const sign = sort.direction === 'asc' ? 1 : -1;
  const { key } = sort;
  return [...symbols].sort((a, b) => {
    if (key === 'symbol') return sign * a.localeCompare(b);
    const x = store.get(a)?.[key];
    const y = store.get(b)?.[key];
    // Stocks still waiting for data stay at the bottom.
    if (x === undefined || y === undefined) return Number(x === undefined) - Number(y === undefined);
    return sign * (x - y) || a.localeCompare(b);
  });
}
