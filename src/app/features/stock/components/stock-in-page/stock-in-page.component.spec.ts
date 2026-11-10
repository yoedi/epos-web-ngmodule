import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { AppError } from '../../../../core/http/api-error.model';
import { StockMovement, StockProduct } from '../../models/stock-in.model';
import { StockService } from '../../services/stock.service';
import { StockModule } from '../../stock.module';
import { StockInPageComponent } from './stock-in-page.component';

describe('StockInPageComponent', () => {
  let fixture: ComponentFixture<StockInPageComponent>;
  let service: jasmine.SpyObj<StockService>;
  let messages: jasmine.SpyObj<MessageService>;

  const air: StockProduct = {
    id: 6,
    sku: 'AIR-600',
    barcode: '8991234567937',
    name: 'Air Mineral 600 ml',
    stock: 0,
  };
  const saved: StockMovement = {
    id: 31,
    productId: 6,
    productName: 'Air Mineral 600 ml',
    type: 'IN',
    qty: 24,
    stockBefore: 0,
    stockAfter: 24,
    reason: null,
    note: 'Belanja grosir 16 Sep',
    createdAt: '2026-09-16T15:02:00+07:00',
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const text = () => host().textContent ?? '';
  const button = (label: string) =>
    Array.from(host().querySelectorAll('button')).find((b) => b.textContent?.trim() === label)!;

  function scan(code: string): void {
    const input = host().querySelector<HTMLInputElement>('#stock-picker')!;
    input.value = code;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    tick(300);
    fixture.detectChanges();
  }

  function scanAndAdd(qty: number): void {
    scan(air.barcode!);
    fixture.componentInstance.setQty(qty);
    button('Tambah').click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<StockService>('StockService', [
      'searchProducts',
      'findByBarcode',
      'stockIn',
      'recentStockIn',
    ]);
    service.searchProducts.and.returnValue(of([]));
    service.findByBarcode.and.returnValue(of(air));
    service.recentStockIn.and.returnValue(of([]));
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [StockModule, NoopAnimationsModule],
      providers: [
        { provide: StockService, useValue: service },
        { provide: MessageService, useValue: messages },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockInPageComponent);
    fixture.detectChanges();
  });

  it('shows the empty draft and empty history', () => {
    expect(text()).toContain('Belum ada barang di daftar');
    expect(text()).toContain('Belum ada stok masuk');
    expect(button('Simpan Stok Masuk').disabled).toBeTrue();
  });

  it('scans, adds a line with stock before → after, and saves', fakeAsync(() => {
    scanAndAdd(24);

    expect(text()).toContain('AIR-600');
    expect(text()).toContain('+24');
    expect(text()).toContain('1 barang · total +24 unit');
    expect(host().querySelector('.change__after')?.textContent?.trim()).toBe('24');
    // Focus goes back to the Barang field for the next scan.
    expect(document.activeElement?.id).toBe('stock-picker');

    service.stockIn.and.returnValue(of([saved]));
    service.recentStockIn.and.returnValue(of([saved]));
    const note = host().querySelector<HTMLInputElement>('#stock-note')!;
    note.value = 'Belanja grosir 16 Sep';
    note.dispatchEvent(new Event('input'));
    button('Simpan Stok Masuk').click();
    fixture.detectChanges();

    expect(service.stockIn).toHaveBeenCalledWith('Belanja grosir 16 Sep', [{ product: air, qty: 24 }]);
    expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    expect(text()).toContain('Belum ada barang di daftar');
    expect(host().querySelector('app-stock-in-history')?.textContent).toContain('Belanja grosir 16 Sep');
    // PrimeNG leaves an interval running after the button clicks.
    discardPeriodicTasks();
  }));

  it('keeps the draft when saving fails', fakeAsync(() => {
    scanAndAdd(24);
    const error: AppError = { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan', status: 500 };
    service.stockIn.and.returnValue(throwError(() => error));

    button('Simpan Stok Masuk').click();
    fixture.detectChanges();

    expect(text()).toContain('1 barang · total +24 unit');
    expect(button('Simpan Stok Masuk').disabled).toBeFalse();
    // PrimeNG leaves an interval running after the button clicks.
    discardPeriodicTasks();
  }));

  it('shows validation messages inline', fakeAsync(() => {
    scanAndAdd(24);
    const error: AppError = {
      code: 'VALIDATION_ERROR',
      message: 'Validasi gagal',
      status: 400,
      fieldErrors: [{ field: 'items[0].qty', message: 'Jumlah harus lebih dari 0' }],
    };
    service.stockIn.and.returnValue(throwError(() => error));

    button('Simpan Stok Masuk').click();
    fixture.detectChanges();

    expect(host().querySelector('.entry__errors')?.textContent).toContain('Jumlah harus lebih dari 0');
    // PrimeNG leaves an interval running after the button clicks.
    discardPeriodicTasks();
  }));

  it('asks for a product before adding', () => {
    button('Tambah').click();
    fixture.detectChanges();
    expect(text()).toContain('Pilih barang terlebih dahulu');
  });

  it('shows the history error with a retry', () => {
    service.recentStockIn.and.returnValue(
      throwError(() => ({ code: 'INTERNAL_ERROR', message: 'Server sibuk', status: 500 })),
    );
    fixture.componentInstance.retryHistory();
    fixture.detectChanges();
    expect(text()).toContain('Gagal memuat riwayat');
    expect(text()).toContain('Server sibuk');
  });
});
