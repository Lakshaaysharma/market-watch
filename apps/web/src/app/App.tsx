import { useCallback, useEffect, useMemo } from 'react';
import { Header } from '../components/Header/Header';
import { MarketTable } from '../components/MarketTable/MarketTable';
import { StockSelect } from '../components/StockSelect/StockSelect';
import { DebugPanel } from '../debug/DebugPanel';
import { renderStats } from '../debug/render-stats';
import { useLayout } from '../hooks/useLayout';
import { useSelection } from '../hooks/useSelection';
import styles from './App.module.css';
import { useFeedState, useMarket } from './market-context';

export function App() {
  const { socket } = useMarket();
  const { stocks, status, maxSymbols } = useFeedState();
  const layout = useLayout();
  const [selection, setSelection] = useSelection();

  const names = useMemo(() => new Map(stocks.map((stock) => [stock.symbol, stock.name])), [stocks]);
  // Saved symbols the server no longer knows are hidden once the list arrives.
  const visible = useMemo(
    () => (names.size ? selection.filter((symbol) => names.has(symbol)) : selection).slice(0, maxSymbols),
    [selection, names, maxSymbols],
  );

  useEffect(() => {
    // Deferred so that Strict Mode's immediate unmount never opens a throwaway socket.
    const timer = setTimeout(() => socket.start());
    return () => {
      clearTimeout(timer);
      socket.stop();
    };
  }, [socket]);

  useEffect(() => socket.setSymbols(visible), [socket, visible]);

  const refresh = useCallback(() => socket.refresh(), [socket]);
  const disconnected = status === 'reconnecting' || status === 'offline';

  return (
    <div className={styles.page}>
      <Header status={status} onRefresh={refresh} />
      <main className={styles.card}>
        <StockSelect stocks={stocks} selected={visible} onChange={setSelection} max={maxSymbols} chipLimit={layout === 'narrow' || layout === 'phone' ? 2 : 3} />
        {disconnected && (
          <p className={styles.banner} role="status">
            {status === 'offline' ? 'You are offline.' : 'Connection lost. Reconnecting…'} Prices shown may be out of date.
          </p>
        )}
        <MarketTable symbols={visible} names={names} layout={layout} stale={disconnected} />
      </main>
      {renderStats.enabled && <DebugPanel />}
    </div>
  );
}
