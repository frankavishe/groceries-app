import AfricasTalking from 'africastalking';
import { OtpSenderPort } from './otp-sender.port';

export class AfricasTalkingOtpSender implements OtpSenderPort {
  private readonly sms: ReturnType<typeof AfricasTalking>['SMS'];

  constructor(apiKey: string, username: string) {
    this.sms = AfricasTalking({ apiKey, username }).SMS;
  }

  async send(phoneNumber: string, code: string): Promise<void> {
    await this.sms.send({
      to: [phoneNumber],
      message: `Your grocery app verification code is ${code}. It expires in 5 minutes.`,
    });
  }
}
