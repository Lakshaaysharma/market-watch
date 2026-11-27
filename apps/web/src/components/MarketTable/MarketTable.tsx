import { CSSProperties, memo, UIEvent, useCallback, useMemo, useState } from 'react';
import { useMarket } from '../../app/market-context';
import { useRenderCount } from '../../debug/render-stats';
import { Layout } from '../../hooks/useLayout';
import { useSortedSymbols } from '../../hooks/useSortedSymbols';
import { nextSort, Sort, SortKey } from '../../utils/sort';
import { columnsFor } from './columns';
import styles from './MarketTable.module.css';
import { StockRow } from './StockRow';
import { TableHeader } from './TableHeader';

interface Props {
  symbols: readonly string[];
  names: ReadonlyMap<string, string>;
  layout: Layout;
  stale?: boolean;
}

/** Toggled on the DOM node directly: scrolling must not re-render anything. */
const markScrolled = (event: UIEvent<HTMLDivElement>) => {
  event.currentTarget.dataset.scrolled = String(event.currentTarget.scrollLeft > 0);
};

export const MarketTable = memo(function MarketTable({ symbols, names, layout, stale }: Props) {
  const { store } = useMarket();
  const [sort, setSort] = useState<Sort | null>(null);
  const order = useSortedSymbols(symbols, sort, store);
  const columns = columnsFor(layout);
  const onSort = useCallback((key: SortKey) => setSort((current) => nextSort(current, key)), []);
  useRenderCount('table');

  const style = useMemo(() => {
    const total = columns.reduce((sum, column) => sum + column.width[layout], 0);
    return {
      minWidth: total,
      '--col-1': `${columns[0]!.width[layout]}px`,
      '--col-2': `${columns[1]!.width[layout]}px`,
    } as CSSProperties;
  }, [columns, layout]);

  return (
    <div className={styles.scroller} onScroll={markScrolled} data-stale={stale} tabIndex={0} role="region" aria-label="Market data">
      <table className={styles.table} style={style}>
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={{ width: column.width[layout] }} />
          ))}
          <col />
        </colgroup>
        <TableHeader columns={columns} sort={sort} onSort={onSort} />
        <tbody>
          {order.map((symbol) => (
            <StockRow key={symbol} symbol={symbol} name={names.get(symbol) ?? ''} columns={columns} />
          ))}
        </tbody>
      </table>
      {symbols.length === 0 && <p className={styles.empty}>No stocks selected. Use “Select Stocks” to start watching.</p>}
    </div>
  );
});
