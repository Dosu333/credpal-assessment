import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Wallet } from './wallet.entity';
import { Ledger } from './ledger.entity';

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('transactions')
export class Transaction extends BaseEntity{
  @ManyToOne(() => Wallet)
  wallet: Wallet;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  amount: number; 

  @Column()
  currency: string;

  @Column({ nullable: true })
  description: string;

  @Column({ unique: true })
  reference: string;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @OneToMany(() => Ledger, (ledger) => ledger.transaction)
  ledgerEntries: Ledger[];
}