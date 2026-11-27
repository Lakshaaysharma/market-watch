import { ServerMessage } from '@market/shared';
import { loadConfig } from '../config/app-config';
import { MetricsService } from '../health/metrics.service';
import { Change } from '../simulator/market';
import { SimulatorService } from '../simulator/simulator.service';
import { SubscriptionRegistry } from '../subscriptions/subscription-registry';
import { BroadcasterService } from './broadcaster.service';

function fakeClient() {
  return {
    readyState: 1,
    bufferedAmount: 0,
    sent: [] as ServerMessage[],
    send(data: string) { this.sent.push(JSON.parse(data)); },
    terminate: jest.fn(),
  };
}

function setup() {
  const config = loadConfig({ HIGH_WATER_BYTES: '4096', MAX_LAG_MS: '1000' });
  const simulator = new SimulatorService(config);
  const registry = new SubscriptionRegistry();
  const metrics = new MetricsService();
  const broadcaster = new BroadcasterService(simulator, registry, metrics, config);
  const join = (...symbols: string[]) => {
    const client = fakeClient();
    registry.add(client);
    registry.subscribe(client, symbols);
    return client;
  };
  return { broadcaster, metrics, join };
}

describe('BroadcasterService', () => {
  let metricsToClose: MetricsService | undefined;
  afterEach(() => metricsToClose?.onApplicationShutdown());

  const changes: Change[] = [['TCS', { ltp: 1 }], ['INFY', { ltp: 2 }], ['SBIN', { ltp: 3 }]];
  const symbolsIn = (message: ServerMessage) => (message.t === 'tick' ? message.d.map(([symbol]) => symbol) : []);

  it('sends each client only its own stocks', () => {
    const { broadcaster, metrics, join } = setup();
    metricsToClose = metrics;
    const a = join('TCS', 'INFY');
    const b = join('SBIN');
    const idle = join('ITC');
    broadcaster.publish({ ts: 1, changes });
    expect(symbolsIn(a.sent[0]!)).toEqual(['TCS', 'INFY']);
    expect(symbolsIn(b.sent[0]!)).toEqual(['SBIN']);
    expect(idle.sent).toEqual([]);
  });

  it('skips a slow client, then resynchronises it with a snapshot', () => {
    const { broadcaster, metrics, join } = setup();
    metricsToClose = metrics;
    const slow = join('TCS');
    slow.bufferedAmount = 10_000;
    broadcaster.publish({ ts: 1, changes });
    broadcaster.publish({ ts: 2, changes });
    expect(slow.sent).toEqual([]);
    slow.bufferedAmount = 0;
    broadcaster.publish({ ts: 3, changes });
    expect(slow.sent.map((m) => m.t)).toEqual(['snapshot']);
    broadcaster.publish({ ts: 4, changes });
    expect(slow.sent.map((m) => m.t)).toEqual(['snapshot', 'tick']);
  });

  it('disconnects a client that never catches up', () => {
    const { broadcaster, metrics, join } = setup();
    metricsToClose = metrics;
    const stuck = join('TCS');
    stuck.bufferedAmount = 10_000;
    broadcaster.publish({ ts: 0, changes });
    broadcaster.publish({ ts: 5000, changes });
    expect(stuck.terminate).toHaveBeenCalledTimes(1);
    expect(metrics.slowClientsDisconnected).toBe(1);
  });
});
