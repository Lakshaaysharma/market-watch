import '@fontsource-variable/inter';
import './styles/global.css';
import { WS_PATH } from '@market/shared';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { MarketContext } from './app/market-context';
import { renderStats } from './debug/render-stats';
import { MarketStore } from './store/market-store';
import { MarketSocket } from './transport/market-socket';

renderStats.enabled = new URLSearchParams(location.search).has('debug');

const url = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${WS_PATH}`;
const store = new MarketStore();
const market = { store, socket: new MarketSocket({ url, store }) };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MarketContext.Provider value={market}>
      <App />
    </MarketContext.Provider>
  </StrictMode>,
);
