import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { UserRegisteredEvent } from 'src/auth/events/user-registered.event';

@Injectable()
export class NotificationListener {
  @OnEvent('user.registered')
  async handleUserRegistered(event: UserRegisteredEvent) {
    console.log(`[Mock Email] Sending OTP ${event.otp} to ${event.email}`);
  }
}
