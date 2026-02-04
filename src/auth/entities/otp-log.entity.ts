import {
  Entity,
  Column,
  ManyToOne
} from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from './user.entity';

@Entity('otp_logs')
export class OtpLog extends BaseEntity{
  @Column({ length: 60 })
  code: string;
  
  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @ManyToOne(() => User, (user) => user.otps)
  user: User;
}
