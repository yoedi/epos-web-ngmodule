/** Item of GET /categories, also the body of POST/PATCH responses (docs/api-spec.md section 2). */
export interface CategoryDto {
  id: number;
  name: string;
  product_count: number;
}

/** Request body of POST /categories and PATCH /categories/{id}. */
export interface SaveCategoryDto {
  name: string;
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
