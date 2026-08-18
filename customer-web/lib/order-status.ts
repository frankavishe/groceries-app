// Mirrors backend/src/orders/entities/order.entity.ts's OrderStatus enum.
// Unlike admin-web's lib/order-status.ts, no transitions table is needed
// here — customers never update an order's status.
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';
