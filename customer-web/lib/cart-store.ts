// Pure localStorage load/save for the client-side cart — mirrors
// mobile-app/lib/data/cart_repository.dart's Hive-backed CartRepository:
// there is no backend cart resource (see specs/customer-web/design.md's
// Cart section), so this is the entire persistence layer. Versioned key so
// a future shape change can be detected/migrated rather than crashing on
// JSON.parse of stale data.
const CART_STORAGE_KEY = 'groceries.cart.v1';

// Mirrors mobile-app/lib/models/cart_item.dart field-for-field. A price
// snapshot is kept (rather than re-fetching the product) so the cart still
// renders correctly even if a product's price changes or it's later removed
// from the catalog.
export interface CartItem {
  productId: string;
  name: string;
  unit: string;
  imageUrl: string | null;
  priceSnapshot: number;
  quantity: number;
}

export function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}
