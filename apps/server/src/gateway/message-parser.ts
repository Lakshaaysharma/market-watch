import { ClientMessage } from '@market/shared';

export const MAX_MESSAGE_BYTES = 128 * 1024;
const INVALID = 'invalid';

const isSymbolList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length <= 32);

/** Validates a raw frame. Returns null for anything outside the protocol. */
export function parseClientMessage(raw: string): ClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { t, symbols } = value as { t?: unknown; symbols?: unknown };
  if (t === 'resync' || t === 'ping') return { t };
  if ((t === 'subscribe' || t === 'unsubscribe') && isSymbolList(symbols)) return { t, symbols };
  return null;
}

/** Adapts our `{ t }` messages to Nest's `{ event, data }` routing. */
export function toNestEvent(data: { toString(): string }) {
  const message = parseClientMessage(data.toString());
  return { event: message?.t ?? INVALID, data: message };
}
