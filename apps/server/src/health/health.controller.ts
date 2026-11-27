import { Controller, Get } from '@nestjs/common';
import { SubscriptionRegistry } from '../subscriptions/subscription-registry';
import { MetricsService } from './metrics.service';

@Controller()
export class HealthController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly registry: SubscriptionRegistry,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('metrics')
  read() {
    return {
      clients: this.registry.clientCount,
      subscriptions: this.registry.subscriptionCount,
      activeSymbols: this.registry.activeSymbolCount,
      ...this.metrics.snapshot(),
    };
  }
}
