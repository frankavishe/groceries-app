import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { OrdersService } from '../orders/orders.service';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('delivery')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  // Req 4: the agent's own assigned orders, DISPATCHED first.
  @Get('my-orders')
  @Roles(UserRole.DELIVERY_AGENT)
  myOrders(@Req() req: AuthenticatedRequest) {
    return this.ordersService.findAssignedOrders(req.user.sub);
  }

  // Not in specs/delivery/requirements.md directly, but needed for the admin
  // assignment UI (specs/admin-web/requirements.md Req 11) to offer a list of
  // agents to assign — documented here per the constitution's spec-extension
  // rule rather than building the full specs/users module for this alone.
  @Get('agents')
  @Roles(UserRole.ADMIN)
  async agents() {
    const agents = await this.usersService.findActiveDeliveryAgents();
    return agents.map((agent) => ({
      id: agent.id,
      full_name: agent.fullName,
      phone_number: agent.phoneNumber,
    }));
  }
}
