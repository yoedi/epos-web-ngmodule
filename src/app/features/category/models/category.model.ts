/** Item of GET /categories (docs/api-spec.md section 2). */
export interface CategoryDto {
  id: number;
  name: string;
  product_count: number;
}

/** Application model of a product category. */
export interface Category {
  id: number;
  name: string;
  productCount: number;
}

export function toCategory(dto: CategoryDto): Category {
  return { id: dto.id, name: dto.name, productCount: dto.product_count };
}
