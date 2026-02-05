import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FxService } from './fx.service';


@ApiTags('Market Data (FX)')
@Controller('fx')
export class FxController {
  constructor(private readonly fxService: FxService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get live exchange rates for all supported currencies' })
  @ApiQuery({ name: 'base', required: false, example: 'NGN', description: 'Base currency for quotes (Default: NGN)' })
  @ApiResponse({ status: 200, description: 'Rates retrieved successfully' })
  async getRates(@Query('base') base: string = 'NGN') {
    return this.fxService.getMarketRates(base);
  }
}