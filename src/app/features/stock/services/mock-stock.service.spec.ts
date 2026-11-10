import { provideHttpClient } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { AppError } from '../../../core/http/api-error.model';
import { StockMovement, StockProduct } from '../models/stock-in.model';
import { MockStockService } from './mock-stock.service';

describe('MockStockService', () => {
  let service: MockStockService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), MockStockService] });
    service = TestBed.inject(MockStockService);
  });

  it('saves every item and reports stock before and after', fakeAsync(() => {
    let saved: StockMovement[] = [];
    service
      .stockIn('Belanja grosir 16 Sep', [
        { product: { id: 2, sku: 'MYK-002', barcode: null, name: 'Minyak Goreng 2 L', stock: 3 }, qty: 12 },
        { product: { id: 6, sku: 'AIR-600', barcode: null, name: 'Air Mineral 600 ml', stock: 0 }, qty: 24 },
      ])
      .subscribe((m) => (saved = m));
    tick(1000);

    expect(saved.map((m) => [m.productId, m.stockBefore, m.stockAfter])).toEqual([
      [2, 3, 15],
      [6, 0, 24],
    ]);
    expect(saved.every((m) => m.type === 'IN' && m.note === 'Belanja grosir 16 Sep')).toBeTrue();

    let history: StockMovement[] = [];
    service.recentStockIn(10).subscribe((m) => (history = m));
    tick(1000);
    expect(history.slice(0, 2).map((m) => m.productId).sort()).toEqual([2, 6]);
  }));

  it('finds a product by barcode with its current stock', fakeAsync(() => {
    let found: StockProduct | undefined;
    service.findByBarcode('8991234567937').subscribe((p) => (found = p));
    tick(1000);
    expect(found?.sku).toBe('AIR-600');
    expect(found?.stock).toBe(0);
  }));

  it('fails with NOT_FOUND for an unknown barcode', fakeAsync(() => {
    let error: AppError | undefined;
    service.findByBarcode('0000000000000').subscribe({ error: (e: AppError) => (error = e) });
    tick(1000);
    expect(error?.code).toBe('NOT_FOUND');
  }));
});
