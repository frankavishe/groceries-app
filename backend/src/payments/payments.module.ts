import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module';
import { MockMpesaAdapter } from './adapters/mpesa/mock-mpesa.adapter';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction]), OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockMpesaAdapter],
})
export class PaymentsModule {}
