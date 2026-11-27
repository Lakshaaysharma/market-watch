/**
 * Live fields of a stock. Names are short because they travel on every tick.
 * Prices are in rupees; `vol` is the number of shares traded today.
 */
export const QUOTE_FIELDS = [
  'ltp', // last traded price
  'chg', // change in rupees against the previous close
  'pct', // change in percent against the previous close
  'high', // day high
  'low', // day low
  'vol', // day volume
  'h52', // 52-week high
  'l52', // 52-week low
  'open',
  'prev', // previous close
  'bid',
  'ask',
  'avg', // volume-weighted average price
] as const;

export type QuoteField = (typeof QUOTE_FIELDS)[number];
export type Quote = Record<QuoteField, number>;
export type QuoteDelta = Partial<Quote>;

export interface StockInfo {
  symbol: string;
  name: string;
}

/** Stocks selected when a user opens the app for the first time. */
export const DEFAULT_SYMBOLS: readonly string[] = [
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'INFY',
  'ICICIBANK',
  'SBIN',
  'BHARTIARTL',
  'ITC',
  'KOTAKBANK',
];
