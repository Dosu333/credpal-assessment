import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from './entities/user.entity';
import { OtpLog } from './entities/otp-log.entity';
import { UserRegisteredEvent } from './events/user-registered.event';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(OtpLog) private otpRepo: Repository<OtpLog>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    await this.dataSource.transaction(async (manager) => {
      // Create User
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(password, salt);

      const user = manager.create(User, { email, passwordHash });
      const savedUser = await manager.save(user);

      // Generate OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 min expiry

      // Save OTP
      const otp = manager.create(OtpLog, {
        code,
        expiresAt,
        user: savedUser,
      });
      await manager.save(otp);

      // Trigger Event (Non-blocking email)
      console.log("Sending event for user registration");
      this.eventEmitter.emit(
        'user.registered',
        new UserRegisteredEvent(savedUser.id, savedUser.email, code),
      );
    });

    return { message: 'Registration successful. Check your email for OTP.' };
  }

  async verifyOtp(email: string, code: string) {
    // Latest valid OTP for user
    const otpRecord = await this.otpRepo.findOne({
      where: { user: { email }, isUsed: false },
      relations: ['user'],
      order: { expiresAt: 'DESC' },
    });

    if (!otpRecord) throw new BadRequestException('Invalid OTP');
    if (otpRecord.code !== code) throw new BadRequestException('Invalid OTP');
    if (new Date() > otpRecord.expiresAt)
      throw new BadRequestException('OTP has expired');

    // Activate User & Invalidate OTP
    otpRecord.user.isVerified = true;
    otpRecord.isUsed = true;

    await this.userRepo.save(otpRecord.user);
    await this.otpRepo.save(otpRecord);

    return { message: 'Account verified successfully.' };
  }

  async getAllUsers() {
    return this.userRepo.find();
  }
}
