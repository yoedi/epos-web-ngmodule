import { Injectable, inject } from '@angular/core';

import { AuthService } from '../../../../core/auth/auth.service';
import { AppError, NETWORK_ERROR_MESSAGE } from '../../../../core/http/api-error.model';
import { formatRupiah } from '../../../../shared/utils/money';
import { MOCK_PRODUCTS } from '../../../product/services/mock-product.service';
import { CashierProductDto, ProductSearchParamsDto } from '../dto/product.dto';
import { CreateSaleRequestDto, SaleResponseDto } from '../dto/sale.dto';

export const MOCK_LATENCY_MS = 400;

/**
 * Manual testing aid: `localStorage.setItem('epos.mock.sale_failure', 'network')`
 * makes every POST /sales fail as if the connection dropped. Remove the key to recover.
 */
export const MOCK_SALE_FAILURE_KEY = 'epos.mock.sale_failure';

/** Jakarta is UTC+7 all year (no daylight saving). */
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function stockStatusOf(stock: number, minStock: number): CashierProductDto['stock_status'] {
  if (stock === 0) {
    return 'OUT_OF_STOCK';
  }
  return stock <= minStock ? 'LOW_STOCK' : 'SAFE';
}

/** "2026-09-16T14:32:10+07:00" as the API sends it. */
function jakartaIso(date: Date): string {
  return new Date(date.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 19) + '+07:00';
}

function fail(code: string, message: string, status: number): never {
  const error: AppError = { code, message, status };
  throw error;
}

/**
 * In-memory server for the cashier while epos-api is not ready. Follows
 * docs/api-spec.md sections 3 and 4: totals are recalculated here, stock is
 * reduced, and invoice numbers restart every day. Shared by both mock
 * repositories so a sale lowers the stock the search shows.
 * Changes last until the page is reloaded.
 */
@Injectable()
export class MockPosBackend {
  private readonly auth = inject(AuthService);

  private products: CashierProductDto[] = MOCK_PRODUCTS.map((p) => ({ ...p }));
  private nextSaleId = 1;
  private invoiceDay = '';
  private invoiceSeq = 0;

  searchProducts(params: ProductSearchParamsDto): CashierProductDto[] {
    const term = params.search.toLowerCase();
    return this.products
      .filter((p) => p.is_active)
      .filter((p) =>
        [p.name, p.sku, p.barcode ?? ''].some((value) => value.toLowerCase().includes(term)),
      )
      .slice(params.page * params.size, (params.page + 1) * params.size);
  }

  findByBarcode(barcode: string): CashierProductDto {
    const product = this.products.find((p) => p.barcode === barcode);
    return product ?? fail('NOT_FOUND', `Barang dengan barcode ${barcode} tidak ditemukan`, 404);
  }

  createSale(body: CreateSaleRequestDto): SaleResponseDto {
    if (readFailureMode() === 'network') {
      fail('NETWORK_ERROR', NETWORK_ERROR_MESSAGE, 0);
    }
    if (body.items.length === 0) {
      fail('EMPTY_CART', 'Keranjang masih kosong', 422);
    }

    const lines = body.items.map(({ product_id, qty }) => {
      const product =
        this.products.find((p) => p.id === product_id) ??
        fail('NOT_FOUND', 'Produk tidak ditemukan', 404);
      if (!product.is_active) {
        fail('PRODUCT_INACTIVE', `Produk ${product.name} sudah tidak aktif`, 422);
      }
      if (qty > product.stock) {
        fail('INSUFFICIENT_STOCK', `Stok ${product.name} tersisa ${product.stock}`, 422);
      }
      return { product, qty, subtotal: product.sell_price * qty };
    });

    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    if (body.paid < total) {
      fail('INSUFFICIENT_PAYMENT', `Uang kurang ${formatRupiah(total - body.paid)}`, 422);
    }

    // Validated as a whole first, so a refused sale changes nothing.
    for (const { product, qty } of lines) {
      const stock = product.stock - qty;
      this.replace({ ...product, stock, stock_status: stockStatusOf(stock, product.min_stock) });
    }

    const now = new Date();
    const user = this.auth.currentUser;
    return {
      id: this.nextSaleId++,
      invoice_no: this.nextInvoiceNo(now),
      cashier: { id: user?.id ?? 0, name: user?.name ?? '' },
      items: lines.map(({ product, qty, subtotal }) => ({
        product_id: product.id,
        product_name: product.name,
        unit: product.unit,
        price: product.sell_price,
        qty,
        subtotal,
      })),
      subtotal: total,
      discount: 0,
      total,
      payment_method: body.payment_method,
      paid: body.paid,
      change_amount: body.paid - total,
      status: 'COMPLETED',
      created_at: jakartaIso(now),
    };
  }

  /** INV-YYYYMMDD-NNNN, sequence restarting every Jakarta day. */
  private nextInvoiceNo(now: Date): string {
    const day = jakartaIso(now).slice(0, 10).replace(/-/g, '');
    if (day !== this.invoiceDay) {
      this.invoiceDay = day;
      this.invoiceSeq = 0;
    }
    this.invoiceSeq++;
    return `INV-${day}-${String(this.invoiceSeq).padStart(4, '0')}`;
  }

  private replace(product: CashierProductDto): void {
    this.products = this.products.map((p) => (p.id === product.id ? product : p));
  }
}

function readFailureMode(): string | null {
  try {
    return localStorage.getItem(MOCK_SALE_FAILURE_KEY);
  } catch {
    return null;
  }
}
