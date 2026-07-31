import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OTP_SENDER, OtpSenderPort } from './otp-sender.port';
import { ConsoleOtpSender } from './console-otp-sender';
import { AfricasTalkingOtpSender } from './africas-talking-otp-sender';

export const otpSenderProvider: Provider = {
  provide: OTP_SENDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): OtpSenderPort => {
    const apiKey = config.get<string>('africasTalking.apiKey');
    const username = config.get<string>('africasTalking.username');
    if (apiKey && username) {
      return new AfricasTalkingOtpSender(apiKey, username);
    }
    return new ConsoleOtpSender();
  },
};
