/**
 * Fields of the product object (docs/api-spec.md section 3) that the cashier
 * uses. `cost_price` is left out: the server omits it for CASHIER anyway.
 */
export interface CashierProductDto {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  category: { id: number; name: string };
  unit: string;
  sell_price: number;
  stock: number;
  min_stock: number;
  stock_status: 'SAFE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  is_active: boolean;
}

/** Query params of GET /products used by the cashier search. */
export interface ProductSearchParamsDto {
  search: string;
  status: 'ACTIVE';
  page: number;
  size: number;
}
