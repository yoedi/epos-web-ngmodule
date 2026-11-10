/** Body of POST /sales (docs/api-spec.md section 4). No prices, no total. */
export interface CreateSaleRequestDto {
  items: { product_id: number; qty: number }[];
  payment_method: 'CASH';
  paid: number;
}

export interface SaleItemDto {
  product_id: number;
  product_name: string;
  unit: string;
  price: number;
  qty: number;
  subtotal: number;
}

/** Response 201 of POST /sales. */
export interface SaleResponseDto {
  id: number;
  invoice_no: string;
  cashier: { id: number; name: string };
  items: SaleItemDto[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: 'CASH';
  paid: number;
  change_amount: number;
  status: 'COMPLETED';
  created_at: string;
}
