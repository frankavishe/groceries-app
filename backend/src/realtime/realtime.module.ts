import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersGateway } from './orders.gateway';

// specs/realtime/design.md: WebSocket gateway for order-status broadcast.
// Imports AuthModule for its exported JwtModule so the gateway's handshake
// verifies the exact same JWTs `/auth/login` issues (Req 2), rather than a
// second JWT config living outside auth.module.ts.
@Module({
  imports: [AuthModule],
  providers: [OrdersGateway],
  exports: [OrdersGateway],
})
export class RealtimeModule {}
