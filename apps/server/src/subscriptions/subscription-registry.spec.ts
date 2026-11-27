import { ClientConnection } from './client-connection';
import { SubscriptionRegistry } from './subscription-registry';

const client = (): ClientConnection => ({ readyState: 1, bufferedAmount: 0, send: jest.fn(), terminate: jest.fn() });

describe('SubscriptionRegistry', () => {
  it('keeps each client\'s selection independent', () => {
    const registry = new SubscriptionRegistry();
    const a = client();
    const b = client();
    registry.add(a);
    registry.add(b);
    registry.subscribe(a, ['TCS', 'INFY']);
    registry.subscribe(b, ['TCS']);
    registry.unsubscribe(a, ['TCS']);
    expect([...registry.symbolsOf(a)]).toEqual(['INFY']);
    expect([...registry.subscribersOf('TCS')!]).toEqual([b]);
  });

  it('ignores duplicates and frees everything on removal', () => {
    const registry = new SubscriptionRegistry();
    const a = client();
    registry.add(a);
    registry.subscribe(a, ['TCS', 'TCS']);
    registry.subscribe(a, ['TCS']);
    expect(registry.subscriptionCount).toBe(1);
    registry.remove(a);
    expect(registry.clientCount).toBe(0);
    expect(registry.subscriptionCount).toBe(0);
    expect(registry.activeSymbolCount).toBe(0);
  });

  it('ignores clients that were never added', () => {
    const registry = new SubscriptionRegistry();
    registry.subscribe(client(), ['TCS']);
    expect(registry.subscriptionCount).toBe(0);
  });
});
