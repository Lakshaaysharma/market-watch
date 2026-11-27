import { Quote, QUOTE_FIELDS, QuoteDelta, StockInfo } from '@market/shared';
import { buildSeeds, StockSeed } from '../catalog/stock-seeds';
import { gaussian, Random, seededRandom } from './random';

/** Exchange tick size, in paise. */
const TICK = 5;
/** Daily price band around the previous close. */
const CIRCUIT = 0.1;
/** Pull back towards the previous close, so prices do not drift to the band. */
const REVERSION = 0.002;

/** All prices are whole paise to avoid floating-point drift. */
interface Instrument {
  symbol: string;
  name: string;
  ltp: number;
  prev: number;
  open: number;
  high: number;
  low: number;
  h52: number;
  l52: number;
  bid: number;
  ask: number;
  vol: number;
  turnover: number;
  /** Cached public view, used to compute deltas. */
  quote: Quote;
}

export interface MarketOptions {
  stockCount: number;
  updateRatio: number;
  volatility: number;
  random?: Random;
}

export type Change = [symbol: string, delta: QuoteDelta];

const paise = (rupees: number) => Math.round(rupees * 100);
const rupees = (value: number) => Math.round(value) / 100;
const toTick = (value: number) => Math.round(value / TICK) * TICK;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Pure price simulator: no timers or I/O, so it can be tested deterministically. */
export class Market {
  readonly stocks: readonly StockInfo[];
  private readonly instruments: Instrument[];
  private readonly bySymbol: Map<string, Instrument>;
  private readonly random: Random;

  constructor(private readonly options: MarketOptions) {
    this.random = options.random ?? Math.random;
    const seedRandom = seededRandom(42);
    this.instruments = buildSeeds(options.stockCount).map((seed) => createInstrument(seed, seedRandom));
    this.bySymbol = new Map(this.instruments.map((i) => [i.symbol, i]));
    this.stocks = this.instruments.map(({ symbol, name }) => ({ symbol, name }));
  }

  has(symbol: string): boolean {
    return this.bySymbol.has(symbol);
  }

  quote(symbol: string): Quote | undefined {
    const instrument = this.bySymbol.get(symbol);
    return instrument && { ...instrument.quote };
  }

  /** Advances the market by one tick and returns only what changed. */
  step(): Change[] {
    const changes: Change[] = [];
    for (const instrument of this.instruments) {
      if (this.random() >= this.options.updateRatio) continue;
      this.trade(instrument);
      const next = toQuote(instrument);
      const delta = diff(instrument.quote, next);
      if (delta) {
        instrument.quote = next;
        changes.push([instrument.symbol, delta]);
      }
    }
    return changes;
  }

  private trade(i: Instrument): void {
    const drift = ((i.prev - i.ltp) / i.prev) * REVERSION;
    const shock = gaussian(this.random) * this.options.volatility;
    const floor = Math.ceil((i.prev * (1 - CIRCUIT)) / TICK) * TICK;
    const ceiling = Math.floor((i.prev * (1 + CIRCUIT)) / TICK) * TICK;
    i.ltp = clamp(toTick(i.ltp * (1 + drift + shock)), floor, Math.max(floor, ceiling));
    i.high = Math.max(i.high, i.ltp);
    i.low = Math.min(i.low, i.ltp);
    i.h52 = Math.max(i.h52, i.high);
    i.l52 = Math.min(i.l52, i.low);
    i.bid = Math.max(TICK, i.ltp - TICK * (1 + Math.floor(this.random() * 3)));
    i.ask = i.ltp + TICK * (1 + Math.floor(this.random() * 3));
    const quantity = 1 + Math.floor(this.random() * Math.max(1, i.vol * 0.0004));
    i.vol += quantity;
    i.turnover += quantity * i.ltp;
  }
}

function createInstrument(seed: StockSeed, random: Random): Instrument {
  const ltp = paise(seed.ltp);
  const around = (fraction: number) => toTick(ltp * fraction);
  const pct = seed.day?.pct ?? Math.round((random() * 5 - 2.5) * 100) / 100;
  const prev = Math.round(ltp / (1 + pct / 100));
  const high = seed.day ? paise(seed.day.high) : Math.max(ltp, around(1 + random() * 0.012));
  const low = seed.day ? paise(seed.day.low) : Math.min(ltp, around(1 - random() * 0.012));
  const vol = seed.day?.vol ?? Math.round(500_000 + random() * 9_000_000);
  const instrument = {
    symbol: seed.symbol,
    name: seed.name,
    ltp,
    prev,
    open: clamp(toTick(prev * (1 + (random() - 0.5) * 0.008)), low, high),
    high,
    low,
    h52: seed.day ? paise(seed.day.h52) : Math.max(high, around(1.08 + random() * 0.18)),
    l52: seed.day ? paise(seed.day.l52) : Math.min(low, around(0.72 + random() * 0.18)),
    bid: ltp - TICK,
    ask: ltp + TICK,
    vol,
    turnover: vol * Math.round((high + low + ltp) / 3),
  };
  return { ...instrument, quote: toQuote(instrument) };
}

function toQuote(i: Omit<Instrument, 'quote'>): Quote {
  return {
    ltp: rupees(i.ltp),
    chg: rupees(i.ltp - i.prev),
    pct: Math.round(((i.ltp - i.prev) / i.prev) * 10_000) / 100,
    high: rupees(i.high),
    low: rupees(i.low),
    vol: i.vol,
    h52: rupees(i.h52),
    l52: rupees(i.l52),
    open: rupees(i.open),
    prev: rupees(i.prev),
    bid: rupees(i.bid),
    ask: rupees(i.ask),
    avg: rupees(i.turnover / i.vol),
  };
}

function diff(before: Quote, after: Quote): QuoteDelta | null {
  let delta: QuoteDelta | null = null;
  for (const field of QUOTE_FIELDS) {
    if (before[field] !== after[field]) {
      delta ??= {};
      delta[field] = after[field];
    }
  }
  return delta;
}
