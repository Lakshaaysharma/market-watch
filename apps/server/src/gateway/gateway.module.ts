import { Module } from '@nestjs/common';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { SimulatorModule } from '../simulator/simulator.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MarketGateway } from './market.gateway';

@Module({
  imports: [SimulatorModule, SubscriptionsModule, BroadcastModule],
  providers: [MarketGateway],
})
export class GatewayModule {}
