import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';

@Processor('mail_queue')
export class MailProcessor extends WorkerHost {
  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'send_otp') {
      const { email, otp } = job.data;
      
      console.log(`[Worker] Sending OTP email to ${email}...`);

      try {
        await this.mailerService.sendMail({
          to: email,
          subject: 'Your Verification Code',
          text: `Your OTP code is: ${otp}`,
          html: `<b>Your OTP code is: ${otp}</b>`,
        });
        
        console.log(`[Worker] Email sent successfully to ${email}`);
        return { sent: true };
      } catch (error) {
        console.error(`[Worker] Failed to send email:`, error);
        throw error;
      }
    }
  }
}