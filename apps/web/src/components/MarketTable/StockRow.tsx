import { memo } from 'react';
import { useRenderCount } from '../../debug/render-stats';
import { PercentCell, ValueCell } from './cells';
import { Column, STICKY_COUNT } from './columns';
import styles from './MarketTable.module.css';

interface Props {
  symbol: string;
  name: string;
  columns: readonly Column[];
}

/** Static structure of a row. Live values are handled by the cells themselves. */
export const StockRow = memo(function StockRow({ symbol, name, columns }: Props) {
  useRenderCount('row');
  return (
    <tr data-symbol={symbol}>
      {columns.map((column, index) => {
        const sticky = index < STICKY_COUNT ? styles[`sticky${index}`] : '';
        switch (column.kind) {
          case 'symbol':
            return (
              <th key={column.id} scope="row" className={`${styles.symbol} ${sticky}`}>
                {symbol}
              </th>
            );
          case 'company':
            return (
              <td key={column.id} className={`${styles.company} ${sticky}`}>
                <span>{name}</span>
              </td>
            );
          case 'percent':
            return <PercentCell key={column.id} symbol={symbol} />;
          case 'spacer':
            return <td key={column.id} aria-hidden="true" />;
          case 'value':
            return (
              <ValueCell
                key={column.id}
                symbol={symbol}
                field={column.field}
                format={column.format}
                signed={column.signed}
                className={`${column.strong ? styles.strong : ''} ${sticky}`}
              />
            );
        }
      })}
      <td aria-hidden="true" />
    </tr>
  );
});
