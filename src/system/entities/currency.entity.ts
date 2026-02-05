import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('currencies')
export class Currency {
  @PrimaryColumn()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 2 })
  decimalPlaces: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isCrypto: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
