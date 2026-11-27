import { describe, expect, it } from 'vitest';
import { formatPercent, formatPrice, formatVolume } from './format';
import { nextSort } from './sort';

describe('formatting', () => {
  it('formats prices with Indian grouping', () => {
    expect(formatPrice(1425.6)).toBe('₹ 1,425.60');
    expect(formatPrice(125000)).toBe('₹ 1,25,000.00');
  });
  it('signs percentages', () => {
    expect([formatPercent(2.35), formatPercent(-0.72), formatPercent(0)]).toEqual(['+2.35%', '-0.72%', '0.00%']);
  });
  it('abbreviates volume', () => {
    expect([formatVolume(12_500_000), formatVolume(4200), formatVolume(87)]).toEqual(['12.5M', '4.2K', '87']);
  });
  it('cycles sort order', () => {
    const asc = nextSort(null, 'ltp');
    const desc = nextSort(asc, 'ltp');
    expect([asc?.direction, desc?.direction, nextSort(desc, 'ltp')]).toEqual(['asc', 'desc', null]);
  });
});
