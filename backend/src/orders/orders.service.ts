import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { ApiException } from '../common/exceptions/api-exception';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Product } from '../products/entities/product.entity';
import { UserRole } from '../users/entities/user.entity';
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
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
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
    await this.ordersRepository.manager.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (!order) {
        return;
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
    });
  }

  // Req 8-9: explicit transition table, not ad hoc if/else.
  async updateStatus(
    id: string,
    newStatus: OrderStatus,
  ): Promise<OrderWithItems> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
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
      await this.releaseReservedStock(id);
    } else {
      order.status = newStatus;
      await this.ordersRepository.save(order);
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
