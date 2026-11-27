import { Injectable } from '@nestjs/common';
import { ClientConnection } from './client-connection';

/**
 * Two-way index between clients and symbols. Fan-out walks only the subscribers
 * of a changed symbol, and removing a client costs only its own subscriptions.
 */
@Injectable()
export class SubscriptionRegistry {
  private readonly byClient = new Map<ClientConnection, Set<string>>();
  private readonly bySymbol = new Map<string, Set<ClientConnection>>();
  private total = 0;

  add(client: ClientConnection): void {
    if (!this.byClient.has(client)) this.byClient.set(client, new Set());
  }

  remove(client: ClientConnection): void {
    const symbols = this.byClient.get(client);
    if (!symbols) return;
    this.unsubscribe(client, [...symbols]);
    this.byClient.delete(client);
  }

  subscribe(client: ClientConnection, symbols: readonly string[]): void {
    const own = this.byClient.get(client);
    if (!own) return;
    for (const symbol of symbols) {
      if (own.has(symbol)) continue;
      own.add(symbol);
      let subscribers = this.bySymbol.get(symbol);
      if (!subscribers) this.bySymbol.set(symbol, (subscribers = new Set()));
      subscribers.add(client);
      this.total += 1;
    }
  }

  unsubscribe(client: ClientConnection, symbols: readonly string[]): void {
    const own = this.byClient.get(client);
    if (!own) return;
    for (const symbol of symbols) {
      if (!own.delete(symbol)) continue;
      const subscribers = this.bySymbol.get(symbol);
      subscribers?.delete(client);
      if (subscribers?.size === 0) this.bySymbol.delete(symbol);
      this.total -= 1;
    }
  }

  symbolsOf(client: ClientConnection): ReadonlySet<string> {
    return this.byClient.get(client) ?? new Set();
  }

  subscribersOf(symbol: string): ReadonlySet<ClientConnection> | undefined {
    return this.bySymbol.get(symbol);
  }

  clients(): IterableIterator<ClientConnection> {
    return this.byClient.keys();
  }

  get clientCount(): number {
    return this.byClient.size;
  }

  get subscriptionCount(): number {
    return this.total;
  }

  get activeSymbolCount(): number {
    return this.bySymbol.size;
  }
}
