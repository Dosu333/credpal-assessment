import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { FundWalletDto } from './dto/wallet.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorators';
import { Role } from 'src/auth/enums/role.enum';
import { TradeDto } from './dto/trade.dto';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('fund')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Fund wallet via External Provider' })
  @ApiResponse({ status: 200, description: 'Funding successful' })
  @ApiResponse({ status: 400, description: 'Invalid Currency or Amount' })
  async fundWallet(@Request() req, @Body() dto: FundWalletDto) {
    // Generate Idempotency Key (In a real app, this will come from the Payment Gateway webhook)
    const reference = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    return this.walletService.fundWallet(
      req.user.id,
      dto.amount,
      dto.currency,
      reference,
    );
  }

  @Post('trade')
  @ApiOperation({ summary: 'Trade/Swap currencies' })
  async trade(@Request() req, @Body() dto: TradeDto) {
    return this.walletService.tradeCurrency(
      req.user.id,
      dto.fromCurrency,
      dto.toCurrency,
      dto.amount,
    );
  }

  @Get('convert')
  @ApiOperation({ summary: 'Calculate currency conversion (No transaction)' })
  @ApiResponse({ status: 200, description: 'Conversion successful' })
  async convert(@Query() query: ConvertCurrencyDto) {
    return this.walletService.convertCurrency(
      query.from,
      query.to,
      query.amount,
    );
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history with pagination' })
  @ApiResponse({ status: 200, description: 'List of transactions' })
  async getHistory(@Request() req, @Query() query: GetTransactionsDto) {
    return this.walletService.getTransactions(req.user.id, query);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get all wallet balances for the user' })
  async getBalances(@Request() req) {
    return this.walletService.getUserWallets(req.user.id);
  }
}
