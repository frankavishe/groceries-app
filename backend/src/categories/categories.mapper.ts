import { Category } from './entities/category.entity';

export interface PublicCategory {
  id: number;
  name: string;
  icon_url: string | null;
  is_active: boolean;
}

export function toPublicCategory(category: Category): PublicCategory {
  return {
    id: category.id,
    name: category.name,
    icon_url: category.iconUrl,
    is_active: category.isActive,
  };
}
