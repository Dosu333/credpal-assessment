import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('mail_queue')
export class MailProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'send_otp') {
      const { email, otp } = job.data;
      
      console.log(`[Worker] Actually sending email to ${email} with code ${otp}...`);
      
      return { sent: true };
    }
  }
}