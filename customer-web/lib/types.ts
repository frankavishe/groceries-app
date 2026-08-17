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

export type PaymentProvider = 'MPESA' | 'MIXX_BY_YAS' | 'AIRTEL_MONEY';
export type PaymentStatus = 'INITIATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED';

export interface PaymentTransaction {
  id: string;
  order_id: string;
  provider: PaymentProvider;
  phone_number: string;
  amount: number;
  reference_id: string | null;
  checkout_request_id: string | null;
  status: PaymentStatus;
  created_at: string;
}
