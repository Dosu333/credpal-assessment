import {
  Entity,
  Column,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { OtpLog } from './otp-log.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ default: false })
  isVerified: boolean;

  @OneToMany(() => OtpLog, (otp) => otp.user)
  otps: OtpLog[];
}
