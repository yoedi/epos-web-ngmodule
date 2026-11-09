import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, switchMap, throwError, timer } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AppError } from '../../../core/http/api-error.model';
import { PageResponseDto } from '../../../core/http/page.model';
import { StockStatus } from '../../../shared/ui/stock-badge/stock-badge.component';
import { MOCK_CATEGORIES } from '../../category/services/mock-category.service';
import {
  CreateProductDto,
  ProductDto,
  ProductListParamsDto,
  UpdateProductDto,
} from '../models/product.model';
import { ProductService } from './product.service';

const MOCK_LATENCY_MS = 400;

function stockStatusOf(stock: number, minStock: number): StockStatus {
  if (stock === 0) {
    return 'OUT_OF_STOCK';
  }
  return stock <= minStock ? 'LOW_STOCK' : 'SAFE';
}

function categoryRef(id: number): { id: number; name: string } {
  const category = MOCK_CATEGORIES.find((c) => c.id === id);
  return { id, name: category?.name ?? '' };
}

function sample(
  id: number,
  sku: string,
  barcode: string,
  name: string,
  categoryId: number,
  unit: ProductDto['unit'],
  [costPrice, sellPrice]: [number, number],
  [stock, minStock]: [number, number],
  isActive = true,
): ProductDto {
  return {
    id,
    sku,
    barcode,
    name,
    category: categoryRef(categoryId),
    unit,
    cost_price: costPrice,
    sell_price: sellPrice,
    stock,
    min_stock: minStock,
    stock_status: stockStatusOf(stock, minStock),
    is_active: isActive,
  };
}

/** Sample products from PRD section 12; cost prices and status from mockup 4a. */
const MOCK_PRODUCTS: readonly ProductDto[] = [
  sample(1, 'BRS-005', '8991234567883', 'Beras Premium 5 kg', 1, 'KG', [69500, 78000], [24, 10]),
  sample(2, 'MYK-002', '8991234567890', 'Minyak Goreng 2 L', 1, 'LITER', [32000, 36500], [3, 12]),
  sample(3, 'GLA-001', '8991234567906', 'Gula Pasir 1 kg', 1, 'KG', [15200, 17500], [40, 15]),
  sample(4, 'TLR-001', '8991234567913', 'Telur Ayam 1 kg', 1, 'KG', [26000, 29000], [8, 10]),
  sample(5, 'MIE-001', '8991234567920', 'Mi Instan Goreng', 3, 'BUNGKUS', [2950, 3500], [120, 48]),
  sample(6, 'AIR-600', '8991234567937', 'Air Mineral 600 ml', 2, 'PCS', [3200, 4000], [0, 24]),
  sample(7, 'SBN-001', '8991234567944', 'Sabun Mandi Batang', 4, 'PCS', [3600, 4500], [36, 12], false),
  sample(8, 'KPI-001', '8991234567951', 'Kopi Sachet', 2, 'PCS', [1500, 2000], [85, 30]),
];

function matchesSearch(product: ProductDto, search: string): boolean {
  const term = search.toLowerCase();
  return [product.name, product.sku, product.barcode ?? ''].some((value) =>
    value.toLowerCase().includes(term),
  );
}

function matchesStatus(product: ProductDto, status: ProductListParamsDto['status']): boolean {
  switch (status) {
    case 'ACTIVE':
      return product.is_active;
    case 'INACTIVE':
      return !product.is_active;
    case 'LOW_STOCK':
      // Sold-out products count as low: mockup 9a lists them under "Stok Menipis".
      return product.stock <= product.min_stock;
    default:
      return true;
  }
}

function sortValue(product: ProductDto, field: string): string | number {
  switch (field) {
    case 'category.name':
      return product.category.name;
    case 'is_active':
      return product.is_active ? 1 : 0;
    case 'sku':
      return product.sku;
    case 'name':
      return product.name;
    case 'sell_price':
      return product.sell_price;
    case 'cost_price':
      return product.cost_price ?? 0;
    case 'stock':
      return product.stock;
    default:
      return product.id;
  }
}

function compare(a: string | number, b: string | number): number {
  return typeof a === 'string' && typeof b === 'string'
    ? a.localeCompare(b, 'id')
    : Number(a) - Number(b);
}

/**
 * Stand-in for ProductService while the backend is not ready. Follows the
 * contract of docs/api-spec.md section 3, including the role rule on cost_price
 * and the duplicate checks. Changes last until the page is reloaded.
 */
