import { useEffect, useState } from 'react';
import { useMarket } from '../app/market-context';
import { renderStats } from './render-stats';
import styles from './DebugPanel.module.css';

/** Per-second render activity, shown when the URL contains `?debug`. */
export function DebugPanel() {
  const { socket } = useMarket();
  const [sample, setSample] = useState({ messages: 0, changedFields: 0, cell: 0, row: 0, table: 0 });

  useEffect(() => {
    let previous = { ...socket.stats, ...renderStats.counts };
    const timer = setInterval(() => {
      const now = { ...socket.stats, ...renderStats.counts };
      setSample({
        messages: now.messages - previous.messages,
        changedFields: now.changedFields - previous.changedFields,
        cell: now.cell - previous.cell,
        row: now.row - previous.row,
        table: now.table - previous.table,
      });
      previous = now;
    }, 1000);
    return () => clearInterval(timer);
  }, [socket]);

  return (
    <aside className={styles.panel} aria-label="Render statistics">
      <strong>Last second</strong>
      <span>messages {sample.messages}</span>
      <span>fields changed {sample.changedFields}</span>
      <span>cell renders {sample.cell}</span>
      <span>row renders {sample.row}</span>
      <span>table renders {sample.table}</span>
    </aside>
  );
}
