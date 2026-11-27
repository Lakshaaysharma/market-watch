import { Quote, QUOTE_FIELDS, QuoteDelta, QuoteField } from '@market/shared';

type Listener = () => void;

/**
 * Live quotes, kept outside React. Components subscribe to a single
 * (symbol, field) pair, so a price change wakes only the cells that show it.
 */
export class MarketStore {
  private readonly quotes = new Map<string, Quote>();
  private readonly listeners = new Map<string, Set<Listener>>();

  get(symbol: string): Quote | undefined {
    return this.quotes.get(symbol);
  }

  subscribe(symbol: string, field: QuoteField, listener: Listener): () => void {
    const key = `${symbol}:${field}`;
    let set = this.listeners.get(key);
    if (!set) this.listeners.set(key, (set = new Set()));
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0 && this.listeners.get(key) === set) this.listeners.delete(key);
    };
  }

  /**
   * Applies a batch. Full snapshots and deltas are both accepted; a delta for a
   * stock without a snapshot is ignored, as its other fields are unknown.
   * All values are written before anyone is notified.
   * @returns the number of fields whose value changed.
   */
  apply(updates: Iterable<[symbol: string, data: QuoteDelta, isSnapshot: boolean]>): number {
    const dirty: string[] = [];
    for (const [symbol, data, isSnapshot] of updates) {
      let quote = this.quotes.get(symbol);
      if (!quote) {
        if (!isSnapshot) continue;
        this.quotes.set(symbol, (quote = {} as Quote));
      }
      for (const field of QUOTE_FIELDS) {
        const value = data[field];
        if (value === undefined || quote[field] === value) continue;
        quote[field] = value;
        dirty.push(`${symbol}:${field}`);
      }
    }
    for (const key of dirty) this.listeners.get(key)?.forEach((listener) => listener());
    return dirty.length;
  }

  remove(symbol: string): void {
    this.quotes.delete(symbol);
  }
}
