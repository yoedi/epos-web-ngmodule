import { StockStatus } from '../../../shared/ui/stock-badge/stock-badge.component';

export type ProductUnit = 'PCS' | 'KG' | 'LITER' | 'BUNGKUS' | 'DUS';

/** Values of the `status` filter on GET /products. */
export type ProductStatusFilter = 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK';

/** Unit choices in the product form (PRD 9.5). */
export const UNIT_OPTIONS: readonly { label: string; value: ProductUnit }[] = [
  { label: 'pcs', value: 'PCS' },
  { label: 'kg', value: 'KG' },
  { label: 'liter', value: 'LITER' },
  { label: 'bungkus', value: 'BUNGKUS' },
  { label: 'dus', value: 'DUS' },
];

/** Product object of the API (docs/api-spec.md section 3). */
export interface ProductDto {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  category: { id: number; name: string };
  unit: ProductUnit;
  /** Omitted by the server for the CASHIER role. */
  cost_price?: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  stock_status: StockStatus;
  is_active: boolean;
}

/** Application model of a product. */
export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  category: { id: number; name: string };
  unit: ProductUnit;
  /** Null when the signed-in role may not see it. */
  costPrice: number | null;
  sellPrice: number;
  stock: number;
  minStock: number;
  stockStatus: StockStatus;
  isActive: boolean;
}

export function toProduct(dto: ProductDto): Product {
  return {
    id: dto.id,
    sku: dto.sku,
    barcode: dto.barcode,
    name: dto.name,
    category: { id: dto.category.id, name: dto.category.name },
    unit: dto.unit,
    costPrice: dto.cost_price ?? null,
    sellPrice: dto.sell_price,
    stock: dto.stock,
    minStock: dto.min_stock,
    stockStatus: dto.stock_status,
    isActive: dto.is_active,
  };
}

// ── Listing ──────────────────────────────────────────────────

export type ProductSortField =
  | 'sku'
  | 'name'
  | 'category.name'
  | 'sell_price'
  | 'cost_price'
  | 'stock'
  | 'is_active';

export interface ProductSort {
  field: ProductSortField;
  direction: 'asc' | 'desc';
}

export interface ProductQuery {
  search: string;
  categoryId: number | null;
  status: ProductStatusFilter | null;
  page: number;
  size: number;
  sort: ProductSort | null;
}

/** Query params of GET /products. Absent means "not filtered". */
export interface ProductListParamsDto {
  search?: string;
  category_id?: number;
  status?: ProductStatusFilter;
  page: number;
  size: number;
  sort?: string;
}

export function toListParams(query: ProductQuery): ProductListParamsDto {
  const params: ProductListParamsDto = { page: query.page, size: query.size };
  if (query.search) {
    params.search = query.search;
  }
  if (query.categoryId !== null) {
    params.category_id = query.categoryId;
  }
  if (query.status) {
    params.status = query.status;
  }
  if (query.sort) {
    params.sort = `${query.sort.field},${query.sort.direction}`;
  }
  return params;
}

// ── Create & edit ────────────────────────────────────────────

/** Validated content of the product form. */
export interface ProductFormValue {
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: number;
  unit: ProductUnit;
  costPrice: number;
  sellPrice: number;
  /** Only used when creating. */
  initialStock: number;
  minStock: number;
  isActive: boolean;
}

/** Body of POST /products. */
export interface CreateProductDto {
  sku: string;
  barcode?: string;
  name: string;
  category_id: number;
  unit: ProductUnit;
  cost_price: number;
  sell_price: number;
  initial_stock: number;
  min_stock: number;
}

/** Body of PATCH /products/{id}. `stock` is not editable through this endpoint. */
export interface UpdateProductDto {
  sku: string;
  barcode: string | null;
  name: string;
  category_id: number;
  unit: ProductUnit;
  cost_price: number;
  sell_price: number;
  min_stock: number;
}

export function toCreateDto(value: ProductFormValue): CreateProductDto {
  return {
    sku: value.sku,
    ...(value.barcode ? { barcode: value.barcode } : {}),
    name: value.name,
    category_id: value.categoryId,
    unit: value.unit,
    cost_price: value.costPrice,
    sell_price: value.sellPrice,
    initial_stock: value.initialStock,
    min_stock: value.minStock,
  };
}

export function toUpdateDto(value: ProductFormValue): UpdateProductDto {
  return {
    sku: value.sku,
    barcode: value.barcode,
    name: value.name,
    category_id: value.categoryId,
    unit: value.unit,
    cost_price: value.costPrice,
    sell_price: value.sellPrice,
    min_stock: value.minStock,
  };
}

// ── Margin ───────────────────────────────────────────────────

export interface Margin {
  amount: number;
  /** Whole percent of the selling price; null when the selling price is 0. */
  percent: number | null;
}

/** "Margin Rp 1.500 / 12%" in the product form. For display only. */
export function marginOf(costPrice: number, sellPrice: number): Margin {
  const amount = sellPrice - costPrice;
  return {
    amount,
    percent: sellPrice === 0 ? null : Math.round((amount * 100) / sellPrice),
  };
}
