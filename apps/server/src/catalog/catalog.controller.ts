import { Controller, Get } from '@nestjs/common';
import { StockInfo } from '@market/shared';
import { SimulatorService } from '../simulator/simulator.service';

@Controller('stocks')
export class CatalogController {
  constructor(private readonly simulator: SimulatorService) {}

  @Get()
  list(): readonly StockInfo[] {
    return this.simulator.stocks;
  }
}
