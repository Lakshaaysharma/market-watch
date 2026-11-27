import { memo, useEffect, useState } from 'react';
import { ConnectionStatus } from '../../transport/market-socket';
import { formatDate, formatTime } from '../../utils/format';
import styles from './Header.module.css';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting',
  live: 'Live',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
};

/** Isolated so that its one-second tick re-renders nothing else. */
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return (
    <time className={styles.clock} dateTime={now.toISOString()}>
      <span>{formatDate(now)}</span>
      <span>{formatTime(now)}</span>
    </time>
  );
}

interface Props {
  status: ConnectionStatus;
  onRefresh: () => void;
}

export const Header = memo(function Header({ status, onRefresh }: Props) {
  const [spin, setSpin] = useState(0);
  return (
    <header className={styles.header}>
      <svg className={styles.logo} viewBox="0 0 48 46" aria-hidden="true">
        <g fill="currentColor">
          <rect x="1" y="32" width="12" height="13" rx="1.5" />
          <rect x="18" y="26" width="12" height="19" rx="1.5" />
          <rect x="35" y="19" width="12" height="26" rx="1.5" />
        </g>
        <path d="M3 24 18 12l8 7L43 4M32 3h12v12" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h1 className={styles.title}>Market Watch</h1>
      <div className={styles.meta}>
        <span className={styles.status} data-status={status} role="status">
          <i aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
        <span className={styles.divider} aria-hidden="true" />
        <Clock />
        <button
          type="button"
          className={styles.refresh}
          aria-label="Refresh prices"
          onClick={() => {
            setSpin((turns) => turns + 1);
            onRefresh();
          }}
        >
          <svg viewBox="0 0 24 24" style={{ transform: `rotate(${spin * 360}deg)` }} aria-hidden="true">
            <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
            <path d="M18.6 1.9v4.6H14" />
          </svg>
        </button>
      </div>
    </header>
  );
});
