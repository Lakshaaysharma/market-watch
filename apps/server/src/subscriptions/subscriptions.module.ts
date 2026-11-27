import { Module } from '@nestjs/common';
import { SubscriptionRegistry } from './subscription-registry';

@Module({ providers: [SubscriptionRegistry], exports: [SubscriptionRegistry] })
export class SubscriptionsModule {}
