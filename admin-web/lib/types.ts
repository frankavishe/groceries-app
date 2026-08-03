import type { OrderStatus } from './order-status';

export interface Category {
  id: number;
  name: string;
  icon_url: string | null;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  stock_quantity: number;
  in_stock: boolean;
  image_url: string | null;
  category_id: number | null;
  is_available: boolean;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  user_id: string | null;
  assigned_agent_id: string | null;
  status: OrderStatus;
  total_amount: number;
  delivery_fee: number;
  items: OrderItem[];
  created_at: string;
}

// specs/delivery/requirements.md — a DELIVERY_AGENT candidate for order
// assignment (GET /delivery/agents, admin-only).
export interface DeliveryAgent {
  id: string;
  full_name: string;
  phone_number: string;
}
