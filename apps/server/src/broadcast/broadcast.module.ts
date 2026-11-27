import { Module } from '@nestjs/common';
import { SimulatorModule } from '../simulator/simulator.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BroadcasterService } from './broadcaster.service';

@Module({
  imports: [SimulatorModule, SubscriptionsModule],
  providers: [BroadcasterService],
  exports: [BroadcasterService],
})
export class BroadcastModule {}
