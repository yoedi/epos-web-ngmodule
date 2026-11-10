import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { AuthService } from '../../../../../core/auth/auth.service';
import { AppError } from '../../../../../core/http/api-error.model';
import { StoreSettingsService } from '../../../../../core/store/store-settings.service';
import { CashierModule } from '../../../cashier.module';
import { Product } from '../../../domain/models/product';
import { Sale, SaleRequest } from '../../../domain/models/sale';
import { ProductCatalogRepository } from '../../../domain/repositories/product-catalog.repository';
import { SaleRepository } from '../../../domain/repositories/sale.repository';
import { HIGHLIGHT_MS } from '../../state/cashier.store';
import { CashierPageComponent } from './cashier-page.component';

describe('CashierPageComponent', () => {
  let fixture: ComponentFixture<CashierPageComponent>;
  let catalog: jasmine.SpyObj<ProductCatalogRepository>;
  let sales: jasmine.SpyObj<SaleRepository>;
  let messages: jasmine.SpyObj<MessageService>;

  const beras: Product = {
    id: 1,
    sku: 'BRS-005',
    barcode: '8991234567883',
    name: 'Beras Premium 5 kg',
    categoryName: 'Sembako',
    unit: 'KG',
    sellPrice: 78000,
    stock: 24,
    minStock: 10,
    isActive: true,
  };
  const minyak: Product = {
    ...beras,
    id: 2,
    sku: 'MYK-002',
    barcode: '8991234567890',
    name: 'Minyak Goreng 2 L',
    sellPrice: 36500,
    stock: 3,
    minStock: 12,
  };

  const savedSale: Sale = {
    id: 1,
    invoiceNo: 'INV-20260916-0001',
    cashierName: 'Rina Lestari',
    items: [
      {
        productId: 1,
        productName: 'Beras Premium 5 kg',
        unit: 'KG',
        price: 78000,
        qty: 1,
        subtotal: 78000,
      },
    ],
    subtotal: 78000,
    discount: 0,
    total: 78000,
    paymentMethod: 'CASH',
    paid: 100000,
    change: 22000,
    createdAt: new Date('2026-09-16T14:32:10+07:00'),
  };

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';
  const searchInput = () => root().querySelector<HTMLInputElement>('#cashier-search')!;
  const buttonWith = (label: string) =>
    Array.from(root().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      (b.textContent ?? '').includes(label),
    );

  function settle(): void {
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();
  }

  function type(value: string): void {
    searchInput().value = value;
    searchInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function press(key: string, target: EventTarget = searchInput()): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    settle();
  }

  /** Lets the "BARU" highlight timer run out so no timer outlives the test. */
  function finish(): void {
    tick(HIGHLIGHT_MS);
    flush();
  }

  function scan(barcode: string): void {
    type(barcode);
    press('Enter');
  }

  beforeEach(async () => {
    catalog = jasmine.createSpyObj<ProductCatalogRepository>('ProductCatalogRepository', [
      'search',
      'findByBarcode',
    ]);
    catalog.findByBarcode.and.callFake(async (code) =>
      [beras, minyak].find((p) => p.barcode === code) ?? null,
    );
    catalog.search.and.resolveTo([beras, minyak]);
    sales = jasmine.createSpyObj<SaleRepository>('SaleRepository', ['create']);
    sales.create.and.resolveTo(savedSale);
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);

    // The test browser may be narrow; the screen must not switch to the phone notice.
    spyOn(window, 'matchMedia').and.returnValue({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList);

    await TestBed.configureTestingModule({
      imports: [CashierModule, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ProductCatalogRepository, useValue: catalog },
        { provide: SaleRepository, useValue: sales },
        { provide: MessageService, useValue: messages },
        {
          provide: AuthService,
          useValue: {
            currentUser$: of({ id: 2, name: 'Rina Lestari', username: 'rina', role: 'CASHIER' }),
          },
        },
        {
          provide: StoreSettingsService,
          useValue: {
            load: () =>
              of({
                storeName: 'Toko Berkah Jaya',
                address: 'Jl. Kaliurang Km 5, Yogyakarta',
                phone: '0274-123456',
                receiptFooter: 'Terima kasih, selamat belanja kembali',
              }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashierPageComponent);
  });

  afterEach(() => {
    // The receipt moves itself to <body>; make sure no test leaves one behind.
    fixture.destroy();
  });

  it('shows the empty cart state and a disabled Bayar button', fakeAsync(() => {
    settle();

    expect(text()).toContain('Scan atau cari barang untuk memulai');
    expect(buttonWith('Bayar')?.disabled).toBeTrue();
    expect(text()).toContain('Rina Lestari');
    finish();
  }));

  it('scans, adds, pays and shows the server result', fakeAsync(() => {
    settle();

    scan('8991234567883');

    expect(catalog.findByBarcode).toHaveBeenCalledWith('8991234567883');
    expect(text()).toContain('Beras Premium 5 kg');
    expect(text()).toContain('1 jenis · 1 barang');
    expect(searchInput().value).toBe('');
    expect(document.activeElement).toBe(searchInput());

    press('F9');
    expect(text()).toContain('Pembayaran');

    buttonWith('100.000')!.click();
    fixture.detectChanges();
    expect(text()).toContain('Kembalian');
    expect(text()).toContain('Rp 22.000');

    buttonWith('Selesaikan Transaksi')!.click();
    settle();

    expect(sales.create).toHaveBeenCalledOnceWith({
      items: [{ productId: 1, qty: 1 }],
      paymentMethod: 'CASH',
      paid: 100000,
    } as SaleRequest);
    expect(text()).toContain('Transaksi Berhasil');
    expect(text()).toContain('INV-20260916-0001');
    expect(document.body.querySelector('app-receipt-print')?.textContent).toContain(
      'Toko Berkah Jaya',
    );

    buttonWith('Transaksi Baru')!.click();
    settle();
    finish();

    expect(text()).toContain('Scan atau cari barang untuk memulai');
    expect(document.body.querySelector('app-receipt-print')).toBeNull();
  }));

  it('adds the highlighted search result with Enter after the debounce', fakeAsync(() => {
    settle();

    type('beras');
    tick(300);
    fixture.detectChanges();
    expect(root().querySelectorAll('[role="option"]').length).toBe(2);

    press('ArrowDown');
    press('Enter');

    expect(text()).toContain('Minyak Goreng 2 L');
    finish();
  }));

  it('shows a toast when the barcode is unknown', fakeAsync(() => {
    settle();

    scan('8990000000000');

    expect(messages.add).toHaveBeenCalledWith(
      jasmine.objectContaining({
        severity: 'warn',
        detail: 'Barang dengan barcode 8990000000000 tidak ditemukan',
      }),
    );
    expect(text()).toContain('Scan atau cari barang untuk memulai');
    finish();
  }));

  it('changes the selected line with + / − and removes it with Delete', fakeAsync(() => {
    settle();
    scan('8991234567883');

    press('+');
    press('+');
    expect(text()).toContain('1 jenis · 3 barang');

    press('-');
    expect(text()).toContain('1 jenis · 2 barang');

    press('Delete');
    expect(text()).toContain('Scan atau cari barang untuk memulai');
    finish();
  }));

  it('warns when the qty would go above the stock', fakeAsync(() => {
    settle();
    scan('8991234567890');
    press('+');
    press('+');

    press('+');

    expect(text()).toContain('Stok Minyak Goreng 2 L tersisa 3');
    expect(text()).toContain('1 jenis · 3 barang');
    finish();
  }));

  it('keeps the cart and offers a retry when saving fails', fakeAsync(() => {
    const failure: AppError = {
      code: 'NETWORK_ERROR',
      message: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.',
      status: 0,
    };
    sales.create.and.rejectWith(failure);
    settle();
    scan('8991234567883');
    press('F9');
    buttonWith('Uang Pas')!.click();
    fixture.detectChanges();

    buttonWith('Selesaikan Transaksi')!.click();
    settle();

    expect(text()).toContain('Transaksi gagal disimpan');
    expect(text()).toContain(failure.message);
    expect(buttonWith('Coba Lagi')).toBeDefined();

    sales.create.and.resolveTo(savedSale);
    buttonWith('Coba Lagi')!.click();
    settle();

    expect(sales.create).toHaveBeenCalledTimes(2);
    expect(text()).toContain('Transaksi Berhasil');
    finish();
  }));

  it('ignores a second click while the sale is being saved', fakeAsync(() => {
    let resolve!: (sale: Sale) => void;
    sales.create.and.returnValue(new Promise<Sale>((r) => (resolve = r)));
    settle();
    scan('8991234567883');
    press('F9');
    buttonWith('Uang Pas')!.click();
    fixture.detectChanges();

    const submit = buttonWith('Selesaikan Transaksi')!;
    submit.click();
    fixture.detectChanges();
    submit.click();
    fixture.detectChanges();

    expect(sales.create).toHaveBeenCalledTimes(1);
    expect(text()).toContain('Menyimpan');

    resolve(savedSale);
    settle();
    finish();
  }));

  it('disables "Selesaikan Transaksi" and shows the shortfall when cash is short', fakeAsync(() => {
    settle();
    scan('8991234567883');
    press('F9');

    buttonWith('50.000')!.click();
    fixture.detectChanges();

    expect(text()).toContain('Uang kurang');
    expect(text()).toContain('Rp 28.000');
    expect(buttonWith('Selesaikan Transaksi')?.disabled).toBeTrue();
    finish();
  }));

  it('focuses "Uang Diterima" right away, before the open animation ends', fakeAsync(() => {
    settle();
    scan('8991234567883');

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9', bubbles: true }));
    fixture.detectChanges();

    expect(document.activeElement?.id).toBe('payment-paid');
    finish();
  }));

  it('closes the payment modal with Esc and keeps the cart', fakeAsync(() => {
    settle();
    scan('8991234567883');
    press('F9');

    press('Escape', document.body);

    expect(root().querySelector('form')).toBeNull();
    expect(text()).not.toContain('Uang Diterima');
    expect(text()).toContain('Beras Premium 5 kg');
    finish();
  }));
});
