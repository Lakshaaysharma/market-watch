import { ClientMessage, QuoteDelta, ServerMessage, StockInfo } from '@market/shared';
import { MarketStore } from '../store/market-store';

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

/** Rarely-changing connection state, safe to render from. */
export interface FeedState {
  status: ConnectionStatus;
  stocks: readonly StockInfo[];
  maxSymbols: number;
}

export interface SocketLike {
  readyState: number;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  send(data: string): void;
  close(): void;
}

export interface MarketSocketOptions {
  url: string;
  store: MarketStore;
  createSocket?: (url: string) => SocketLike;
  /** Runs the callback before the next paint. */
  scheduleFrame?: (callback: () => void) => void;
}

const OPEN = 1;
const PING_MS = 15_000;
const SILENCE_LIMIT_MS = 35_000;
const MAX_BACKOFF_MS = 10_000;

/**
 * Owns the WebSocket: keeps the server's subscriptions equal to the selection,
 * reconnects when needed, and applies incoming data at most once per frame.
 */
export class MarketSocket {
  private readonly store: MarketStore;
  private readonly url: string;
  private readonly createSocket: (url: string) => SocketLike;
  private readonly scheduleFrame: (callback: () => void) => void;

  private socket: SocketLike | null = null;
  private desired = new Set<string>();
  /** Updates merged per stock while waiting for the next frame. */
  private pending = new Map<string, { data: QuoteDelta; isSnapshot: boolean }>();
  private frameRequested = false;
  private attempts = 0;
  private lastMessageAt = 0;
  private running = false;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private pingTimer?: ReturnType<typeof setInterval>;

  private state: FeedState = { status: 'connecting', stocks: [], maxSymbols: Number.POSITIVE_INFINITY };
  private readonly stateListeners = new Set<() => void>();

  /** Counters read by the debug panel. */
  readonly stats = { messages: 0, changedFields: 0 };

  constructor(options: MarketSocketOptions) {
    this.url = options.url;
    this.store = options.store;
    this.createSocket = options.createSocket ?? ((url) => new WebSocket(url) as unknown as SocketLike);
    this.scheduleFrame = options.scheduleFrame ?? ((callback) => requestAnimationFrame(callback));
  }

  getState = (): FeedState => this.state;

  subscribeState = (listener: () => void): (() => void) => {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.pingTimer = setInterval(() => this.checkAlive(), PING_MS);
    this.connect();
  }

  stop(): void {
    this.running = false;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    clearInterval(this.pingTimer);
    clearTimeout(this.retryTimer);
    this.dropSocket();
  }

  /** Sends only the difference between the old and the new selection. */
  setSymbols(symbols: readonly string[]): void {
    const next = new Set(symbols);
    const added = symbols.filter((symbol) => !this.desired.has(symbol));
    const removed = [...this.desired].filter((symbol) => !next.has(symbol));
    this.desired = next;
    for (const symbol of removed) {
      this.pending.delete(symbol);
      this.store.remove(symbol);
    }
    if (removed.length) this.send({ t: 'unsubscribe', symbols: removed });
    if (added.length && this.state.stocks.length) this.subscribe(added);
  }

  /** The refresh button: fetch a new snapshot, or reconnect immediately. */
  refresh(): void {
    if (this.socket?.readyState === OPEN) this.send({ t: 'resync' });
    else if (this.running) this.reconnectNow();
  }

  private connect(): void {
    clearTimeout(this.retryTimer);
    this.dropSocket();
    const socket = this.createSocket(this.url);
    this.socket = socket;
    this.lastMessageAt = Date.now();
    socket.onopen = () => (this.lastMessageAt = Date.now());
    socket.onmessage = (event) => this.receive(String(event.data));
    socket.onclose = () => this.handleClose();
  }

  private dropSocket(): void {
    const socket = this.socket;
    if (!socket) return;
    socket.onopen = socket.onclose = socket.onmessage = null;
    socket.close();
    this.socket = null;
  }

  private handleClose(): void {
    this.socket = null;
    if (!this.running) return;
    this.setState({ status: navigator.onLine === false ? 'offline' : 'reconnecting' });
    const base = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.attempts);
    this.attempts += 1;
    // Jitter stops many clients reconnecting at the same instant.
    this.retryTimer = setTimeout(() => this.connect(), base * (0.75 + Math.random() * 0.5));
  }

  private reconnectNow(): void {
    this.attempts = 0;
    this.setState({ status: 'reconnecting' });
    this.connect();
  }

  private handleOnline = (): void => this.reconnectNow();

  private handleOffline = (): void => {
    clearTimeout(this.retryTimer);
    this.dropSocket();
    this.setState({ status: 'offline' });
  };

  /** Detects half-open connections, common after a phone sleeps. */
  private checkAlive(): void {
    if (this.socket?.readyState !== OPEN) return;
    if (Date.now() - this.lastMessageAt > SILENCE_LIMIT_MS) {
      this.dropSocket();
      this.handleClose();
    } else {
      this.send({ t: 'ping' });
    }
  }

  private receive(raw: string): void {
    this.lastMessageAt = Date.now();
    this.stats.messages += 1;
    let message: ServerMessage;
    try {
      message = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    switch (message.t) {
      case 'hello': {
        this.attempts = 0;
        this.setState({ status: 'live', stocks: message.stocks, maxSymbols: message.maxSymbols });
        const known = new Set(message.stocks.map((stock) => stock.symbol));
        this.subscribe([...this.desired].filter((symbol) => known.has(symbol)));
        break;
      }
      case 'snapshot':
      case 'tick':
        this.enqueue(message);
        break;
      case 'error':
        console.warn(`[market] ${message.code}: ${message.message}`);
        break;
    }
  }

  private subscribe(symbols: string[]): void {
    const known = new Set(this.state.stocks.map((stock) => stock.symbol));
    const valid = symbols.filter((symbol) => known.has(symbol));
    if (valid.length) this.send({ t: 'subscribe', symbols: valid });
  }

  private enqueue(message: Extract<ServerMessage, { t: 'snapshot' | 'tick' }>): void {
    const isSnapshot = message.t === 'snapshot';
    for (const [symbol, data] of message.d) {
      if (!this.desired.has(symbol)) continue; // in flight when deselected
      const queued = this.pending.get(symbol);
      if (queued && !isSnapshot) Object.assign(queued.data, data);
      else this.pending.set(symbol, { data: { ...data }, isSnapshot });
    }
    if (this.frameRequested || this.pending.size === 0) return;
    this.frameRequested = true;
    this.scheduleFrame(() => this.flush());
  }

  /** In a background tab frames pause; updates keep merging, so memory is bounded. */
  private flush(): void {
    this.frameRequested = false;
    const batch = this.pending;
    this.pending = new Map();
    this.stats.changedFields += this.store.apply(
      Array.from(batch, ([symbol, { data, isSnapshot }]) => [symbol, data, isSnapshot] as [string, QuoteDelta, boolean]),
    );
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === OPEN) this.socket.send(JSON.stringify(message));
  }

  private setState(patch: Partial<FeedState>): void {
    this.state = { ...this.state, ...patch };
    this.stateListeners.forEach((listener) => listener());
  }
}
