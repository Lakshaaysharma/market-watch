import { QuoteField } from '@market/shared';
import { useCallback, useSyncExternalStore } from 'react';
import { useMarket } from '../app/market-context';

/**
 * Subscribes to one field of one stock and returns it formatted. React compares
 * the returned string, so a change too small to be visible causes no re-render.
 * `format` must be a stable function.
 */
export function useQuoteValue(symbol: string, field: QuoteField, format: (value: number) => string): string | null {
  const { store } = useMarket();
  const subscribe = useCallback((listener: () => void) => store.subscribe(symbol, field, listener), [store, symbol, field]);
  return useSyncExternalStore(subscribe, () => {
    const value = store.get(symbol)?.[field];
    return value === undefined ? null : format(value);
  });
}
