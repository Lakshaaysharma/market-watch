import { ClientMessage, ServerMessage } from '@market/shared';
import { MarketStore } from '../store/market-store';
import { MarketSocket, SocketLike } from '../transport/market-socket';

export class FakeSocket implements SocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  readonly sent: ClientMessage[] = [];

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(): void {
    this.readyState = 3;
  }

  /** Simulates the server accepting the connection. */
  accept(symbols: string[]): void {
    this.readyState = 1;
    this.onopen?.();
    this.receive({ t: 'hello', tickMs: 500, maxSymbols: 500, stocks: symbols.map((symbol) => ({ symbol, name: symbol })) });
  }

  receive(message: ServerMessage): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  drop(): void {
    this.readyState = 3;
    this.onclose?.();
  }
}

export function createHarness() {
  const store = new MarketStore();
  const sockets: FakeSocket[] = [];
  const frames: (() => void)[] = [];
  const socket = new MarketSocket({
    url: 'ws://test',
    store,
    createSocket: () => {
      const fake = new FakeSocket();
      sockets.push(fake);
      return fake;
    },
    scheduleFrame: (callback) => frames.push(callback),
  });
  const runFrames = () => frames.splice(0).forEach((frame) => frame());
  return { store, socket, sockets, frames, runFrames, latest: () => sockets.at(-1)! };
}
