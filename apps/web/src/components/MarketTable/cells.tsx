import { QuoteField } from '@market/shared';
import { memo, useRef } from 'react';
import { useRenderCount } from '../../debug/render-stats';
import { useQuoteValue } from '../../hooks/useQuoteValue';
import { formatPercent, trendOf } from '../../utils/format';
import styles from './MarketTable.module.css';

const Skeleton = () => <span className={styles.skeleton} aria-label="Loading" />;

interface ValueCellProps {
  symbol: string;
  field: QuoteField;
  format: (value: number) => string;
  className?: string;
  signed?: boolean;
}

/** Re-renders only when its own formatted text changes. */
export const ValueCell = memo(function ValueCell({ symbol, field, format, className, signed }: ValueCellProps) {
  const ref = useRef<HTMLTableCellElement>(null);
  const text = useQuoteValue(symbol, field, format);
  useRenderCount('cell', ref);
  const trend = signed && text ? (text.startsWith('+') ? 'up' : text.startsWith('-') ? 'down' : 'flat') : undefined;
  return (
    <td ref={ref} className={className} data-field={field} data-trend={trend}>
      {text ?? <Skeleton />}
    </td>
  );
});

export const PercentCell = memo(function PercentCell({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLTableCellElement>(null);
  const text = useQuoteValue(symbol, 'pct', formatPercent);
  useRenderCount('cell', ref);
  const trend = text ? trendOf(parseFloat(text)) : 'flat';
  return (
    <td ref={ref} className={styles.percent} data-field="pct" data-trend={trend}>
      {text ? (
        <>
          <i className={styles.arrow} aria-hidden="true" />
          {text}
        </>
      ) : (
        <Skeleton />
      )}
    </td>
  );
});
