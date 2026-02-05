import { Entity, Column, ManyToOne, Unique, JoinColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Currency } from './currency.entity';
import { Wallet } from './wallet.entity';

@Entity('wallet_balances')
@Unique(['wallet', 'currency'])
export class WalletBalance extends BaseEntity {
  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'currency_code' })
  currency: Currency;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  balance: number;

  @ManyToOne(() => Wallet, (wallet) => wallet.balances)
  wallet: Wallet;
}
