import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';

@Module({ providers: [SimulatorService], exports: [SimulatorService] })
export class SimulatorModule {}
