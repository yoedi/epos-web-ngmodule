import { Injectable } from '@angular/core';
import { Observable, delay, of, switchMap, throwError, timer } from 'rxjs';

import { AppError } from '../../../core/http/api-error.model';
import { PageResponseDto } from '../../../core/http/page.model';
import { MOCK_PRODUCTS } from '../../product/services/mock-product.service';
import { StockAdjustmentRequestDto } from '../models/stock-adjustment.model';
import {
  AdjustmentReason,
  ProductSearchParamsDto,
  StockInRequestDto,
  StockInResponseDto,
  StockMovementDto,
  StockMovementParamsDto,
  StockProductDto,
} from '../models/stock-in.model';
import { StockService } from './stock.service';

const MOCK_LATENCY_MS = 400;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Earlier stock-in batches, matching the history panel of mockup 6a. Oldest first. */
const SEED_BATCHES: readonly {
  at: string;
  note: string;
  items: readonly [productId: number, qty: number, before: number][];
}[] = [
  { at: '2026-09-05T10:25:00+07:00', note: 'Tambahan beras premium', items: [[1, 10, 14]] },
  {
    at: '2026-09-09T08:40:00+07:00',
    note: 'Belanja grosir mingguan',
    items: [
      [2, 12, 2],
      [4, 10, 5],
    ],
  },
  { at: '2026-09-12T16:02:00+07:00', note: 'Kiriman distributor mi instan', items: [[5, 96, 40]] },
  {
    at: '2026-09-16T09:14:00+07:00',
    note: 'Belanja grosir mingguan',
    items: [
      [3, 24, 22],
      [8, 50, 45],
    ],
  },
];

/** Earlier stock counts for the "Riwayat Penyesuaian Terbaru" panel. Oldest first. */
const SEED_ADJUSTMENTS: readonly {
  at: string;
  productId: number;
  before: number;
  after: number;
  reason: AdjustmentReason;
  note: string | null;
}[] = [
  { at: '2026-09-06T17:10:00+07:00', productId: 3, before: 23, after: 22, reason: 'RUSAK', note: 'Kemasan sobek 1 bungkus' },
  { at: '2026-09-10T20:05:00+07:00', productId: 8, before: 43, after: 45, reason: 'SALAH_HITUNG', note: null },
  { at: '2026-09-14T07:45:00+07:00', productId: 4, before: 10, after: 8, reason: 'KEDALUWARSA', note: 'Telur retak dan busuk' },
];

/**
 * The API answers 422 "Tidak ada selisih stok" when the count equals the stock,
 * but docs/api-spec.md does not name its `code` yet. Placeholder until it does.
 */
const NO_DIFFERENCE_CODE = 'NO_STOCK_DIFFERENCE';

function productName(id: number): string {
  return MOCK_PRODUCTS.find((p) => p.id === id)?.name ?? '';
}

function seedMovements(): StockMovementDto[] {
  let id = 0;
  const stockIn = SEED_BATCHES.flatMap((batch) =>
    batch.items.map(
      ([productId, qty, before]): StockMovementDto => ({
        id: ++id,
        product_id: productId,
        product_name: productName(productId),
        type: 'IN',
        qty,
        stock_before: before,
        stock_after: before + qty,
        note: batch.note,
        created_at: batch.at,
      }),
    ),
  );
  const adjustments = SEED_ADJUSTMENTS.map(
    (seed): StockMovementDto => ({
      id: ++id,
      product_id: seed.productId,
      product_name: productName(seed.productId),
      type: 'ADJUSTMENT',
      qty: seed.after - seed.before,
      stock_before: seed.before,
      stock_after: seed.after,
      reason: seed.reason,
      note: seed.note,
      created_at: seed.at,
    }),
  );
  return [...stockIn, ...adjustments];
}

/** "2026-09-16T15:02:00+07:00" for the current moment. */
function nowInJakarta(): string {
  const shifted = new Date(Date.now() + JAKARTA_OFFSET_MS).toISOString();
  return `${shifted.slice(0, 19)}+07:00`;
}

function toStockProductDto(product: (typeof MOCK_PRODUCTS)[number], stock: number): StockProductDto {
  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    stock,
  };
}

/**
 * Stand-in for StockService while the backend is not ready. Follows
 * docs/api-spec.md sections 3 and 5 with the sample products of PRD section 12.
 * Saved stock lasts until the page is reloaded.
 */
@Injectable()
export class MockStockService extends StockService {
  private readonly stock = new Map(MOCK_PRODUCTS.map((p) => [p.id, p.stock]));
  private movements: StockMovementDto[] = seedMovements();

