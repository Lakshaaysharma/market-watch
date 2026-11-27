import { Module } from '@nestjs/common';
import { CatalogController } from './catalog/catalog.controller';
import { ConfigModule } from './config/config.module';
import { GatewayModule } from './gateway/gateway.module';
import { HealthController } from './health/health.controller';
import { MetricsModule } from './health/metrics.module';
import { SimulatorModule } from './simulator/simulator.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [ConfigModule, MetricsModule, SimulatorModule, SubscriptionsModule, GatewayModule],
  controllers: [CatalogController, HealthController],
})
export class AppModule {}
