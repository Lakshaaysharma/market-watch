/** The part of a WebSocket the market feed depends on (easy to fake in tests). */
export interface ClientConnection {
  readonly readyState: number;
  /** Bytes queued but not yet written to the network. */
  readonly bufferedAmount: number;
  send(data: string): void;
  terminate(): void;
}

export const SOCKET_OPEN = 1;
