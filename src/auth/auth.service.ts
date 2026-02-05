import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
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
    private jwtService: JwtService,
  ) {}

  // Register User
  async register(email: string, password: string) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const { savedUser, plainCode } = await this.dataSource.transaction(
      async (manager) => {
        // Create User
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);

        const user = manager.create(User, { email, passwordHash });
        const savedUser = await manager.save(user);

        // Generate OTP
        const plainCode = Math.floor(
          100000 + Math.random() * 900000,
        ).toString();

        // Hash OTP
        const otpSalt = await bcrypt.genSalt();
        const otpHash = await bcrypt.hash(plainCode, otpSalt);

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        const otp = manager.create(OtpLog, {
          code: otpHash,
          expiresAt,
          user: savedUser,
        });
        await manager.save(otp);

        return { savedUser, plainCode };
      },
    );

    this.eventEmitter.emit(
      'user.registered',
      new UserRegisteredEvent(savedUser.id, savedUser.email, plainCode),
    );

    return { message: 'Registration successful. Check your email for OTP.' };
  }
  
  // Verify OTP
  async verifyOtp(email: string, code: string) {
    const otpRecord = await this.otpRepo.findOne({
      where: { user: { email }, isUsed: false },
      relations: ['user'],
      order: { expiresAt: 'DESC' },
    });

    if (!otpRecord) throw new BadRequestException('Invalid OTP');

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    const isMatch = await bcrypt.compare(code, otpRecord.code);
    if (!isMatch) throw new BadRequestException('Invalid OTP');

    otpRecord.user.isVerified = true;
    otpRecord.isUsed = true;

    await this.userRepo.save(otpRecord.user);
    await this.otpRepo.save(otpRecord);

    return { message: 'Account verified successfully.' };
  }

  // Validate User for Login
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'email', 'passwordHash', 'roles', 'isVerified'],
    });

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      if (!user.isVerified)
        throw new UnauthorizedException('Account not verified');

      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  // Login User
  async login(user: any) {
    const payload = { sub: user.id, email: user.email, roles: user.roles };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getAllUsers() {
    return this.userRepo.find();
  }
}