@Injectable()
export class MockProductService extends ProductService {
  private readonly auth = inject(AuthService);
  private products: ProductDto[] = MOCK_PRODUCTS.map((p) => ({ ...p }));

  protected override requestList(
    params: ProductListParamsDto,
  ): Observable<PageResponseDto<ProductDto>> {
    const filtered = this.products.filter(
      (p) =>
        (!params.search || matchesSearch(p, params.search)) &&
        (params.category_id === undefined || p.category.id === params.category_id) &&
        matchesStatus(p, params.status),
    );

    if (params.sort) {
      const [field, direction] = params.sort.split(',');
      const sign = direction === 'desc' ? -1 : 1;
      filtered.sort((a, b) => sign * compare(sortValue(a, field), sortValue(b, field)));
    }

    const start = params.page * params.size;
    const totalPages = Math.ceil(filtered.length / params.size);
    return this.respond({
      content: filtered.slice(start, start + params.size).map((p) => this.forCurrentRole(p)),
      page: params.page,
      size: params.size,
      total_elements: filtered.length,
      total_pages: totalPages,
      last: params.page >= totalPages - 1,
    });
  }

  protected override requestCreate(body: CreateProductDto): Observable<ProductDto> {
    const conflict = this.findConflict(body.sku, body.barcode ?? null, null);
    if (conflict) {
      return this.fail(conflict);
    }
    const product: ProductDto = {
      id: Math.max(0, ...this.products.map((p) => p.id)) + 1,
      sku: body.sku,
      barcode: body.barcode ?? null,
      name: body.name,
      category: categoryRef(body.category_id),
      unit: body.unit,
      cost_price: body.cost_price,
      sell_price: body.sell_price,
      stock: body.initial_stock,
      min_stock: body.min_stock,
      stock_status: stockStatusOf(body.initial_stock, body.min_stock),
      is_active: true,
    };
    this.products = [...this.products, product];
    return this.respond(product);
  }

  protected override requestUpdate(id: number, body: UpdateProductDto): Observable<ProductDto> {
    const current = this.products.find((p) => p.id === id);
    if (!current) {
      return this.fail({ code: 'NOT_FOUND', message: 'Produk tidak ditemukan', status: 404 });
    }
    const conflict = this.findConflict(body.sku, body.barcode, id);
    if (conflict) {
      return this.fail(conflict);
    }
    return this.respond(
      this.replace({
        ...current,
        sku: body.sku,
        barcode: body.barcode,
        name: body.name,
        category: categoryRef(body.category_id),
        unit: body.unit,
        cost_price: body.cost_price,
        sell_price: body.sell_price,
        min_stock: body.min_stock,
        stock_status: stockStatusOf(current.stock, body.min_stock),
      }),
    );
  }

  protected override requestSetActive(id: number, isActive: boolean): Observable<ProductDto> {
    const current = this.products.find((p) => p.id === id);
    if (!current) {
      return this.fail({ code: 'NOT_FOUND', message: 'Produk tidak ditemukan', status: 404 });
    }
    return this.respond(this.replace({ ...current, is_active: isActive }));
  }

  private findConflict(sku: string, barcode: string | null, ownId: number | null): AppError | null {
    const others = this.products.filter((p) => p.id !== ownId);
    if (others.some((p) => p.sku === sku)) {
      return { code: 'DUPLICATE_SKU', message: 'SKU sudah dipakai produk lain', status: 409 };
    }
    if (barcode && others.some((p) => p.barcode === barcode)) {
      return {
        code: 'DUPLICATE_BARCODE',
        message: 'Barcode sudah dipakai produk lain',
        status: 409,
      };
    }
    return null;
  }

  private replace(product: ProductDto): ProductDto {
    this.products = this.products.map((p) => (p.id === product.id ? product : p));
    return product;
  }

  /** The server leaves cost_price out for the CASHIER role. */
  private forCurrentRole(product: ProductDto): ProductDto {
    if (this.auth.currentUser?.role !== 'CASHIER') {
      return product;
    }
    const { cost_price: _hidden, ...withoutCost } = product;
    return withoutCost;
  }

  private respond<T>(body: T): Observable<T> {
    return of(body).pipe(delay(MOCK_LATENCY_MS));
  }

  private fail(error: AppError): Observable<never> {
    return timer(MOCK_LATENCY_MS).pipe(switchMap(() => throwError(() => error)));
  }
}
