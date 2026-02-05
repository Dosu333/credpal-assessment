import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Wallet } from './wallet.entity';
import { Transaction } from './transaction.entity';
import { Currency } from '../../system/entities/currency.entity';

export enum LedgerEntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

@Entity('ledgers')
export class Ledger extends BaseEntity {
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  amount: number;

  @Column({ type: 'enum', enum: LedgerEntryType })
  entryType: 'DEBIT' | 'CREDIT';

  @ManyToOne(() => Wallet) 
  wallet: Wallet;

  @ManyToOne(() => Currency)
  currency: Currency;

  @ManyToOne(() => Transaction, (tx) => tx.ledgerEntries)
  transaction: Transaction;
}