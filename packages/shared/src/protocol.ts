import type { Quote, QuoteDelta, StockInfo } from './quote';

export const WS_PATH = '/ws';

/** Client → server. */
export type ClientMessage =
  | { t: 'subscribe'; symbols: string[] }
  | { t: 'unsubscribe'; symbols: string[] }
  | { t: 'resync' }
  | { t: 'ping' };

export type ErrorCode = 'BAD_MESSAGE' | 'UNKNOWN_SYMBOL' | 'LIMIT_EXCEEDED';

/** Server → client. */
export type ServerMessage =
  /** Sent once per connection, before anything else. */
  | { t: 'hello'; tickMs: number; maxSymbols: number; stocks: StockInfo[] }
  /** Every field of the listed stocks. Sent after `subscribe` and `resync`. */
  | { t: 'snapshot'; ts: number; d: [symbol: string, quote: Quote][] }
  /** Only the fields that changed, only for subscribed stocks. */
  | { t: 'tick'; ts: number; d: [symbol: string, delta: QuoteDelta][] }
  | { t: 'pong'; ts: number }
  | { t: 'error'; code: ErrorCode; message: string };
