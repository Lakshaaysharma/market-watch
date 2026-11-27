export interface AppConfig {
  host: string;
  port: number;
  /** Number of simulated stocks. */
  stockCount: number;
  /** Interval between market ticks. */
  tickMs: number;
  /** Probability that a given stock trades on a given tick (0–1). */
  updateRatio: number;
  /** Standard deviation of one price step, as a fraction of the price. */
  volatility: number;
  maxSymbolsPerClient: number;
  /** A client with more than this many unsent bytes stops receiving ticks. */
  highWaterBytes: number;
  /** A client that stays behind for longer than this is disconnected. */
  maxLagMs: number;
  heartbeatMs: number;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

function numberFrom(env: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max: number, integer = true): number {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`Invalid ${key}="${raw}". Expected ${integer ? 'an integer' : 'a number'} between ${min} and ${max}.`);
  }
  return value;
}

/** Reads settings from the environment and fails fast on invalid values. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    host: env.HOST || '127.0.0.1',
    port: numberFrom(env, 'PORT', 3000, 0, 65535),
    stockCount: numberFrom(env, 'STOCK_COUNT', 50, 1, 10_000),
    tickMs: numberFrom(env, 'TICK_MS', 500, 20, 3_600_000),
    updateRatio: numberFrom(env, 'UPDATE_RATIO', 0.5, 0, 1, false),
    volatility: numberFrom(env, 'VOLATILITY', 0.0006, 0, 0.05, false),
    maxSymbolsPerClient: numberFrom(env, 'MAX_SYMBOLS_PER_CLIENT', 500, 1, 10_000),
    highWaterBytes: numberFrom(env, 'HIGH_WATER_BYTES', 512 * 1024, 1024, 100 * 1024 * 1024),
    maxLagMs: numberFrom(env, 'MAX_LAG_MS', 10_000, 100, 600_000),
    heartbeatMs: numberFrom(env, 'HEARTBEAT_MS', 30_000, 1000, 600_000),
  };
}
