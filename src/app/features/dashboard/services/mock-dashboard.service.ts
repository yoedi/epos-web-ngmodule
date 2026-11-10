import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { MOCK_PRODUCTS } from '../../product/services/mock-product.service';
import { jakartaToday } from '../../sale-history/models/date-range';
import {
  StoredSale,
  buildSales,
} from '../../sale-history/services/mock-sale-history.service';
import {
  DailyReportDto,
  DailyReportParamsDto,
  HourlySalesDto,
  LowStockProductDto,
  TopProductDto,
} from '../models/daily-report.model';
import { DashboardService } from './dashboard.service';

const MOCK_LATENCY_MS = 400;
const TOP_PRODUCTS_LIMIT = 5;

function hourlySales(sales: readonly StoredSale[]): HourlySalesDto[] {
  const byHour = new Map<number, HourlySalesDto>();
  for (const sale of sales) {
    // created_at is already in +07:00: "2026-09-16T14:32:10+07:00".
    const hour = Number(sale.created_at.slice(11, 13));
    const entry = byHour.get(hour) ?? { hour, total: 0, transaction_count: 0 };
    entry.total += sale.total;
    entry.transaction_count += 1;
    byHour.set(hour, entry);
  }
  return [...byHour.values()].sort((a, b) => a.hour - b.hour);
}

function topProducts(sales: readonly StoredSale[]): TopProductDto[] {
  const byProduct = new Map<number, TopProductDto>();
  for (const item of sales.flatMap((sale) => sale.items)) {
    const entry = byProduct.get(item.product_id) ?? {
      product_id: item.product_id,
      sku: MOCK_PRODUCTS.find((p) => p.id === item.product_id)?.sku ?? '',
      product_name: item.product_name,
      qty_sold: 0,
      total: 0,
    };
    entry.qty_sold += item.qty;
    entry.total += item.subtotal;
    byProduct.set(item.product_id, entry);
  }
  return [...byProduct.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_PRODUCTS_LIMIT);
}

/** Active products at or below their minimum, emptiest first. */
function lowStockProducts(): LowStockProductDto[] {
  return MOCK_PRODUCTS.filter((p) => p.is_active && p.stock_status !== 'SAFE')
    .sort((a, b) => a.stock - b.stock)
    .map((p) => ({
      product_id: p.id,
      sku: p.sku,
      product_name: p.name,
      stock: p.stock,
      min_stock: p.min_stock,
      stock_status: p.stock_status,
    }));
}

/**
 * Stand-in for DashboardService while the backend is not ready. Today's figures
 * come from the same generated sales as the Riwayat Transaksi mock, so both
 * screens agree; low stock comes from the sample products of PRD section 12.
 * Before the store opens (07:30) there are no sales yet: the empty state.
 */
@Injectable()
export class MockDashboardService extends DashboardService {
  protected override requestDaily(
    params: DailyReportParamsDto,
  ): Observable<DailyReportDto> {
    const now = new Date();
    const date = params.date ?? jakartaToday(now);
    const sales = buildSales(now).filter((sale) =>
      sale.created_at.startsWith(date),
    );
    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const lowStock = lowStockProducts();
    return of<DailyReportDto>({
      date,
      total_revenue: revenue,
      transaction_count: sales.length,
      // Server-side figure; the frontend never divides money itself.
      average_transaction:
        sales.length === 0 ? 0 : Math.round(revenue / sales.length),
      low_stock_count: lowStock.length,
      hourly_sales: hourlySales(sales),
      top_products: topProducts(sales),
      low_stock_products: lowStock,
    }).pipe(delay(MOCK_LATENCY_MS));
  }
}
