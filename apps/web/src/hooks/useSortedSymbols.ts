import { useEffect, useMemo, useRef, useState } from 'react';
import { MarketStore } from '../store/market-store';
import { Sort, sortSymbols } from '../utils/sort';

export const RESORT_MS = 1000;

/**
 * Row order for the table. When sorting by a live value the order is
 * re-evaluated once a second, and state changes only if rows actually moved.
 */
export function useSortedSymbols(symbols: readonly string[], sort: Sort | null, store: MarketStore): readonly string[] {
  const [version, setVersion] = useState(0);
  // `version` is a deliberate dependency: bumping it re-reads the live values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const order = useMemo(() => sortSymbols(symbols, sort, store), [symbols, sort, store, version]);
  const current = useRef(order);
  current.current = order;

  useEffect(() => {
    if (!sort || sort.key === 'symbol') return;
    const timer = setInterval(() => {
      const next = sortSymbols(symbols, sort, store);
      if (next.some((symbol, i) => symbol !== current.current[i])) setVersion((v) => v + 1);
    }, RESORT_MS);
    return () => clearInterval(timer);
  }, [symbols, sort, store]);

  return order;
}
