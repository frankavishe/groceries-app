import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';

export interface PublicOrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PublicOrder {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  total_amount: number;
  delivery_fee: number;
  items: PublicOrderItem[];
  created_at: Date;
}

function toPublicOrderItem(item: OrderItem): PublicOrderItem {
  return {
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: item.subtotal,
  };
}

export function toPublicOrder(order: Order, items: OrderItem[]): PublicOrder {
  return {
    id: order.id,
    user_id: order.userId,
    status: order.status,
    total_amount: order.totalAmount,
    delivery_fee: order.deliveryFee,
    items: items.map(toPublicOrderItem),
    created_at: order.createdAt,
  };
}
