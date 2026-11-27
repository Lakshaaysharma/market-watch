import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MarketContext } from '../../app/market-context';
import { renderStats } from '../../debug/render-stats';
import { createHarness } from '../../test/fake-socket';
import { quote } from '../../test/fixtures';
import { COLUMNS } from './columns';
import { MarketTable } from './MarketTable';

const names = new Map([['TCS', 'Tata'], ['INFY', 'Infosys'], ['SBIN', 'SBI']]);
const LIVE_CELLS_PER_ROW = COLUMNS.filter((c) => c.kind === 'value' || c.kind === 'percent').length;

/** These tests are the proof of the assignment's key performance requirement. */
describe('MarketTable rendering', () => {
  beforeEach(() => {
    renderStats.enabled = true;
  });
  afterEach(() => {
    cleanup();
    renderStats.enabled = false;
  });

  function mount(symbols: string[]) {
    const { store, socket } = createHarness();
    store.apply([...names.keys()].map((s) => [s, quote(), true]));
    const market = { store, socket }; // one stable object, as in main.tsx
    const view = (list: string[]) => (
      <MarketContext.Provider value={market}>
        <MarketTable symbols={list} names={names} layout="desktop" />
      </MarketContext.Provider>
    );
    const result = render(view(symbols));
    renderStats.reset();
    const cell = (symbol: string, field: string) => result.container.querySelector(`tr[data-symbol="${symbol}"] td[data-field="${field}"]`)!;
    return { store, cell, rerender: (list: string[]) => result.rerender(view(list)), container: result.container };
  }

  it('re-renders exactly the one cell whose value changed', () => {
    const { store, cell } = mount(['TCS', 'INFY', 'SBIN']);
    act(() => void store.apply([['INFY', { ltp: 101.5 }, false]]));
    expect(cell('INFY', 'ltp').textContent).toBe('₹ 101.50');
    expect(renderStats.counts).toEqual({ table: 0, row: 0, cell: 1 });
  });

  it('re-renders one cell per changed field across rows', () => {
    const { store } = mount(['TCS', 'INFY', 'SBIN']);
    act(() => void store.apply([['TCS', { ltp: 102, pct: 3, chg: 3 }, false], ['SBIN', { bid: 98 }, false]]));
    expect(renderStats.counts).toEqual({ table: 0, row: 0, cell: 4 });
  });

  it('does not re-render when the change is too small to be visible', () => {
    const { store } = mount(['TCS']);
    act(() => void store.apply([['TCS', { vol: 12_500_400 }, false]])); // still "12.5M"
    expect(renderStats.counts.cell).toBe(0);
  });

  it('does nothing for stocks that are not on screen', () => {
    const { store } = mount(['TCS']);
    act(() => void store.apply([['INFY', { ltp: 999 }, false]]));
    expect(renderStats.counts).toEqual({ table: 0, row: 0, cell: 0 });
  });

  it('renders only the new row when a stock is added', () => {
    const { rerender } = mount(['TCS', 'INFY']);
    rerender(['TCS', 'INFY', 'SBIN']);
    expect(renderStats.counts).toEqual({ table: 1, row: 1, cell: LIVE_CELLS_PER_ROW });
  });

  it('renders no rows or cells when a stock is removed', () => {
    const { rerender, container } = mount(['TCS', 'INFY', 'SBIN']);
    rerender(['TCS', 'SBIN']);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(renderStats.counts).toEqual({ table: 1, row: 0, cell: 0 });
  });
});
