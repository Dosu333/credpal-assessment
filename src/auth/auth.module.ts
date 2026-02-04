import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { OtpLog } from './entities/otp-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OtpLog]),
  ],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {}
