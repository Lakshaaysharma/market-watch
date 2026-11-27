import { describe, expect, it, vi } from 'vitest';
import { quote } from '../test/fixtures';
import { MarketStore } from './market-store';

describe('MarketStore', () => {
  it('notifies only the fields that changed', () => {
    const store = new MarketStore();
    store.apply([['TCS', quote(), true], ['INFY', quote(), true]]);
    const tcsLtp = vi.fn();
    const tcsHigh = vi.fn();
    const infyLtp = vi.fn();
    store.subscribe('TCS', 'ltp', tcsLtp);
    store.subscribe('TCS', 'high', tcsHigh);
    store.subscribe('INFY', 'ltp', infyLtp);

    expect(store.apply([['TCS', { ltp: 101, high: 110 }, false]])).toBe(1);
    expect(tcsLtp).toHaveBeenCalledTimes(1);
    expect(tcsHigh).not.toHaveBeenCalled();
    expect(infyLtp).not.toHaveBeenCalled();
  });

  it('treats an identical snapshot as no change', () => {
    const store = new MarketStore();
    store.apply([['TCS', quote(), true]]);
    expect(store.apply([['TCS', quote(), true]])).toBe(0);
  });

  it('ignores a delta for a stock it has no snapshot of', () => {
    const store = new MarketStore();
    expect(store.apply([['TCS', { ltp: 5 }, false]])).toBe(0);
    expect(store.get('TCS')).toBeUndefined();
  });

  it('stops notifying after unsubscribe', () => {
    const store = new MarketStore();
    const listener = vi.fn();
    store.subscribe('TCS', 'ltp', listener)();
    store.apply([['TCS', quote(), true]]);
    expect(listener).not.toHaveBeenCalled();
  });
});
