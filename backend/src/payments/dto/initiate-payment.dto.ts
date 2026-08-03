import { IsEnum, IsUUID, Matches } from 'class-validator';
import { PaymentProvider } from '../entities/payment-transaction.entity';

const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

export class InitiatePaymentDto {
  @IsUUID()
  order_id: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @Matches(PHONE_REGEX, {
    message: 'phone_number must be a valid phone number',
  })
  phone_number: string;
}
