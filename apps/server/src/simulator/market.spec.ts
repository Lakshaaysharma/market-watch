import { QUOTE_FIELDS } from '@market/shared';
import { Market } from './market';
import { seededRandom } from './random';

const create = (overrides = {}) =>
  new Market({ stockCount: 60, updateRatio: 1, volatility: 0.004, random: seededRandom(7), ...overrides });

describe('Market', () => {
  it('creates the requested number of unique stocks, beyond the named list too', () => {
    const market = create({ stockCount: 120 });
    expect(new Set(market.stocks.map((s) => s.symbol)).size).toBe(120);
  });

  it('opens with the values shown in the reference design', () => {
    expect(create().quote('RELIANCE')).toMatchObject({ ltp: 1425.6, pct: 2.35, high: 1430, low: 1398.2, vol: 12_500_000, h52: 1620, l52: 1210.3 });
  });

  it('keeps every quote internally consistent over many ticks', () => {
    const market = create();
    const volumes = new Map(market.stocks.map((s) => [s.symbol, market.quote(s.symbol)!.vol]));
    for (let tick = 0; tick < 2000; tick += 1) market.step();
    for (const { symbol } of market.stocks) {
      const q = market.quote(symbol)!;
      expect(q.low).toBeLessThanOrEqual(q.ltp);
      expect(q.ltp).toBeLessThanOrEqual(q.high);
      expect(q.l52).toBeLessThanOrEqual(q.low);
      expect(q.h52).toBeGreaterThanOrEqual(q.high);
      expect(q.bid).toBeLessThan(q.ask);
      expect(q.vol).toBeGreaterThan(volumes.get(symbol)!);
      expect(q.pct).toBeCloseTo(((q.ltp - q.prev) / q.prev) * 100, 1);
      expect(Math.abs(q.pct)).toBeLessThanOrEqual(10.01);
      expect(Math.round(q.ltp * 100) % 5).toBe(0);
    }
  });

  it('reports only fields that really changed, and applying them reproduces the state', () => {
    const market = create();
    const mirror = new Map(market.stocks.map((s) => [s.symbol, market.quote(s.symbol)!]));
    for (let tick = 0; tick < 200; tick += 1) {
      for (const [symbol, delta] of market.step()) {
        const previous = mirror.get(symbol)!;
        for (const field of QUOTE_FIELDS) {
          if (field in delta) expect(delta[field]).not.toBe(previous[field]);
        }
        Object.assign(previous, delta);
      }
    }
    for (const [symbol, quote] of mirror) expect(quote).toEqual(market.quote(symbol));
  });

  it('changes nothing when the update ratio is zero', () => {
    expect(create({ updateRatio: 0 }).step()).toEqual([]);
  });
});