  protected override requestProducts(
    params: ProductSearchParamsDto,
  ): Observable<PageResponseDto<StockProductDto>> {
    const term = params.search.toLowerCase();
    const found = MOCK_PRODUCTS.filter((p) =>
      [p.name, p.sku, p.barcode ?? ''].some((value) => value.toLowerCase().includes(term)),
    );
    const start = params.page * params.size;
    const totalPages = Math.ceil(found.length / params.size);
    return this.respond({
      content: found.slice(start, start + params.size).map((p) => this.product(p.id)!),
      page: params.page,
      size: params.size,
      total_elements: found.length,
      total_pages: totalPages,
      last: params.page >= totalPages - 1,
    });
  }

  protected override requestByBarcode(code: string): Observable<StockProductDto> {
    const product = MOCK_PRODUCTS.find((p) => p.barcode === code);
    if (!product) {
      return this.fail({
        code: 'NOT_FOUND',
        message: `Barang dengan barcode ${code} tidak ditemukan`,
        status: 404,
      });
    }
    return this.respond(this.product(product.id)!);
  }

  protected override requestStockIn(body: StockInRequestDto): Observable<StockInResponseDto> {
    const fieldErrors = body.items.flatMap((item, i) =>
      Number.isInteger(item.qty) && item.qty > 0
        ? []
        : [{ field: `items[${i}].qty`, message: 'Jumlah harus lebih dari 0' }],
    );
    if (body.items.length === 0) {
      fieldErrors.push({ field: 'items', message: 'Tambahkan minimal satu barang' });
    }
    if (fieldErrors.length > 0) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'Validasi gagal', status: 400, fieldErrors });
    }
    const missing = body.items.find((item) => !this.stock.has(item.product_id));
    if (missing) {
      return this.fail({ code: 'NOT_FOUND', message: 'Produk tidak ditemukan', status: 404 });
    }

    // All items in one go, like the single database transaction on the server.
    const createdAt = nowInJakarta();
    let id = Math.max(0, ...this.movements.map((m) => m.id));
    const saved = body.items.map((item): StockMovementDto => {
      const before = this.stock.get(item.product_id)!;
      const after = before + item.qty;
      this.stock.set(item.product_id, after);
      return {
        id: ++id,
        product_id: item.product_id,
        product_name: productName(item.product_id),
        type: 'IN',
        qty: item.qty,
        stock_before: before,
        stock_after: after,
        note: body.note ?? null,
        created_at: createdAt,
      };
    });
    this.movements = [...this.movements, ...saved];
    return this.respond({ movements: saved });
  }

  protected override requestAdjustment(
    body: StockAdjustmentRequestDto,
  ): Observable<StockMovementDto> {
    if (!Number.isInteger(body.physical_stock) || body.physical_stock < 0) {
      return this.fail({
        code: 'VALIDATION_ERROR',
        message: 'Validasi gagal',
        status: 400,
        fieldErrors: [{ field: 'physical_stock', message: 'Stok fisik tidak boleh negatif' }],
      });
    }
    const before = this.stock.get(body.product_id);
    if (before === undefined) {
      return this.fail({ code: 'NOT_FOUND', message: 'Produk tidak ditemukan', status: 404 });
    }
    if (body.physical_stock === before) {
      return this.fail({ code: NO_DIFFERENCE_CODE, message: 'Tidak ada selisih stok', status: 422 });
    }

    this.stock.set(body.product_id, body.physical_stock);
    const saved: StockMovementDto = {
      id: Math.max(0, ...this.movements.map((m) => m.id)) + 1,
      product_id: body.product_id,
      product_name: productName(body.product_id),
      type: 'ADJUSTMENT',
      qty: body.physical_stock - before,
      stock_before: before,
      stock_after: body.physical_stock,
      reason: body.reason,
      note: body.note ?? null,
      created_at: nowInJakarta(),
    };
    this.movements = [...this.movements, saved];
    return this.respond(saved);
  }

  protected override requestMovements(
    params: StockMovementParamsDto,
  ): Observable<PageResponseDto<StockMovementDto>> {
    const filtered = this.movements
      .filter(
        (m) =>
          (!params.type || m.type === params.type) &&
          (params.product_id === undefined || m.product_id === params.product_id),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    const start = params.page * params.size;
    const totalPages = Math.ceil(filtered.length / params.size);
    return this.respond({
      content: filtered.slice(start, start + params.size),
      page: params.page,
      size: params.size,
      total_elements: filtered.length,
      total_pages: totalPages,
      last: params.page >= totalPages - 1,
    });
  }

  private product(id: number): StockProductDto | undefined {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    return product && toStockProductDto(product, this.stock.get(id)!);
  }

  private respond<T>(body: T): Observable<T> {
    return of(body).pipe(delay(MOCK_LATENCY_MS));
  }

  private fail(error: AppError): Observable<never> {
    return timer(MOCK_LATENCY_MS).pipe(switchMap(() => throwError(() => error)));
  }
}
