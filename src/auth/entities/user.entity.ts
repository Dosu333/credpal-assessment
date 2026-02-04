import {
  Entity,
  Column,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { OtpLog } from './otp-log.entity';
import { Role } from '../enums/role.enum';  

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({
    type: 'enum',
    enum: Role,
    array: true,
    default: [Role.USER],
  })
  roles: Role[];

  @OneToMany(() => OtpLog, (otp) => otp.user)
  otps: OtpLog[];
}
