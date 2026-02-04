import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { UserRegisteredEvent } from 'src/auth/events/user-registered.event';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationListener {
  constructor(@InjectQueue('mail_queue') private mailQueue: Queue) {}

  @OnEvent('user.registered')
  async handleUserRegistered(event: UserRegisteredEvent) {
    await this.mailQueue.add('send_otp', {
      email: event.email,
      otp: event.otp,
    });
  }
}