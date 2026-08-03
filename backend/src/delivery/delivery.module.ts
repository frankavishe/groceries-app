import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { DeliveryController } from './delivery.controller';

@Module({
  imports: [OrdersModule, UsersModule],
  controllers: [DeliveryController],
})
export class DeliveryModule {}
