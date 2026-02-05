import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { MailerModule } from '@nestjs-modules/mailer';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { NotificationListener } from 'src/notification/notification.listener';
import { MailProcessor } from './consumers/mail.processor';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User } from './entities/user.entity';
import { OtpLog } from './entities/otp-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OtpLog]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    BullModule.registerQueue({
      name: 'mail_queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_HOST,
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      },
      defaults: {
        from: `"Credpal Assessment" <${process.env.EMAIL_USER}>`,
      },
    }),
    BullBoardModule.forFeature({
      name: 'mail_queue',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    AuthService, 
    NotificationListener, 
    MailProcessor,
    JwtStrategy,
    LocalStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
