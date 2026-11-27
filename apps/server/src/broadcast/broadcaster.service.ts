import { Inject, Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Quote, ServerMessage } from '@market/shared';
import { Subscription } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { MetricsService } from '../health/metrics.service';
import { MarketTick, SimulatorService } from '../simulator/simulator.service';
import { ClientConnection, SOCKET_OPEN } from '../subscriptions/client-connection';
import { SubscriptionRegistry } from '../subscriptions/subscription-registry';

/** Delivers market data to the clients that asked for it. */
@Injectable()
export class BroadcasterService implements OnModuleInit, OnApplicationShutdown {
  /** Clients that fell behind, with the time at which they did. */
  private readonly lagging = new Map<ClientConnection, number>();
  private subscription?: Subscription;

  constructor(
    private readonly simulator: SimulatorService,
    private readonly registry: SubscriptionRegistry,
    private readonly metrics: MetricsService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    this.subscription = this.simulator.ticks$.subscribe((tick) => this.publish(tick));
  }

  onApplicationShutdown(): void {
    this.subscription?.unsubscribe();
  }

  send(client: ClientConnection, message: ServerMessage): void {
    this.write(client, JSON.stringify(message));
  }

  sendSnapshot(client: ClientConnection, symbols: Iterable<string>): void {
    const data: [string, Quote][] = [];
    for (const symbol of symbols) {
      const quote = this.simulator.quote(symbol);
      if (quote) data.push([symbol, quote]);
    }
    if (data.length) this.send(client, { t: 'snapshot', ts: Date.now(), d: data });
  }

  forget(client: ClientConnection): void {
    this.lagging.delete(client);
  }

  publish({ ts, changes }: MarketTick): void {
    const startedAt = performance.now();

    // Serialise each changed stock once, however many clients watch it.
    const outbox = new Map<ClientConnection, string[]>();
    for (const change of changes) {
      const subscribers = this.registry.subscribersOf(change[0]);
      if (!subscribers) continue;
      const fragment = JSON.stringify(change);
      for (const client of subscribers) {
        const fragments = outbox.get(client);
        if (fragments) fragments.push(fragment);
        else outbox.set(client, [fragment]);
      }
    }

    this.recoverLagging(ts, outbox);

    for (const [client, fragments] of outbox) {
      if (client.bufferedAmount > this.config.highWaterBytes) {
        // Queuing more would only delay this client further: skip it.
        this.lagging.set(client, ts);
        this.metrics.ticksSkippedForSlowClients += 1;
        continue;
      }
      this.write(client, `{"t":"tick","ts":${ts},"d":[${fragments.join(',')}]}`);
    }

    this.metrics.recordFanOut(performance.now() - startedAt);
  }

  /**
   * A lagging client missed deltas, so once its buffer drains it gets a fresh
   * snapshot. One that never drains is disconnected.
   */
  private recoverLagging(now: number, outbox: Map<ClientConnection, string[]>): void {
    for (const [client, since] of this.lagging) {
      outbox.delete(client);
      if (client.bufferedAmount <= this.config.highWaterBytes / 4) {
        this.lagging.delete(client);
        this.sendSnapshot(client, this.registry.symbolsOf(client));
      } else if (now - since > this.config.maxLagMs) {
        this.lagging.delete(client);
        this.metrics.slowClientsDisconnected += 1;
        client.terminate();
      } else {
        this.metrics.ticksSkippedForSlowClients += 1;
      }
    }
  }

  private write(client: ClientConnection, data: string): void {
    if (client.readyState !== SOCKET_OPEN) return;
    client.send(data);
    this.metrics.recordSend(data);
  }
}
