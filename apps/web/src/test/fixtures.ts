import { Quote } from '@market/shared';

export const quote = (overrides: Partial<Quote> = {}): Quote => ({
  ltp: 100, chg: 1, pct: 1, high: 110, low: 90, vol: 12_500_000, h52: 150, l52: 50, open: 99, prev: 99, bid: 99.95, ask: 100.05, avg: 100, ...overrides,
});
