import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { Role, User } from '../../../../core/auth/auth.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { AppError } from '../../../../core/http/api-error.model';
import { jakartaToday } from '../../models/date-range';
import {
  SaleDetail,
  SaleListResult,
  SaleQuery,
  SaleSummary,
} from '../../models/sale-history.model';
import { SaleHistoryModule } from '../../sale-history.module';
import { SaleHistoryService } from '../../services/sale-history.service';
import { UserService } from '../../services/user.service';
import { SaleHistoryPageComponent } from './sale-history-page.component';

describe('SaleHistoryPageComponent', () => {
  let fixture: ComponentFixture<SaleHistoryPageComponent>;
  let component: SaleHistoryPageComponent;
  let service: jasmine.SpyObj<SaleHistoryService>;
  let users: jasmine.SpyObj<UserService>;
  let user$: BehaviorSubject<User | null>;

  const sale: SaleSummary = {
    id: 42,
    invoiceNo: 'INV-20260918-0042',
    cashierName: 'Rina Lestari',
    itemCount: 17,
    total: 144500,
    createdAt: new Date('2026-09-18T14:33:00+07:00'),
  };

  const detail: SaleDetail = {
    id: 42,
    invoiceNo: 'INV-20260918-0042',
    cashierName: 'Rina Lestari',
    items: [
      { productId: 1, productName: 'Beras Premium 5 kg', unit: 'KG', price: 78000, qty: 1, subtotal: 78000 },
      { productId: 5, productName: 'Mi Instan Goreng', unit: 'BUNGKUS', price: 3500, qty: 5, subtotal: 17500 },
      { productId: 4, productName: 'Telur Ayam 1 kg', unit: 'KG', price: 29000, qty: 1, subtotal: 29000 },
      { productId: 8, productName: 'Kopi Sachet', unit: 'PCS', price: 2000, qty: 10, subtotal: 20000 },
    ],
    subtotal: 144500,
    discount: 0,
    total: 144500,
    paid: 150000,
    change: 5500,
    createdAt: new Date('2026-09-18T14:33:00+07:00'),
    store: {
      storeName: 'Toko Berkah Jaya',
      address: 'Jl. Kaliurang Km 5, Yogyakarta',
      phone: '0274-123456',
      receiptFooter: 'Terima kasih, selamat belanja kembali',
    },
  };

  const resultOf = (content: SaleSummary[], revenue = 4305000): SaleListResult => ({
    page: {
      content,
      page: 0,
      size: 20,
      totalElements: content.length,
      totalPages: content.length ? 1 : 0,
      last: true,
    },
    totals: {
      totalRevenue: content.length ? revenue : 0,
      transactionCount: content.length,
      averageTransaction: content.length ? 102500 : 0,
    },
  });

  const lastQuery = (): SaleQuery => service.list.calls.mostRecent().args[0];
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const el = (selector: string) =>
    fixture.debugElement.query(By.css(selector))?.nativeElement as HTMLElement | undefined;

  function render(role: Role = 'OWNER'): void {
    user$.next({ id: role === 'OWNER' ? 1 : 2, name: 'x', username: 'x', role });
    fixture = TestBed.createComponent(SaleHistoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<SaleHistoryService>('SaleHistoryService', ['list', 'get']);
    service.list.and.returnValue(of(resultOf([sale])));
    service.get.and.returnValue(of(detail));
    users = jasmine.createSpyObj<UserService>('UserService', ['listCashiers']);
    users.listCashiers.and.returnValue(of([{ id: 2, name: 'Rina Lestari' }]));
    user$ = new BehaviorSubject<User | null>(null);

    await TestBed.configureTestingModule({
      imports: [SaleHistoryModule, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SaleHistoryService, useValue: service },
        { provide: UserService, useValue: users },
        { provide: AuthService, useValue: { currentUser$: user$ } },
      ],
    }).compileComponents();
  });

  describe('states', () => {
    it('shows the summary and rows once loaded', () => {
      render();

      expect(text()).toContain('Rp 4.305.000');
      expect(text()).toContain('Rp 102.500');
      expect(el('app-sale-table')?.textContent).toContain('INV-20260918-0042');
      expect(el('app-sale-table')?.textContent).toContain('17');
      expect(text()).toContain('Menampilkan 1-1 dari 1 transaksi');
    });

    it('shows skeletons while loading', () => {
      service.list.and.returnValue(new Subject<SaleListResult>());
      render();

      expect(fixture.debugElement.queryAll(By.css('.stats p-skeleton')).length).toBe(3);
      expect(el('app-sale-table .table')?.getAttribute('aria-busy')).toBe('true');
    });

    it('shows an empty state for today without filters', () => {
      service.list.and.returnValue(of(resultOf([])));
      render();

      expect(text()).toContain('Belum ada transaksi hari ini');
      expect(el('app-sale-table')).toBeUndefined();
    });

    it('shows the error with a retry button', () => {
      const error: AppError = { code: 'INTERNAL_ERROR', message: 'Server sedang sibuk', status: 500 };
      service.list.and.returnValue(throwError(() => error));
      render();

      expect(text()).toContain('Gagal memuat transaksi');
      expect(text()).toContain('Server sedang sibuk');
      expect(el('.stats')).toBeUndefined();

      service.list.and.returnValue(of(resultOf([sale])));
      (el('app-empty-state button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(el('app-sale-table')?.textContent).toContain('INV-20260918-0042');
    });
  });

  describe('filters', () => {
    it('starts on today, newest first', () => {
      render();

      const today = jakartaToday();
      expect(lastQuery()).toEqual(
        jasmine.objectContaining({ startDate: today, endDate: today, cashierId: null, direction: 'desc' }),
      );
      expect(text()).toContain('Hari ini');
    });

    it('gives the owner date range and cashier filters', () => {
      render('OWNER');

      expect(el('p-datepicker')).toBeDefined();
      expect(el('.toolbar__select p-select')).toBeDefined();
      expect(users.listCashiers).toHaveBeenCalled();
    });

    it('hides date range and cashier filters from a cashier', () => {
      render('CASHIER');

      expect(el('p-datepicker')).toBeUndefined();
      expect(el('.toolbar__select')).toBeUndefined();
      expect(users.listCashiers).not.toHaveBeenCalled();
    });

    it('searches the invoice number after a pause', fakeAsync(() => {
      render();

      component.filters.controls.invoiceNo.setValue(' 0042 ');
      tick(299);
      expect(lastQuery().invoiceNo).toBe('');
      tick(1);
      expect(lastQuery()).toEqual(jasmine.objectContaining({ invoiceNo: '0042', page: 0 }));
    }));

    it('applies a complete date range only', () => {
      render();

      component.filters.controls.range.setValue([new Date(2026, 8, 16), null]);
      expect(lastQuery().startDate).toBe(jakartaToday());

      component.filters.controls.range.setValue([new Date(2026, 8, 16), new Date(2026, 8, 18)]);
      expect(lastQuery()).toEqual(
        jasmine.objectContaining({ startDate: '2026-09-16', endDate: '2026-09-18', page: 0 }),
      );
    });

    it('treats a single picked day as a one-day range when the picker closes', () => {
      render();

      component.filters.controls.range.setValue([new Date(2026, 8, 17), null]);
      component.completeRange();

      expect(lastQuery()).toEqual(
        jasmine.objectContaining({ startDate: '2026-09-17', endDate: '2026-09-17' }),
      );
    });

    it('resets every filter to today', () => {
      render();
      component.filters.controls.cashierId.setValue(2);
      component.filters.controls.range.setValue([new Date(2026, 8, 16), new Date(2026, 8, 18)]);

      component.resetFilters();

      const today = jakartaToday();
      expect(lastQuery()).toEqual(
        jasmine.objectContaining({ startDate: today, endDate: today, cashierId: null, invoiceNo: '' }),
      );
    });

    it('offers to reset when a filter finds nothing', () => {
      render();
      service.list.and.returnValue(of(resultOf([])));
      component.filters.controls.cashierId.setValue(2);
      fixture.detectChanges();

      expect(text()).toContain('Transaksi tidak ditemukan');
    });

    it('toggles the date sort', () => {
      render();

      (el('.sort') as HTMLButtonElement).click();

      expect(lastQuery().direction).toBe('asc');
    });
  });

  describe('detail', () => {
    const drawer = (selector: string) =>
      (fixture.nativeElement as HTMLElement).querySelector(`.p-drawer ${selector}`.trim());

    function openFirst(): void {
      (el('app-sale-table .view') as HTMLButtonElement).click();
      fixture.detectChanges();
    }

    it('shows the receipt-like detail with Cetak Ulang', () => {
      render();
      openFirst();

      expect(service.get).toHaveBeenCalledWith(42);
      const receipt = drawer('app-sale-receipt')?.textContent ?? '';
      expect(receipt).toContain('Toko Berkah Jaya');
      expect(receipt).toContain('Kopi Sachet');
      expect(receipt).toContain('Rp 5.500');
      expect(drawer('')?.textContent).toContain('Cetak Ulang');
      expect(document.body.querySelector(':scope > app-sale-receipt-print')).not.toBeNull();
    });

    it('prints when Cetak Ulang is pressed', () => {
      const print = spyOn(window, 'print');
      render();
      openFirst();

      (drawer('.detail__print') as HTMLButtonElement).click();

      expect(print).toHaveBeenCalled();
    });

    it('shows a detail error with retry', () => {
      const error: AppError = { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan', status: 404 };
      service.get.and.returnValue(throwError(() => error));
      render();
      openFirst();

      expect(drawer('')?.textContent).toContain('Transaksi tidak ditemukan');

      service.get.and.returnValue(of(detail));
      (drawer('app-empty-state button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(drawer('app-sale-receipt')).not.toBeNull();
    });

    it('removes the print host when the drawer closes', () => {
      render();
      openFirst();

      component.closeDetail();
      fixture.detectChanges();

      expect(document.body.querySelector(':scope > app-sale-receipt-print')).toBeNull();
    });
  });
});
