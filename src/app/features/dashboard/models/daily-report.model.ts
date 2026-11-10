import { StockStatus } from '../../../shared/ui/stock-badge/stock-badge.component';

// ── DTO: GET /reports/daily (docs/api-spec.md section 6) ─────

export interface HourlySalesDto {
  hour: number;
  total: number;
  transaction_count: number;
}

export interface TopProductDto {
  product_id: number;
  sku: string;
  product_name: string;
  qty_sold: number;
  total: number;
}

export interface LowStockProductDto {
  product_id: number;
  sku: string;
  product_name: string;
  stock: number;
  min_stock: number;
  stock_status: StockStatus;
}

export interface DailyReportDto {
  /** `YYYY-MM-DD`, Asia/Jakarta. */
  date: string;
  total_revenue: number;
  transaction_count: number;
  average_transaction: number;
  low_stock_count: number;
  /** Only hours that have sales; the frontend fills the gaps with 0. */
  hourly_sales: HourlySalesDto[];
  /** At most 5. */
  top_products: TopProductDto[];
  low_stock_products: LowStockProductDto[];
}

export interface DailyReportParamsDto {
  date?: string;
}

// ── Application model ────────────────────────────────────────

export interface HourlySales {
  hour: number;
  total: number;
  transactionCount: number;
}

export interface TopProduct {
  productId: number;
  sku: string;
  name: string;
  qtySold: number;
  total: number;
}

export interface LowStockProduct {
  productId: number;
  sku: string;
  name: string;
  stock: number;
  minStock: number;
  status: StockStatus;
}

export interface DailyReport {
  /** `YYYY-MM-DD`, Asia/Jakarta. */
  date: string;
  totalRevenue: number;
  transactionCount: number;
  averageTransaction: number;
  lowStockCount: number;
  /** One entry per hour of the chart range, empty hours included. */
  hourlySales: HourlySales[];
  topProducts: TopProduct[];
  lowStockProducts: LowStockProduct[];
}

/** Chart range of mockup 3a (08:00 – 20:00); widened when sales fall outside it. */
export const CHART_FIRST_HOUR = 8;
export const CHART_LAST_HOUR = 20;

/** Every hour from the chart range, with 0 for hours the server left out. */
export function fillHours(
  sales: readonly HourlySales[],
  firstHour = CHART_FIRST_HOUR,
  lastHour = CHART_LAST_HOUR,
): HourlySales[] {
  const byHour = new Map(sales.map((s) => [s.hour, s]));
  const from = Math.min(firstHour, ...sales.map((s) => s.hour));
  const to = Math.max(lastHour, ...sales.map((s) => s.hour));
  const hours: HourlySales[] = [];
  for (let hour = from; hour <= to; hour++) {
    hours.push(byHour.get(hour) ?? { hour, total: 0, transactionCount: 0 });
  }
  return hours;
}

export interface ChartScale {
  /** Top of the y axis. */
  max: number;
  /** Axis labels from top to bottom: max, half, 0. */
  ticks: [number, number, number];
}

/**
 * Y axis of the hourly chart: the peak rounded up on its second digit
 * (1.090.000 → 1.100.000), and kept even so the middle tick is a whole rupiah.
 * Only places gridlines; every bar still shows its exact total.
 */
export function chartScale(peak: number): ChartScale {
  if (peak <= 0) {
    return { max: 0, ticks: [0, 0, 0] };
  }
  const step = Math.max(1, 10 ** (Math.floor(Math.log10(peak)) - 1));
  let max = Math.ceil(peak / step) * step;
  if (max % 2 !== 0) {
    max += step;
  }
  return { max, ticks: [max, max / 2, 0] };
}

export function toDailyReport(dto: DailyReportDto): DailyReport {
  return {
    date: dto.date,
    totalRevenue: dto.total_revenue,
    transactionCount: dto.transaction_count,
    averageTransaction: dto.average_transaction,
    lowStockCount: dto.low_stock_count,
    hourlySales: fillHours(
      dto.hourly_sales.map((h) => ({
        hour: h.hour,
        total: h.total,
        transactionCount: h.transaction_count,
      })),
    ),
    topProducts: dto.top_products.map((p) => ({
      productId: p.product_id,
      sku: p.sku,
      name: p.product_name,
      qtySold: p.qty_sold,
      total: p.total,
    })),
    lowStockProducts: dto.low_stock_products.map((p) => ({
      productId: p.product_id,
      sku: p.sku,
      name: p.product_name,
      stock: p.stock,
      minStock: p.min_stock,
      status: p.stock_status,
    })),
  };
}
