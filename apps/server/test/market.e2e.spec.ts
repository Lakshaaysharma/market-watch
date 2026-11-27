import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { ClientMessage, ServerMessage, WS_PATH } from '@market/shared';
import { WebSocket } from 'ws';
import { createApp } from '../src/create-app';

class TestClient {
  readonly messages: ServerMessage[] = [];
  private constructor(private readonly socket: WebSocket) {
    socket.on('message', (data) => this.messages.push(JSON.parse(data.toString())));
  }

  static async connect(url: string): Promise<TestClient> {
    const socket = new WebSocket(url);
    const client = new TestClient(socket);
    await new Promise((resolve, reject) => socket.once('open', resolve).once('error', reject));
    return client;
  }

  send(message: ClientMessage | string): void {
    this.socket.send(typeof message === 'string' ? message : JSON.stringify(message));
  }

  async waitFor(predicate: (messages: ServerMessage[]) => boolean, timeoutMs = 3000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate(this.messages)) {
      if (Date.now() > deadline) throw new Error(`Timed out; got ${this.messages.map((m) => m.t).join(',')}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  symbols(type: 'tick' | 'snapshot', from = 0): Set<string> {
    return new Set(this.messages.slice(from).flatMap((m) => (m.t === type ? m.d.map(([symbol]) => symbol) : [])));
  }

  count(type: ServerMessage['t'], from = 0): number {
    return this.messages.slice(from).filter((m) => m.t === type).length;
  }

  close(): void {
    this.socket.close();
  }
}

describe('Market feed (end to end)', () => {
  let app: INestApplication;
  let url: string;
  let http: string;

  beforeAll(async () => {
    Object.assign(process.env, { TICK_MS: '40', UPDATE_RATIO: '1', MAX_SYMBOLS_PER_CLIENT: '5' });
    app = await createApp({ logger: false });
    await app.listen(0, '127.0.0.1');
    http = await app.getUrl();
    url = http.replace('http', 'ws') + WS_PATH;
  });

  afterAll(() => app.close());

  it('greets, sends a snapshot, then ticks for subscribed stocks only', async () => {
    const [a, b] = await Promise.all([TestClient.connect(url), TestClient.connect(url)]);
    a.send({ t: 'subscribe', symbols: ['TCS', 'INFY'] });
    b.send({ t: 'subscribe', symbols: ['SBIN'] });
    await a.waitFor(() => a.count('tick') >= 4);
    await b.waitFor(() => b.count('tick') >= 4);
    expect(a.messages.map((m) => m.t).slice(0, 2)).toEqual(['hello', 'snapshot']);
    expect([...a.symbols('tick')].sort()).toEqual(['INFY', 'TCS']);
    expect([...b.symbols('tick')]).toEqual(['SBIN']);
    a.close();
    b.close();
  });

  it('stops sending a stock after unsubscribe without affecting others', async () => {
    const [a, b] = await Promise.all([TestClient.connect(url), TestClient.connect(url)]);
    a.send({ t: 'subscribe', symbols: ['TCS', 'INFY'] });
    b.send({ t: 'subscribe', symbols: ['TCS'] });
    await a.waitFor(() => a.count('tick') >= 2);
    a.send({ t: 'unsubscribe', symbols: ['TCS'] });
    a.send({ t: 'ping' });
    await a.waitFor(() => a.count('pong') === 1);
    const mark = a.messages.length;
    const otherMark = b.messages.length;
    await a.waitFor(() => a.count('tick', mark) >= 3);
    expect([...a.symbols('tick', mark)]).toEqual(['INFY']);
    expect([...b.symbols('tick', otherMark)]).toEqual(['TCS']);
    a.close();
    b.close();
  });

  it('rejects bad input and enforces the subscription limit', async () => {
    const client = await TestClient.connect(url);
    client.send('not json');
    client.send('{"t":"subscribe","symbols":"TCS"}');
    client.send({ t: 'subscribe', symbols: ['NOPE'] });
    client.send({ t: 'subscribe', symbols: ['TCS', 'INFY', 'SBIN', 'ITC', 'WIPRO', 'LT'] });
    await client.waitFor(() => client.count('error') === 4);
    expect(client.messages.flatMap((m) => (m.t === 'error' ? [m.code] : []))).toEqual([
      'BAD_MESSAGE', 'BAD_MESSAGE', 'UNKNOWN_SYMBOL', 'LIMIT_EXCEEDED',
    ]);
    expect(client.count('snapshot')).toBe(0);
    client.close();
  });

  it('answers a resync with a full snapshot', async () => {
    const client = await TestClient.connect(url);
    client.send({ t: 'subscribe', symbols: ['TCS'] });
    await client.waitFor(() => client.count('snapshot') === 1);
    client.send({ t: 'resync' });
    await client.waitFor(() => client.count('snapshot') === 2);
    client.close();
  });

  it('releases subscriptions when a client leaves', async () => {
    const client = await TestClient.connect(url);
    client.send({ t: 'subscribe', symbols: ['TCS'] });
    await client.waitFor(() => client.count('snapshot') === 1);
    client.close();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const metrics = await (await fetch(`${http}/api/metrics`)).json();
    expect(metrics).toMatchObject({ clients: 0, subscriptions: 0 });
  });
});
