import { SaleItemRequest } from './cart';
import { PaymentMethod } from './payment';

/** What the client sends to save a sale: products, quantities and cash received only. */
export interface SaleRequest {
  items: SaleItemRequest[];
  paymentMethod: PaymentMethod;
  paid: number;
}

/** Line of a saved sale, a snapshot of name and price at the time of sale. */
export interface SaleLine {
  productId: number;
  productName: string;
  unit: string;
  price: number;
  qty: number;
  subtotal: number;
}

/** Sale as saved and recalculated by the server. Its amounts are the ones to show. */
export interface Sale {
  id: number;
  invoiceNo: string;
  cashierName: string;
  items: SaleLine[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paid: number;
  change: number;
  createdAt: Date;
}
