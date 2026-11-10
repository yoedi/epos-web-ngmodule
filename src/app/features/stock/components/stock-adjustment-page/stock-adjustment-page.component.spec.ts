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
import { StockAdjustmentPageComponent } from './stock-adjustment-page.component';

describe('StockAdjustmentPageComponent', () => {
  let fixture: ComponentFixture<StockAdjustmentPageComponent>;
  let service: jasmine.SpyObj<StockService>;
  let messages: jasmine.SpyObj<MessageService>;

  const minyak: StockProduct = {
    id: 2,
    sku: 'MYK-002',
    barcode: '8991234567890',
    name: 'Minyak Goreng 2 L',
    stock: 3,
  };
  const saved: StockMovement = {
    id: 40,
    productId: 2,
    productName: 'Minyak Goreng 2 L',
    type: 'ADJUSTMENT',
    qty: -1,
    stockBefore: 3,
    stockAfter: 2,
    reason: 'RUSAK',
    note: 'Kemasan bocor 1 botol',
    createdAt: '2026-09-16T15:10:00+07:00',
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const text = () => host().textContent ?? '';
  const button = (label: string) =>
    Array.from(host().querySelectorAll('button')).find((b) => b.textContent?.trim() === label)!;

  function type(selector: string, value: string): void {
    const input = host().querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function scan(code: string): void {
    const input = host().querySelector<HTMLInputElement>('#stock-picker')!;
    input.value = code;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    tick(300);
    fixture.detectChanges();
  }

  function chooseReason(value: string): void {
    host().querySelector<HTMLInputElement>(`#reason-${value}`)!.click();
    fixture.detectChanges();
  }

  function fillForm(): void {
    scan(minyak.barcode!);
    type('#physical-stock', '2');
    chooseReason('RUSAK');
    type('#adjustment-note', 'Kemasan bocor 1 botol');
  }

  function submit(): void {
    button('Simpan Penyesuaian').click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<StockService>('StockService', [
      'searchProducts',
      'findByBarcode',
      'adjust',
      'recentAdjustments',
    ]);
    service.searchProducts.and.returnValue(of([]));
    service.findByBarcode.and.returnValue(of(minyak));
    service.recentAdjustments.and.returnValue(of([]));
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [StockModule, NoopAnimationsModule],
      providers: [
        { provide: StockService, useValue: service },
        { provide: MessageService, useValue: messages },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockAdjustmentPageComponent);
    fixture.detectChanges();
  });

  it('starts empty, with an empty history', () => {
    expect(text()).toContain('Pilih barang untuk mulai menghitung');
    expect(text()).toContain('Belum ada penyesuaian');
    expect(button('Batal').disabled).toBeTrue();
  });

  it('shows the system stock and the difference as the count is typed', fakeAsync(() => {
    scan(minyak.barcode!);
    expect(host().querySelector('#physical-stock')).toBe(document.activeElement);
    expect(host().querySelector('.count__value')?.textContent?.trim()).toBe('3');

    type('#physical-stock', '26');
    expect(host().querySelector('.count__value--diff')?.textContent).toContain('+23');
    expect(text()).toContain('Stok bertambah');

    type('#physical-stock', '1');
    expect(host().querySelector('.count__value--diff')?.textContent).toContain('−2');
    expect(text()).toContain('Stok berkurang');
  }));

  it('confirms before saving, then saves and resets the form', fakeAsync(() => {
    fillForm();
    submit();

    expect(service.adjust).not.toHaveBeenCalled();
    expect(text()).toContain('Simpan penyesuaian stok?');
    expect(host().querySelector('.summary')?.textContent).toContain('3 → 2');

    service.adjust.and.returnValue(of(saved));
    service.recentAdjustments.and.returnValue(of([saved]));
    button('Ya, Simpan').click();
    fixture.detectChanges();

    expect(service.adjust).toHaveBeenCalledWith(2, 2, 'RUSAK', 'Kemasan bocor 1 botol');
    expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    expect(text()).toContain('Pilih barang untuk mulai menghitung');
    expect(host().querySelector('app-stock-adjustment-history')?.textContent).toContain(
      'Kemasan bocor 1 botol',
    );
    expect(document.activeElement?.id).toBe('stock-picker');
    discardPeriodicTasks();
  }));

  it('requires a product, a count and a reason', () => {
    submit();
    expect(text()).toContain('Pilih barang terlebih dahulu');
    expect(text()).toContain('Pilih alasan penyesuaian');
    expect(service.adjust).not.toHaveBeenCalled();
  });

  it('blocks a count without a difference', fakeAsync(() => {
    scan(minyak.barcode!);
    type('#physical-stock', '3');
    chooseReason('SALAH_HITUNG');
    submit();

    expect(text()).toContain('tidak ada selisih');
    expect(text()).not.toContain('Simpan penyesuaian stok?');
    discardPeriodicTasks();
  }));

  it('rejects a count that is not a whole number', fakeAsync(() => {
    scan(minyak.barcode!);
    type('#physical-stock', '2.5');
    chooseReason('RUSAK');
    submit();

    expect(text()).toContain('Stok fisik harus bilangan bulat 0 atau lebih');
    discardPeriodicTasks();
  }));

  it('requires a note for "Lainnya"', fakeAsync(() => {
    scan(minyak.barcode!);
    type('#physical-stock', '2');
    chooseReason('LAINNYA');
    submit();

    expect(text()).toContain('Catatan wajib diisi untuk alasan Lainnya');
    expect(text()).not.toContain('Simpan penyesuaian stok?');
    discardPeriodicTasks();
  }));

  it('keeps the form when saving fails', fakeAsync(() => {
    fillForm();
    submit();
    const error: AppError = { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan', status: 500 };
    service.adjust.and.returnValue(throwError(() => error));
    button('Ya, Simpan').click();
    fixture.detectChanges();

    expect(host().querySelector<HTMLInputElement>('#physical-stock')!.value).toBe('2');
    expect(text()).toContain('MYK-002');
    expect(button('Simpan Penyesuaian').disabled).toBeFalse();
    discardPeriodicTasks();
  }));

  it('shows validation errors next to their field', fakeAsync(() => {
    fillForm();
    submit();
    const error: AppError = {
      code: 'VALIDATION_ERROR',
      message: 'Validasi gagal',
      status: 400,
      fieldErrors: [{ field: 'physical_stock', message: 'Stok fisik tidak boleh negatif' }],
    };
    service.adjust.and.returnValue(throwError(() => error));
    button('Ya, Simpan').click();
    fixture.detectChanges();

    expect(host().querySelector('#physical-stock-error')?.textContent).toContain(
      'Stok fisik tidak boleh negatif',
    );
    discardPeriodicTasks();
  }));

  it('shows the history error with a retry', () => {
    service.recentAdjustments.and.returnValue(
      throwError(() => ({ code: 'INTERNAL_ERROR', message: 'Server sibuk', status: 500 })),
    );
    fixture.componentInstance.retryHistory();
    fixture.detectChanges();
    expect(text()).toContain('Gagal memuat riwayat');
    expect(text()).toContain('Server sibuk');
  });
});
