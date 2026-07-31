import { Logger } from '@nestjs/common';
import { OtpSenderPort } from './otp-sender.port';

export class ConsoleOtpSender implements OtpSenderPort {
  private readonly logger = new Logger(ConsoleOtpSender.name);

  send(phoneNumber: string, code: string): Promise<void> {
    this.logger.log(`OTP for ${phoneNumber}: ${code}`);
    return Promise.resolve();
  }
}
