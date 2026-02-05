// src/modules/system/system.controller.ts
import { Controller, Post, Get, Patch, Body, Param, UseGuards, ParseBoolPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { CreateCurrencyDto } from './dto/currency.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorators';
import { Role } from '../auth/enums/role.enum';

@ApiTags('System (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Post('currency')
  @ApiOperation({ summary: 'Add a new supported currency' })
  @ApiResponse({ status: 201, description: 'Currency added' })
  async addCurrency(@Body() dto: CreateCurrencyDto) {
    return this.systemService.createCurrency(dto);
  }

  @Get('currencies')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'List all currencies' })
  async listCurrencies() {
    return this.systemService.findAll();
  }

  @Patch('currency/:code/toggle/:status')
  @ApiOperation({ summary: 'Enable or disable a currency' })
  async toggleStatus(
    @Param('code') code: string,
    @Param('status', ParseBoolPipe) status: boolean
  ) {
    return this.systemService.toggleCurrency(code.toUpperCase(), status);
  }
}