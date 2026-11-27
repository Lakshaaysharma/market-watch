import { Inject, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { ClientMessage, ErrorCode, WS_PATH } from '@market/shared';
import type { WebSocket } from 'ws';
import { BroadcasterService } from '../broadcast/broadcaster.service';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { SimulatorService } from '../simulator/simulator.service';
import { SubscriptionRegistry } from '../subscriptions/subscription-registry';

type SymbolMessage = Extract<ClientMessage, { symbols: string[] }>;

/** Connection lifecycle and the client protocol. Delivery lives in the broadcaster. */
@WebSocketGateway({ path: WS_PATH })
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(MarketGateway.name);
  /** Sockets that have answered since the last heartbeat. */
  private readonly alive = new Map<WebSocket, boolean>();
  private heartbeat?: NodeJS.Timeout;

  constructor(
    private readonly simulator: SimulatorService,
    private readonly registry: SubscriptionRegistry,
    private readonly broadcaster: BroadcasterService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    this.heartbeat = setInterval(() => this.checkConnections(), this.config.heartbeatMs);
  }

  onApplicationShutdown(): void {
    clearInterval(this.heartbeat);
  }

  handleConnection(client: WebSocket): void {
    this.alive.set(client, true);
    client.on('pong', () => this.alive.set(client, true));
    client.on('error', (error) => this.logger.warn(`Socket error: ${error.message}`));
    this.registry.add(client);
    this.broadcaster.send(client, {
      t: 'hello',
      tickMs: this.config.tickMs,
      maxSymbols: this.config.maxSymbolsPerClient,
      stocks: [...this.simulator.stocks],
    });
  }

  handleDisconnect(client: WebSocket): void {
    this.alive.delete(client);
    this.registry.remove(client);
    this.broadcaster.forget(client);
  }

  @SubscribeMessage('subscribe')
  subscribe(@ConnectedSocket() client: WebSocket, @MessageBody() { symbols }: SymbolMessage): void {
    const unique = [...new Set(symbols)];
    const known = unique.filter((symbol) => this.simulator.has(symbol));
    if (known.length < unique.length) {
      const unknown = unique.filter((symbol) => !this.simulator.has(symbol));
      this.fail(client, 'UNKNOWN_SYMBOL', `Unknown symbol(s): ${unknown.slice(0, 10).join(', ')}`);
    }
    const current = this.registry.symbolsOf(client);
    const added = known.filter((symbol) => !current.has(symbol)).length;
    if (current.size + added > this.config.maxSymbolsPerClient) {
      this.fail(client, 'LIMIT_EXCEEDED', `A client may watch at most ${this.config.maxSymbolsPerClient} stocks`);
      return;
    }
    this.registry.subscribe(client, known);
    // Sent in the same turn as the subscription, so it precedes any delta.
    this.broadcaster.sendSnapshot(client, known);
  }

  @SubscribeMessage('unsubscribe')
  unsubscribe(@ConnectedSocket() client: WebSocket, @MessageBody() { symbols }: SymbolMessage): void {
    this.registry.unsubscribe(client, symbols);
  }

  @SubscribeMessage('resync')
  resync(@ConnectedSocket() client: WebSocket): void {
    this.broadcaster.sendSnapshot(client, this.registry.symbolsOf(client));
  }

  @SubscribeMessage('ping')
  ping(@ConnectedSocket() client: WebSocket): void {
    this.broadcaster.send(client, { t: 'pong', ts: Date.now() });
  }

  @SubscribeMessage('invalid')
  invalid(@ConnectedSocket() client: WebSocket): void {
    this.fail(client, 'BAD_MESSAGE', 'Message does not match the protocol');
  }

  private fail(client: WebSocket, code: ErrorCode, message: string): void {
    this.broadcaster.send(client, { t: 'error', code, message });
  }

  /** Drops connections that did not answer the previous protocol-level ping. */
  private checkConnections(): void {
    for (const [client, answered] of this.alive) {
      if (!answered) {
        client.terminate();
        continue;
      }
      this.alive.set(client, false);
      client.ping();
    }
  }
}
