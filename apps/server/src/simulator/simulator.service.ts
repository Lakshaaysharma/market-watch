import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Quote, StockInfo } from '@market/shared';
import { Observable, Subject } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { Change, Market } from './market';

export interface MarketTick {
  ts: number;
  changes: Change[];
}

/** Owns the clock: advances the market at the configured interval. */
@Injectable()
export class SimulatorService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(SimulatorService.name);
  private readonly market: Market;
  private readonly subject = new Subject<MarketTick>();
  private timer?: NodeJS.Timeout;

  readonly ticks$: Observable<MarketTick> = this.subject.asObservable();

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.market = new Market(config);
  }

  get stocks(): readonly StockInfo[] {
    return this.market.stocks;
  }

  has(symbol: string): boolean {
    return this.market.has(symbol);
  }

  quote(symbol: string): Quote | undefined {
    return this.market.quote(symbol);
  }

  onModuleInit(): void {
    this.timer = setInterval(() => this.tick(), this.config.tickMs);
    this.logger.log(`Simulating ${this.config.stockCount} stocks every ${this.config.tickMs} ms`);
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
    this.subject.complete();
  }

  tick(): void {
    this.subject.next({ ts: Date.now(), changes: this.market.step() });
  }
}
