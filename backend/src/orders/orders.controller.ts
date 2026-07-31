import {
  Body,
  Controller,
  Get,
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

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const { order, items } = await this.ordersService.updateStatus(
      id,
      dto.status,
    );
    return toPublicOrder(order, items);
  }
}
