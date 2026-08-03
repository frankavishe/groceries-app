import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UserRole } from '../users/entities/user.entity';
import { AssignOrderDto } from './dto/assign-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { toPublicOrder } from './orders.mapper';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    const { order, items } = await this.ordersService.create(req.user.sub, dto);
    return toPublicOrder(order, items);
  }

  @Get()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  findAll(@Req() req: AuthenticatedRequest, @Query() query: QueryOrdersDto) {
    return this.ordersService.findMany(req.user, query);
  }

  @Get(':id')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const { order, items } = await this.ordersService.findOneForUser(
      id,
      req.user,
    );
    return toPublicOrder(order, items);
  }

  // M6 mobile MVP stub payment (specs/mobile-app/design.md) — not the real
  // payments engine (M8/M9). Removed once specs/payments lands for real.
  @Post(':id/stub-pay')
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.ACCEPTED)
  async stubPay(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const { order, items } = await this.ordersService.initiateStubPayment(
      id,
      req.user,
    );
    return toPublicOrder(order, items);
  }

  // specs/delivery/requirements.md Req 1-3: admin assigns a delivery agent to
  // an order already being fulfilled.
  @Patch(':id/assign')
  @Roles(UserRole.ADMIN)
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignOrderDto,
  ) {
    const { order, items } = await this.ordersService.assignAgent(id, dto);
    return toPublicOrder(order, items);
  }

  // specs/delivery/design.md: this endpoint's RolesGuard is extended to also
  // accept DELIVERY_AGENT, with the narrower allowed-transition set (Req 5-6)
  // checked in OrdersService.updateStatus, not just here.
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.DELIVERY_AGENT)
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const { order, items } = await this.ordersService.updateStatus(
      id,
      dto.status,
      req.user,
    );
    return toPublicOrder(order, items);
  }
}
