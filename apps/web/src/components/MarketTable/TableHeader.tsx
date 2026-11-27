import { memo } from 'react';
import { Sort, SortKey } from '../../utils/sort';
import { Column, STICKY_COUNT } from './columns';
import styles from './MarketTable.module.css';

interface Props {
  columns: readonly Column[];
  sort: Sort | null;
  onSort: (key: SortKey) => void;
}

export const TableHeader = memo(function TableHeader({ columns, sort, onSort }: Props) {
  return (
    <thead>
      <tr>
        {columns.map((column, index) => {
          const direction = column.sortKey && sort?.key === column.sortKey ? sort.direction : null;
          return (
            <th
              key={column.id}
              scope="col"
              data-column={column.id}
              className={index < STICKY_COUNT ? styles[`sticky${index}`] : undefined}
              aria-sort={direction ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
            >
              {column.sortKey ? (
                <button type="button" className={styles.sort} onClick={() => onSort(column.sortKey!)}>
                  {column.label}
                  <svg viewBox="0 0 10 16" data-direction={direction ?? 'none'} aria-hidden="true">
                    <path className={styles.sortUp} d="M5 1.5 9 6.5H1z" />
                    <path className={styles.sortDown} d="M5 14.5 1 9.5h8z" />
                  </svg>
                </button>
              ) : (
                column.label
              )}
            </th>
          );
        })}
        {/* Absorbs spare width so the other columns keep their exact size. */}
        <th aria-hidden="true" />
      </tr>
    </thead>
  );
});
