import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { Ledger, LedgerEntryType } from './entities/ledger.entity';
import { Currency } from './entities/currency.entity';
import { SYSTEM_WALLET_ID, EXTERNAL_PROVIDER_ID } from 'src/common/constants/system-wallets.constant';

@Injectable()
export class WalletService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Currency) private currencyRepo: Repository<Currency>,
  ) {}

  /**
   * FUNDING (Deposit)
   * Flow: External Provider (DEBIT) -> User Wallet (CREDIT)
   */
  async fundWallet(userId: string, amount: number, currencyCode: string, reference: string) {
    return this.dataSource.transaction(async (manager) => {
      // Validation
      const currency = await this.currencyRepo.findOne({ where: { code: currencyCode, isActive: true } });
      if (!currency) throw new BadRequestException(`Invalid currency: ${currencyCode}`);

      // Idempotency Check
      const existingTx = await manager.findOne(Transaction, { where: { reference } });
      if (existingTx) return existingTx;

      // Get Wallets
      const userWallet = await this.getOrCreateWallet(manager, userId);
      const externalWallet = await this.getSystemWallet(manager, EXTERNAL_PROVIDER_ID);

      // Create Transaction Header
      const tx = manager.create(Transaction, {
        wallet: userWallet,
        amount,
        currency: currency.code,
        reference,
        description: `Funded ${currency.code} via External Provider`,
        status: TransactionStatus.SUCCESS,
        metadata: { source: 'external_provider' }
      });
      await manager.save(tx);

      // DOUBLE ENTRY BOOKKEEPING
      
      // DEBIT the External Provider (Money leaving them)
      await this.recordLedgerEntry(manager, {
        walletId: externalWallet.id,
        currency,
        amount,
        type: LedgerEntryType.DEBIT,
        transaction: tx,
        description: 'Outflow to User'
      });

      // CREDIT the User (Money entering their account)
      await this.recordLedgerEntry(manager, {
        walletId: userWallet.id,
        currency,
        amount,
        type: LedgerEntryType.CREDIT,
        transaction: tx,
        description: 'Deposit'
      });

      return tx;
    });
  }

  /**
   * CORE LEDGER LOGIC
   * Automatically updates the Balance and creates the Ledger Entry
   */
  private async recordLedgerEntry(
    manager: EntityManager,
    params: {
      walletId: string;
      currency: Currency;
      amount: number;
      type: LedgerEntryType;
      transaction: Transaction;
      description?: string;
    }
  ) {
    // Create Ledger Record
    const entry = manager.create(Ledger, {
      wallet: { id: params.walletId },
      currency: params.currency,
      amount: params.amount,
      entryType: params.type,
      transaction: params.transaction,
    });
    await manager.save(entry);

    // Update Wallet Balance (Atomic Lock)
    const balanceRepo = manager.getRepository(WalletBalance);
    
    // Lock row to prevent race conditions
    let balanceRow = await balanceRepo.findOne({
      where: { wallet: { id: params.walletId }, currency: { code: params.currency.code } },
      lock: { mode: 'pessimistic_write' }
    });

    if (!balanceRow) {
      balanceRow = balanceRepo.create({
        wallet: { id: params.walletId },
        currency: params.currency,
        balance: 0
      });
    }

    // Calculate New Balance
    // CREDIT = Increase Balance, DEBIT = Decrease Balance
    const numericBalance = Number(balanceRow.balance);
    const numericAmount = Number(params.amount);

    if (params.type === LedgerEntryType.CREDIT) {
      balanceRow.balance = numericBalance + numericAmount;
    } else {
      // Prevent negative balance
      if (numericBalance < numericAmount && params.walletId !== SYSTEM_WALLET_ID && params.walletId !== EXTERNAL_PROVIDER_ID) {
         throw new BadRequestException('Insufficient funds');
      }
      balanceRow.balance = numericBalance - numericAmount;
    }

    await balanceRepo.save(balanceRow);
  }

  // Helper: Get User Wallet
  private async getOrCreateWallet(manager: EntityManager, userId: string) {
    let wallet = await manager.findOne(Wallet, { where: { user: { id: userId } } });
    if (!wallet) {
      wallet = manager.create(Wallet, { user: { id: userId } });
      await manager.save(wallet);
    }
    return wallet;
  }

  // Helper: Get System Wallet
  private async getSystemWallet(manager: EntityManager, walletId: string) {
    const wallet = await manager.findOne(Wallet, { where: { id: walletId } });
    if (!wallet) {
       // In dev, we can auto-create, but in prod, this should crash if seeds are missing
       // throw new InternalServerErrorException('System Wallet not configured');
       
       // For demo purposes, auto-create:
       const newWallet = manager.create(Wallet, { id: walletId }); 
       await manager.save(newWallet);
       return newWallet;
    }
    return wallet;
  }
}