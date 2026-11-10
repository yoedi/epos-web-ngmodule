import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, switchMap, throwError, timer } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AppError } from '../../../core/http/api-error.model';
import { MOCK_STORE } from '../../../core/store/mock-store-settings.service';
import { MOCK_PRODUCTS } from '../../product/services/mock-product.service';
import { jakartaToday } from '../models/date-range';
import {
  SaleDetailDto,
  SaleItemDto,
  SaleListParamsDto,
  SaleListResponseDto,
  SaleSummaryDto,
} from '../models/sale-history.model';
import { MOCK_CASHIERS } from './mock-user.service';
import { SaleHistoryService } from './sale-history.service';

const MOCK_LATENCY_MS = 400;
const MOCK_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const OPENING_MINUTE = 7 * 60 + 30;
const CLOSING_MINUTE = 21 * 60;
const CASH_STEPS = [5000, 10000, 20000, 50000, 100000];

export type StoredSale = Omit<SaleDetailDto, 'store'>;

/** Sample cart from PRD section 12: total Rp 144.500, paid Rp 150.000. */
const PRD_SAMPLE_CART: readonly [number, number][] = [
  [1, 1],
  [5, 5],
  [4, 1],
  [8, 10],
];

/** Small seeded PRNG (mulberry32) so a given day always has the same sales. */
function seededRandom(seedText: string): () => number {
  let seed = [...seedText].reduce((hash, ch) => (Math.imul(hash, 31) + ch.charCodeAt(0)) | 0, 7);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function between(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function line(productId: number, qty: number): SaleItemDto {
  const product = MOCK_PRODUCTS.find((p) => p.id === productId)!;
  return {
    product_id: product.id,
    product_name: product.name,
    unit: product.unit,
    price: product.sell_price,
    qty,
    subtotal: product.sell_price * qty,
  };
}

function randomLines(random: () => number): SaleItemDto[] {
  const pool = [...MOCK_PRODUCTS];
  const count = between(random, 1, 4);
  const lines: SaleItemDto[] = [];
  for (let i = 0; i < count; i++) {
    const [product] = pool.splice(between(random, 0, pool.length - 1), 1);
    const maxQty = product.sell_price < 5000 ? 10 : 3;
    lines.push(line(product.id, between(random, 1, maxQty)));
  }
  return lines;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function minutesNowInJakarta(now: Date): number {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** Sales of one day, oldest first, numbered INV-YYYYMMDD-NNNN (PRD 14.4). */
function salesOfDay(date: string, lastMinute: number, firstId: number): StoredSale[] {
  const random = seededRandom(date);
  const sales: StoredSale[] = [];
  for (
    let minute = OPENING_MINUTE + between(random, 0, 20);
    minute <= lastMinute;
    minute += between(random, 6, 28)
  ) {
    const items = randomLines(random);
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const step = CASH_STEPS[between(random, 0, CASH_STEPS.length - 1)];
    const paid = random() < 0.25 ? total : Math.ceil(total / step) * step;
    const cashier = MOCK_CASHIERS[between(random, 0, MOCK_CASHIERS.length - 1)];
    const seq = sales.length + 1;
    sales.push({
      id: firstId + sales.length,
      invoice_no: `INV-${date.replace(/-/g, '')}-${String(seq).padStart(4, '0')}`,
      cashier: { id: cashier.id, name: cashier.name },
      items,
      subtotal: total,
      discount: 0,
      total,
      payment_method: 'CASH',
      paid,
      change_amount: paid - total,
      status: 'COMPLETED',
      created_at: `${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:${pad(between(random, 0, 59))}+07:00`,
    });
  }
  return sales;
}

/** The latest sale of today is the PRD sample cart, served by Rina. */
function withPrdSample(sale: StoredSale): StoredSale {
  const items = PRD_SAMPLE_CART.map(([productId, qty]) => line(productId, qty));
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const rina = MOCK_CASHIERS.find((c) => c.username === 'rina')!;
  return {
    ...sale,
    cashier: { id: rina.id, name: rina.name },
    items,
    subtotal: total,
    total,
    paid: 150000,
    change_amount: 150000 - total,
  };
}

export function buildSales(now: Date): StoredSale[] {
  const sales: StoredSale[] = [];
  for (let back = MOCK_DAYS - 1; back >= 0; back--) {
    const date = jakartaToday(new Date(now.getTime() - back * DAY_MS));
    const lastMinute = back === 0 ? minutesNowInJakarta(now) : CLOSING_MINUTE;
    const day = salesOfDay(date, lastMinute, sales.length + 1);
    if (back === 0 && day.length > 0) {
      day[day.length - 1] = withPrdSample(day[day.length - 1]);
    }
    sales.push(...day);
  }
  return sales;
}

function toSummary(sale: StoredSale): SaleSummaryDto {
  return {
    id: sale.id,
    invoice_no: sale.invoice_no,
    cashier_name: sale.cashier.name,
    item_count: sale.items.reduce((sum, item) => sum + item.qty, 0),
    total: sale.total,
    created_at: sale.created_at,
  };
}

/**
 * Stand-in for SaleHistoryService while the backend is not ready. Serves two
 * weeks of generated sales up to the current time and follows the contract of
 * docs/api-spec.md section 4, including the CASHIER rule (own sales, today).
 */
@Injectable()
export class MockSaleHistoryService extends SaleHistoryService {
  private readonly auth = inject(AuthService);
  private readonly sales = buildSales(new Date());

  protected override requestList(params: SaleListParamsDto): Observable<SaleListResponseDto> {
    const scoped = this.scopeForRole(params);
    const invoiceTerm = scoped.invoice_no?.toLowerCase() ?? '';
    const filtered = this.sales.filter((sale) => {
      const date = sale.created_at.slice(0, 10);
      return (
        date >= scoped.start_date &&
        date <= scoped.end_date &&
        (scoped.cashier_id === undefined || sale.cashier.id === scoped.cashier_id) &&
        sale.invoice_no.toLowerCase().includes(invoiceTerm)
      );
    });

    const sign = scoped.sort.endsWith(',asc') ? 1 : -1;
    filtered.sort((a, b) => sign * a.created_at.localeCompare(b.created_at));

    const revenue = filtered.reduce((sum, sale) => sum + sale.total, 0);
    const count = filtered.length;
    const start = scoped.page * scoped.size;
    const totalPages = Math.ceil(count / scoped.size);
    return this.respond({
      content: filtered.slice(start, start + scoped.size).map(toSummary),
      summary: {
        total_revenue: revenue,
        transaction_count: count,
        // Server-side figure; the frontend never divides money itself.
        average_transaction: count === 0 ? 0 : Math.round(revenue / count),
      },
      page: scoped.page,
      size: scoped.size,
      total_elements: count,
      total_pages: totalPages,
      last: scoped.page >= totalPages - 1,
    });
  }

  protected override requestDetail(id: number): Observable<SaleDetailDto> {
    const sale = this.sales.find((s) => s.id === id);
    const user = this.auth.currentUser;
    const hidden =
      user?.role === 'CASHIER' &&
      (sale?.cashier.id !== user.id || sale.created_at.slice(0, 10) !== jakartaToday());
    if (!sale || hidden) {
      return this.fail({ code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan', status: 404 });
    }
    return this.respond({ ...sale, store: { ...MOCK_STORE } });
  }

  /** CASHIER only receives their own sales of today, whatever filter is sent. */
  private scopeForRole(params: SaleListParamsDto): SaleListParamsDto {
    const user = this.auth.currentUser;
    if (user?.role !== 'CASHIER') {
      return params;
    }
    const today = jakartaToday();
    return { ...params, start_date: today, end_date: today, cashier_id: user.id };
  }

  private respond<T>(body: T): Observable<T> {
    return of(body).pipe(delay(MOCK_LATENCY_MS));
  }

  private fail(error: AppError): Observable<never> {
    return timer(MOCK_LATENCY_MS).pipe(switchMap(() => throwError(() => error)));
  }
}
