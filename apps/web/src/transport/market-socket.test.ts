import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness } from '../test/fake-socket';
import { quote } from '../test/fixtures';

const ALL = ['TCS', 'INFY', 'SBIN'];

describe('MarketSocket', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const started = (selection: string[]) => {
    const h = createHarness();
    h.socket.setSymbols(selection);
    h.socket.start();
    h.latest().accept(ALL);
    return h;
  };

  it('subscribes to the selection, then sends only differences', () => {
    const h = started(['TCS', 'INFY']);
    h.socket.setSymbols(['INFY', 'SBIN']);
    expect(h.latest().sent).toEqual([
      { t: 'subscribe', symbols: ['TCS', 'INFY'] },
      { t: 'unsubscribe', symbols: ['TCS'] },
      { t: 'subscribe', symbols: ['SBIN'] },
    ]);
    h.socket.stop();
  });

  it('merges every message of a frame into one store update', () => {
    const h = started(['TCS']);
    const apply = vi.spyOn(h.store, 'apply');
    h.latest().receive({ t: 'snapshot', ts: 1, d: [['TCS', quote()]] });
    h.latest().receive({ t: 'tick', ts: 2, d: [['TCS', { ltp: 101 }]] });
    h.latest().receive({ t: 'tick', ts: 3, d: [['TCS', { ltp: 102, high: 112 }]] });
    expect(h.frames).toHaveLength(1);
    h.runFrames();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(h.store.get('TCS')).toMatchObject({ ltp: 102, high: 112, low: 90 });
    h.socket.stop();
  });

  it('ignores data that was in flight when a stock was removed', () => {
    const h = started(['TCS', 'INFY']);
    h.latest().receive({ t: 'snapshot', ts: 1, d: [['TCS', quote()], ['INFY', quote()]] });
    h.socket.setSymbols(['INFY']);
    h.latest().receive({ t: 'tick', ts: 2, d: [['TCS', { ltp: 7 }]] });
    h.runFrames();
    expect(h.store.get('TCS')).toBeUndefined();
    expect(h.store.get('INFY')).toBeDefined();
    h.socket.stop();
  });

  it('reconnects and restores the current selection', () => {
    const h = started(['TCS']);
    h.latest().drop();
    expect(h.socket.getState().status).toBe('reconnecting');
    h.socket.setSymbols(['TCS', 'SBIN']); // changed while disconnected
    vi.advanceTimersByTime(1000);
    expect(h.sockets).toHaveLength(2);
    h.latest().accept(ALL);
    expect(h.socket.getState().status).toBe('live');
    expect(h.latest().sent).toEqual([{ t: 'subscribe', symbols: ['TCS', 'SBIN'] }]);
    h.socket.stop();
  });

  it('asks for a fresh snapshot on refresh', () => {
    const h = started(['TCS']);
    h.socket.refresh();
    expect(h.latest().sent.at(-1)).toEqual({ t: 'resync' });
    h.socket.stop();
  });
});
