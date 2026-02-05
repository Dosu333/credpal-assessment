import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { Wallet } from './entities/wallet.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { Transaction } from './entities/transaction.entity';
import { Ledger } from './entities/ledger.entity';
import { SystemModule } from 'src/system/system.module';
import { FxModule } from 'src/fx/fx.module';

@Module({
  imports: [
    SystemModule,
    FxModule,
    TypeOrmModule.forFeature([
      Wallet, 
      WalletBalance, 
      Transaction, 
      Ledger, 
    ]), 
  ],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
