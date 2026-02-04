import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { NotificationListener } from 'src/notification/notification.listener';
import { MailProcessor } from './consumers/mail.processor';
import { User } from './entities/user.entity';
import { OtpLog } from './entities/otp-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OtpLog]),
    BullModule.registerQueue({
      name: 'mail_queue',
    }),
    BullBoardModule.forFeature({
      name: 'mail_queue',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    AuthService, 
    NotificationListener,
    MailProcessor
  ],
  controllers: [AuthController],
})
export class AuthModule {}
