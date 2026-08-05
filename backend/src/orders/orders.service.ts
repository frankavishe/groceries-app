import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { ApiException } from '../common/exceptions/api-exception';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Product } from '../products/entities/product.entity';
import { OrdersGateway } from '../realtime/orders.gateway';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AssignOrderDto } from './dto/assign-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';
import {
  cancellationRestoresStock,
  canTransition,
} from './order-status.transitions';
import { PublicOrder, toPublicOrder } from './orders.mapper';

export interface OrderWithItems {
  order: Order;
  items: OrderItem[];
}

export interface PaginatedOrders {
  data: PublicOrder[];
  total: number;
  page: number;
  pageSize: number;
}

// Flat fee per specs/orders/design.md, pending a real delivery-fee policy
// decision (see specs/database/design.md "Pending Schema Additions").
const DELIVERY_FEE = 2000;

const RESERVATION_TIMEOUT_MS = 20 * 60 * 1000;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    private readonly usersService: UsersService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  // Req 1-4: single transaction, rows locked in ascending product_id order
  // (constitution's stock-lock invariant), re-checked after the lock is held,
  // decremented, then the order + order_items are written.
  async create(userId: string, dto: CreateOrderDto): Promise<OrderWithItems> {
    // Duplicate product_id lines are summed before the stock check, so two
    // lines of the same product can't each pass a check against the same
    // pre-decrement stock_quantity (a lost-update bug in miniature).
    const quantityByProduct = new Map<string, number>();
    for (const item of dto.items) {
      quantityByProduct.set(
        item.product_id,
        (quantityByProduct.get(item.product_id) ?? 0) + item.quantity,
      );
    }
    const productIds = [...quantityByProduct.keys()].sort();

    return this.ordersRepository.manager.transaction(async (manager) => {
      const products = await manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id IN (:...ids)', { ids: productIds })
        .orderBy('product.id', 'ASC')
        .getMany();

      const productMap = new Map(products.map((p) => [p.id, p]));

      const missing = productIds.filter((id) => !productMap.has(id));
      if (missing.length > 0) {
        throw new ApiException(
          HttpStatus.NOT_FOUND,
          'PRODUCT_NOT_FOUND',
          'One or more products do not exist.',
          { product_ids: missing },
        );
      }

      const insufficient = [...quantityByProduct.entries()]
        .filter(([id, qty]) => productMap.get(id)!.stockQuantity < qty)
        .map(([id, qty]) => ({
          product_id: id,
          requested: qty,
          available: productMap.get(id)!.stockQuantity,
        }));
      if (insufficient.length > 0) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INSUFFICIENT_STOCK',
          'One or more items exceed available stock.',
          { items: insufficient },
        );
      }

      for (const [id, qty] of quantityByProduct) {
        productMap.get(id)!.stockQuantity -= qty;
      }
      await manager.save(Product, products);

      let totalAmount = DELIVERY_FEE;
      const orderItems = [...quantityByProduct.entries()].map(([id, qty]) => {
        const product = productMap.get(id)!;
        const subtotal = product.price * qty;
        totalAmount += subtotal;
        return manager.create(OrderItem, {
          productId: id,
          unitPrice: product.price,
          quantity: qty,
          subtotal,
        });
      });

      const order = await manager.save(
        Order,
        manager.create(Order, {
          userId,
          totalAmount,
          deliveryFee: DELIVERY_FEE,
          status: OrderStatus.PENDING,
        }),
      );

      orderItems.forEach((item) => {
        item.orderId = order.id;
      });
      await manager.save(OrderItem, orderItems);

      return { order, items: orderItems };
    });
  }

  // Req 6: customers see only their own orders; admins see all.
  async findMany(
    user: JwtPayload,
    query: QueryOrdersDto,
  ): Promise<PaginatedOrders> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .orderBy('order.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (user.role !== UserRole.ADMIN) {
      qb.andWhere('order.user_id = :userId', { userId: user.sub });
    }
    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    const [orders, total] = await qb.getManyAndCount();

    const orderIds = orders.map((o) => o.id);
    const items =
      orderIds.length > 0
        ? await this.orderItemsRepository.find({
            where: { orderId: In(orderIds) },
          })
        : [];
    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const item of items) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return {
      data: orders.map((o) => toPublicOrder(o, itemsByOrder.get(o.id) ?? [])),
      total,
      page,
      pageSize,
    };
  }

  // Req 7: 404 (not 403) for a non-owner, so order-ID existence isn't leaked.
  async findOneForUser(id: string, user: JwtPayload): Promise<OrderWithItems> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order || (user.role !== UserRole.ADMIN && order.userId !== user.sub)) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    const items = await this.orderItemsRepository.find({
      where: { orderId: id },
    });
    return { order, items };
  }

  // Req 5, 10: shared by the expiry cron and the CANCELLED status transition.
  // Restores each item's stock under the same locking pattern as create(),
  // then marks the order CANCELLED.
  async releaseReservedStock(orderId: string): Promise<void> {
    // Tracks whether this call actually cancelled an order, so the
    // broadcast (realtime Req 1) fires once per real transition — not on the
    // no-op path where orderId doesn't exist — and only after the
    // transaction has committed.
    const cancelled = await this.ordersRepository.manager.transaction(
      async (manager) => {
        const order = await manager.findOne(Order, { where: { id: orderId } });
        if (!order) {
          return false;
        }

        const items = await manager.find(OrderItem, {
          where: { orderId },
        });
        const productIds = [...new Set(items.map((i) => i.productId))].sort();

        if (productIds.length > 0) {
          const products = await manager
            .createQueryBuilder(Product, 'product')
            .setLock('pessimistic_write')
            .where('product.id IN (:...ids)', { ids: productIds })
            .orderBy('product.id', 'ASC')
            .getMany();
          const productMap = new Map(products.map((p) => [p.id, p]));
          for (const item of items) {
            const product = productMap.get(item.productId);
            if (product) {
              product.stockQuantity += item.quantity;
            }
          }
          await manager.save(Product, products);
        }

        order.status = OrderStatus.CANCELLED;
        await manager.save(Order, order);
        return true;
      },
    );

    if (cancelled) {
      this.ordersGateway.emitOrderStatusChanged(orderId, OrderStatus.CANCELLED);
    }
  }

  // specs/delivery/requirements.md Req 1-3: admin assigns a DELIVERY_AGENT to
  // an order that's already being fulfilled.
  async assignAgent(id: string, dto: AssignOrderDto): Promise<OrderWithItems> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (
      order.status !== OrderStatus.PROCESSING &&
      order.status !== OrderStatus.DISPATCHED
    ) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_ORDER_STATUS_FOR_ASSIGNMENT',
        `Cannot assign a delivery agent to an order in status ${order.status}.`,
      );
    }

    const agent = await this.usersService.findById(dto.agent_id);
    if (!agent || agent.role !== UserRole.DELIVERY_AGENT) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_DELIVERY_AGENT',
        'The supplied user is not a delivery agent.',
      );
    }

    order.assignedAgentId = agent.id;
    await this.ordersRepository.save(order);

    return this.findOrderWithItemsOrFail(id);
  }

  // specs/delivery/requirements.md Req 4: an agent's own assigned orders,
  // DISPATCHED (their active queue) shown first.
  async findAssignedOrders(agentId: string): Promise<PublicOrder[]> {
    const orders = await this.ordersRepository
      .createQueryBuilder('order')
      .where('order.assigned_agent_id = :agentId', { agentId })
      .orderBy(
        `CASE WHEN order.status = '${OrderStatus.DISPATCHED}' THEN 0 ELSE 1 END`,
        'ASC',
      )
      .addOrderBy('order.created_at', 'DESC')
      .getMany();

    const orderIds = orders.map((o) => o.id);
    const items =
      orderIds.length > 0
        ? await this.orderItemsRepository.find({
            where: { orderId: In(orderIds) },
          })
        : [];
    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const item of items) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return orders.map((o) => toPublicOrder(o, itemsByOrder.get(o.id) ?? []));
  }

  // Req 8-9: explicit transition table, not ad hoc if/else. `actor` is
  // undefined for internal system-driven transitions (e.g. the payments
  // module's callback handler cascading to PAID, per specs/payments/design.md);
  // specs/delivery/design.md's narrower DELIVERY_AGENT guard only applies
  // when a DELIVERY_AGENT is the one calling in.
  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    actor?: JwtPayload,
  ): Promise<OrderWithItems> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (actor?.role === UserRole.DELIVERY_AGENT) {
      const permitted =
        newStatus === OrderStatus.DELIVERED &&
        order.status === OrderStatus.DISPATCHED &&
        order.assignedAgentId === actor.sub;
      if (!permitted) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          'FORBIDDEN_ROLE',
          'Delivery agents may only mark their own dispatched orders as delivered.',
        );
      }
    }

    if (!canTransition(order.status, newStatus)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_STATUS_TRANSITION',
        `Cannot transition order from ${order.status} to ${newStatus}.`,
      );
    }

    if (
      newStatus === OrderStatus.CANCELLED &&
      cancellationRestoresStock(order.status)
    ) {
      await this.releaseReservedStock(id); // emits internally, see there
    } else {
      order.status = newStatus;
      await this.ordersRepository.save(order);
      // Realtime Req 1: covers both direct admin/agent transitions and
      // payments.service.ts's PAID cascade, which calls this same method.
      this.ordersGateway.emitOrderStatusChanged(id, newStatus);
    }

    return this.findOrderWithItemsOrFail(id);
  }

  // Req 5: PENDING orders older than 20 minutes are cancelled and their
  // reserved stock restored.
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expirePendingOrders(): Promise<void> {
    const cutoff = new Date(Date.now() - RESERVATION_TIMEOUT_MS);
    const expired = await this.ordersRepository.find({
      where: { status: OrderStatus.PENDING, createdAt: LessThan(cutoff) },
    });
    for (const order of expired) {
      await this.releaseReservedStock(order.id);
    }
  }

  private async findOrderWithItemsOrFail(id: string): Promise<OrderWithItems> {
    const order = await this.ordersRepository.findOneOrFail({
      where: { id },
    });
    const items = await this.orderItemsRepository.find({
      where: { orderId: id },
    });
    return { order, items };
  }
}
