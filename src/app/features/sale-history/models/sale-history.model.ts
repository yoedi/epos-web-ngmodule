import { Page, PageResponseDto, toPage } from '../../../core/http/page.model';
import {
  StoreSettings,
  StoreSettingsDto,
  toStoreSettings,
} from '../../../core/store/store-settings.models';

// ── Listing: GET /sales ──────────────────────────────────────

/** Item of GET /sales (docs/api-spec.md section 4). */
export interface SaleSummaryDto {
  id: number;
  invoice_no: string;
  cashier_name: string;
  /** Sum of qty over all lines, not the number of lines. */
  item_count: number;
  total: number;
  created_at: string;
}

/** Aggregates over the whole filter result, computed by the server. */
export interface SaleTotalsDto {
  total_revenue: number;
  transaction_count: number;
  average_transaction: number;
}

export interface SaleListResponseDto extends PageResponseDto<SaleSummaryDto> {
  summary: SaleTotalsDto;
}

/** Query params of GET /sales. Absent means "not filtered". */
export interface SaleListParamsDto {
  start_date: string;
  end_date: string;
  cashier_id?: number;
  invoice_no?: string;
  page: number;
  size: number;
  sort: string;
}

/** Application model of one row of the history. */
export interface SaleSummary {
  id: number;
  invoiceNo: string;
  cashierName: string;
  itemCount: number;
  total: number;
  createdAt: Date;
}

export interface SaleTotals {
  totalRevenue: number;
  transactionCount: number;
  averageTransaction: number;
}

export interface SaleListResult {
  page: Page<SaleSummary>;
  totals: SaleTotals;
}

export type SortDirection = 'asc' | 'desc';

/** Filter state of the history screen. Dates are `YYYY-MM-DD`, Asia/Jakarta. */
export interface SaleQuery {
  startDate: string;
  endDate: string;
  cashierId: number | null;
  invoiceNo: string;
  page: number;
  size: number;
  /** Sort on created_at, the only sortable column (mockup 5a). */
  direction: SortDirection;
}

export function toListParams(query: SaleQuery): SaleListParamsDto {
  const params: SaleListParamsDto = {
    start_date: query.startDate,
    end_date: query.endDate,
    page: query.page,
    size: query.size,
    sort: `created_at,${query.direction}`,
  };
  if (query.cashierId !== null) {
    params.cashier_id = query.cashierId;
  }
  if (query.invoiceNo) {
    params.invoice_no = query.invoiceNo;
  }
  return params;
}

export function toSaleSummary(dto: SaleSummaryDto): SaleSummary {
  return {
    id: dto.id,
    invoiceNo: dto.invoice_no,
    cashierName: dto.cashier_name,
    itemCount: dto.item_count,
    total: dto.total,
    createdAt: new Date(dto.created_at),
  };
}

export function toSaleListResult(dto: SaleListResponseDto): SaleListResult {
  return {
    page: toPage(dto, toSaleSummary),
    totals: {
      totalRevenue: dto.summary.total_revenue,
      transactionCount: dto.summary.transaction_count,
      averageTransaction: dto.summary.average_transaction,
    },
  };
}

// ── Detail: GET /sales/{id} ──────────────────────────────────

export interface SaleItemDto {
  product_id: number;
  product_name: string;
  unit: string;
  price: number;
  qty: number;
  subtotal: number;
}

/** Same object as the POST /sales response, plus the store for the receipt header. */
export interface SaleDetailDto {
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
  store: StoreSettingsDto;
}

/** Line of a saved sale: name and price are a snapshot from the time of sale. */
export interface SaleDetailLine {
  productId: number;
  productName: string;
  unit: string;
  price: number;
  qty: number;
  subtotal: number;
}

/** A saved sale as shown in the detail drawer and on the reprinted receipt. */
export interface SaleDetail {
  id: number;
  invoiceNo: string;
  cashierName: string;
  items: SaleDetailLine[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  createdAt: Date;
  store: StoreSettings;
}

export function toSaleDetail(dto: SaleDetailDto): SaleDetail {
  return {
    id: dto.id,
    invoiceNo: dto.invoice_no,
    cashierName: dto.cashier.name,
    items: dto.items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      unit: item.unit,
      price: item.price,
      qty: item.qty,
      subtotal: item.subtotal,
    })),
    subtotal: dto.subtotal,
    discount: dto.discount,
    total: dto.total,
    paid: dto.paid,
    change: dto.change_amount,
    createdAt: new Date(dto.created_at),
    store: toStoreSettings(dto.store),
  };
}
