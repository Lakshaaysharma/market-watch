/**
 * Connects many clients, each watching its own random set of stocks, and
 * measures delivery. Fails (exit code 1) if any client receives a stock it did
 * not ask for, misses its data, or is disconnected.
 *
 *   npm run load-test -- --clients 50 --duration 20 --min 5 --max 20
 */
import { ClientMessage, ServerMessage, StockInfo, WS_PATH } from '@market/shared';
import { parseArgs } from 'node:util';
import { WebSocket } from 'ws';

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://127.0.0.1:3000' },
    clients: { type: 'string', default: '50' },
    duration: { type: 'string', default: '20' },
    min: { type: 'string', default: '5' },
    max: { type: 'string', default: '20' },
  },
});
const http = values.url!.replace(/\/$/, '');
const clientCount = Number(values.clients);
const durationMs = Number(values.duration) * 1000;
const minSymbols = Number(values.min);
const maxSymbols = Number(values.max);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const getJson = async <T>(path: string): Promise<T> => (await fetch(http + path)).json() as Promise<T>;

interface Metrics {
  clients: number;
  subscriptions: number;
  cpuSeconds: number;
  fanOutMs: { average: number; max: number };
  ticksSkippedForSlowClients: number;
  slowClientsDisconnected: number;
  memoryMb: { rss: number };
  eventLoopDelayMs: { p99: number };
}

const totals = { messages: 0, bytes: 0, updates: 0, violations: 0, disconnects: 0, resubscribed: 0 };
const latencies: number[] = [];
let measuring = false;
let finishing = false;

function pick(symbols: string[], count: number): string[] {
  const pool = [...symbols];
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

class Client {
  private wanted: Set<string>;
  /** Symbols the server may still send: widened until a change is acknowledged. */
  private allowed: Set<string>;
  readonly snapshotSymbols = new Set<string>();
  ticks = 0;
  private socket!: WebSocket;

  constructor(private readonly catalog: string[]) {
    this.wanted = new Set(this.randomSelection());
    this.allowed = new Set(this.wanted);
  }

  private randomSelection(): string[] {
    const upper = Math.min(maxSymbols, this.catalog.length);
    const lower = Math.min(minSymbols, upper);
    return pick(this.catalog, lower + Math.floor(Math.random() * (upper - lower + 1)));
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(http.replace(/^http/, 'ws') + WS_PATH);
      this.socket.once('error', reject);
      this.socket.on('close', () => {
        if (!finishing) totals.disconnects += 1;
      });
      this.socket.on('message', (raw) => {
        const text = raw.toString();
        const message = JSON.parse(text) as ServerMessage;
        if (message.t === 'hello') {
          this.send({ t: 'subscribe', symbols: [...this.wanted] });
          resolve();
        } else if (message.t === 'pong') {
          this.allowed = new Set(this.wanted); // earlier changes are now in force
        } else if (message.t === 'tick' || message.t === 'snapshot') {
          for (const [symbol] of message.d) {
            if (!this.allowed.has(symbol)) totals.violations += 1;
            if (message.t === 'snapshot') this.snapshotSymbols.add(symbol);
          }
          if (message.t === 'tick') {
            this.ticks += 1;
            if (measuring) {
              totals.messages += 1;
              totals.bytes += text.length;
              totals.updates += message.d.length;
              latencies.push(Date.now() - message.ts);
            }
          }
        }
      });
    });
  }

  /** Swaps the whole selection while data is flowing. */
  reselect(): void {
    const previous = [...this.wanted];
    this.wanted = new Set(this.randomSelection());
    this.allowed = new Set([...previous, ...this.wanted]);
    this.send({ t: 'unsubscribe', symbols: previous.filter((s) => !this.wanted.has(s)) });
    this.send({ t: 'subscribe', symbols: [...this.wanted] });
    this.send({ t: 'ping' });
    totals.resubscribed += 1;
  }

  get missingData(): boolean {
    return [...this.wanted].some((symbol) => !this.snapshotSymbols.has(symbol));
  }

  close(): void {
    this.socket.close();
  }

  private send(message: ClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }
}

async function main(): Promise<void> {
  const catalog = (await getJson<StockInfo[]>('/api/stocks')).map((stock) => stock.symbol);
  const clients = Array.from({ length: clientCount }, () => new Client(catalog));
  for (let i = 0; i < clients.length; i += 25) {
    await Promise.all(clients.slice(i, i + 25).map((client) => client.connect()));
  }
  await sleep(2000); // warm up

  const before = await getJson<Metrics>('/api/metrics');
  const startedAt = Date.now();
  measuring = true;
  await sleep(durationMs / 2);
  clients.filter((_, i) => i % 5 === 0).forEach((client) => client.reselect());
  await sleep(durationMs / 2);
  measuring = false;
  const seconds = (Date.now() - startedAt) / 1000;
  const after = await getJson<Metrics>('/api/metrics');

  const starved = clients.filter((client) => client.ticks === 0 || client.missingData).length;
  finishing = true;
  clients.forEach((client) => client.close());

  latencies.sort((a, b) => a - b);
  const percentile = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))] ?? NaN;
  const rows: [string, string | number][] = [
    ['Clients connected', after.clients],
    ['Stocks available', catalog.length],
    ['Subscriptions', after.subscriptions],
    ['Measured for', `${seconds.toFixed(1)} s`],
    ['Tick messages per second', Math.round(totals.messages / seconds)],
    ['Stock updates per second', Math.round(totals.updates / seconds)],
    ['Data sent', `${(totals.bytes / seconds / 1048576).toFixed(2)} MB/s`],
    ['Latency p50 / p95 / p99 / max', `${percentile(50)} / ${percentile(95)} / ${percentile(99)} / ${latencies.at(-1)} ms`],
    ['Server CPU (one core = 100%)', `${(((after.cpuSeconds - before.cpuSeconds) / seconds) * 100).toFixed(1)}%`],
    ['Server memory (RSS)', `${after.memoryMb.rss} MB`],
    ['Fan-out time per tick, average / max', `${after.fanOutMs.average} / ${after.fanOutMs.max} ms`],
    ['Event-loop delay p99', `${after.eventLoopDelayMs.p99} ms`],
    ['Ticks skipped for slow clients', after.ticksSkippedForSlowClients],
    ['Clients that changed selection', totals.resubscribed],
    ['Wrong-stock deliveries', totals.violations],
    ['Clients missing data', starved],
    ['Unexpected disconnects', totals.disconnects],
  ];
  console.log('| Measure | Result |\n|---|---|');
  for (const [name, value] of rows) console.log(`| ${name} | ${value} |`);

  const passed = totals.violations === 0 && starved === 0 && totals.disconnects === 0 && after.clients >= clientCount;
  console.log(`\n${passed ? 'PASS' : 'FAIL'}: ${clientCount} concurrent clients`);
  process.exit(passed ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
