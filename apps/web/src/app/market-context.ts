import { createContext, useContext, useSyncExternalStore } from 'react';
import { MarketStore } from '../store/market-store';
import { FeedState, MarketSocket } from '../transport/market-socket';

export interface Market {
  store: MarketStore;
  socket: MarketSocket;
}

export const MarketContext = createContext<Market | null>(null);

export function useMarket(): Market {
  const market = useContext(MarketContext);
  if (!market) throw new Error('MarketContext is missing');
  return market;
}

export function useFeedState(): FeedState {
  const { socket } = useMarket();
  return useSyncExternalStore(socket.subscribeState, socket.getState);
}
