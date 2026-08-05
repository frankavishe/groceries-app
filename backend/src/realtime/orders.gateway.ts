import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { OrderStatus } from '../orders/entities/order.entity';
import { UserRole } from '../users/entities/user.entity';

const ADMIN_ROOM = 'admins';

// specs/realtime/design.md: JWT-authenticated handshake (Req 2) using the same
// JwtService config as REST auth (see RealtimeModule), admin clients join a
// shared room so the single emitOrderStatusChanged call site (Req 1) reaches
// every connected admin session without per-client bookkeeping. CORS origin
// is read directly from process.env (not ConfigService) because
// @WebSocketGateway's options are evaluated at class-decoration time, before
// Nest has instantiated ConfigModule — fine for real deployment env vars, but
// note a local .env-file-only ADMIN_WEB_ORIGIN won't be picked up here.
@WebSocketGateway({
  namespace: '/ws/orders',
  cors: {
    origin: process.env.ADMIN_WEB_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class OrdersGateway implements OnGatewayConnection {
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  // Req 2: reject unauthenticated connections before they can receive
  // anything. Req 3 (client-side polling fallback) means a rejected/dropped
  // socket must never be the only path to correct state — enforced on the
  // admin-web side, not here.
  async handleConnection(client: Socket): Promise<void> {
    const token = OrdersGateway.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.role === UserRole.ADMIN) {
        await client.join(ADMIN_ROOM);
      }
      // Non-admin roles (CUSTOMER/DELIVERY_AGENT) authenticate successfully
      // but join no room — Req 1 scopes broadcasts to admin clients only;
      // Req 4's optional customer-facing push is not built (mobile has no
      // socket client, see specs/mobile-app/design.md), so there's nothing
      // for them to receive yet.
    } catch {
      this.logger.warn('Rejected WebSocket connection with invalid JWT');
      client.disconnect(true);
    }
  }

  // Req 1: single call site, invoked by OrdersService after any committed
  // status transition. payments.service.ts's PAID cascade already goes
  // through OrdersService.updateStatus, so it needs no call site of its own —
  // see specs/realtime/design.md's Broadcast Trigger note.
  emitOrderStatusChanged(orderId: string, status: OrderStatus): void {
    this.server.to(ADMIN_ROOM).emit('order:status-changed', {
      order_id: orderId,
      status,
    });
  }

  private static extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) {
      return authToken;
    }
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    return undefined;
  }
}
