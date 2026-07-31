import { OrderStatus } from './entities/order.entity';

// Single source of truth for valid order-status transitions (Req 9, design.md
// "Status State Machine"). Referenced identically by this module's PATCH
// .../status handler and, once built, the payments-callback handler that also
// moves orders.status (e.g. PAID on successful payment) — do not re-derive
// this table elsewhere.
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.DISPATCHED, OrderStatus.CANCELLED],
  [OrderStatus.DISPATCHED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

// Req 10: stock was reserved at creation (PENDING) and stays reserved through
// PAID; cancelling from either state must restore it. Cancelling from
// PROCESSING/DISPATCHED does not (goods are already committed to fulfillment).
export function cancellationRestoresStock(from: OrderStatus): boolean {
  return from === OrderStatus.PENDING || from === OrderStatus.PAID;
}
