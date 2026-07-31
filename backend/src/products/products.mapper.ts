import { Product } from './entities/product.entity';

export interface PublicProduct {
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

// Req 4: stock_quantity = 0 still appears in listings, but `in_stock` must
// read false so clients know to disable add-to-cart.
export function toPublicProduct(product: Product): PublicProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    unit: product.unit,
    stock_quantity: product.stockQuantity,
    in_stock: product.stockQuantity > 0,
    image_url: product.imageUrl,
    category_id: product.categoryId,
    is_available: product.isAvailable,
  };
}
