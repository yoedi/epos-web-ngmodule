import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { AppError } from '../../../../core/http/api-error.model';
import { jakartaToday } from '../../../sale-history/models/date-range';
import { DashboardModule } from '../../dashboard.module';
import { DailyReport, fillHours } from '../../models/daily-report.model';
import { DashboardService } from '../../services/dashboard.service';
import {
  DashboardPageComponent,
  REFRESH_INTERVAL_MS,
} from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let service: jasmine.SpyObj<DashboardService>;

  const report: DailyReport = {
    date: jakartaToday(),
    totalRevenue: 4305000,
    transactionCount: 42,
    averageTransaction: 102500,
    lowStockCount: 3,
    hourlySales: fillHours([
      { hour: 12, total: 870000, transactionCount: 8 },
      { hour: 13, total: 1090000, transactionCount: 10 },
    ]),
    topProducts: [
      {
        productId: 1,
        sku: 'BRS-005',
        name: 'Beras Premium 5 kg',
        qtySold: 9,
        total: 702000,
      },
    ],
    lowStockProducts: [
      {
        productId: 6,
        sku: 'AIR-600',
        name: 'Air Mineral 600 ml',
        stock: 0,
        minStock: 24,
        status: 'OUT_OF_STOCK',
      },
      {
        productId: 2,
        sku: 'MYK-002',
        name: 'Minyak Goreng 2 L',
        stock: 3,
        minStock: 12,
        status: 'LOW_STOCK',
      },
      {
        productId: 4,
        sku: 'TLR-001',
        name: 'Telur Ayam 1 kg',
        stock: 8,
        minStock: 10,
        status: 'LOW_STOCK',
      },
    ],
  };

  const emptyReport: DailyReport = {
    ...report,
    totalRevenue: 0,
    transactionCount: 0,
    averageTransaction: 0,
    hourlySales: fillHours([]),
    topProducts: [],
  };

  const failure: AppError = {
    code: 'NETWORK_ERROR',
    message: 'Tidak dapat terhubung ke server.',
    status: 0,
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const el = (selector: string) =>
    fixture.debugElement.query(By.css(selector))?.nativeElement as
      HTMLElement | undefined;

  /** Creates the page and lets the first load (timer 0) run. */
  function render(): void {
    fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    tick(0);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<DashboardService>('DashboardService', [
      'daily',
    ]);
    service.daily.and.returnValue(of(report));

    await TestBed.configureTestingModule({
      imports: [DashboardModule, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: service },
      ],
    }).compileComponents();
  });

  it('shows the summary cards, chart and tables once loaded', fakeAsync(() => {
    render();

    expect(text()).toContain('Rp 4.305.000');
    expect(text()).toContain('42');
    expect(text()).toContain('Rp 102.500');
    expect(el('.stat--low-stock')?.textContent).toContain('3');
    expect(el('app-hourly-sales-chart')).toBeTruthy();
    expect(el('app-top-products-list')?.textContent).toContain(
      'Beras Premium 5 kg',
    );
    expect(el('app-top-products-list')?.textContent).toContain('BRS-005');
    expect(el('app-low-stock-list')?.textContent).toContain(
      'Air Mineral 600 ml',
    );
    expect(text()).toContain('Diperbarui otomatis');
    discardPeriodicTasks();
  }));

  it('links "Tambah Stok" to Stok Masuk with the product picked', fakeAsync(() => {
    render();

    const link = el('app-low-stock-list a.add');
    const tree = TestBed.inject(Router).parseUrl(
      link?.getAttribute('href') ?? '',
    );
    expect(tree.root.children['primary'].segments.map((s) => s.path)).toEqual([
      'stok',
      'masuk',
    ]);
    expect(tree.queryParams).toEqual({ produk: '6' });
    expect(link?.getAttribute('aria-label')).toBe(
      'Tambah Stok Air Mineral 600 ml',
    );
    discardPeriodicTasks();
  }));

  it('shows skeletons while loading', fakeAsync(() => {
    service.daily.and.returnValue(new Subject<DailyReport>());
    render();

    expect(
      fixture.debugElement.queryAll(By.css('.stats p-skeleton')).length,
    ).toBe(4);
    expect(el('.card--chart p-skeleton')).toBeTruthy();
    expect(el('app-hourly-sales-chart')).toBeFalsy();
    discardPeriodicTasks();
  }));

  it('shows zero cards and a friendly message instead of an empty chart', fakeAsync(() => {
    service.daily.and.returnValue(of(emptyReport));
    render();

    expect(text()).toContain('Rp 0');
    expect(el('app-hourly-sales-chart')).toBeFalsy();
    expect(el('.card--chart')?.textContent).toContain(
      'Belum ada transaksi hari ini',
    );
    expect(el('app-top-products-list')?.textContent).toContain(
      'Belum ada barang terjual hari ini',
    );
    discardPeriodicTasks();
  }));

  it('shows an error with a retry when the first load fails', fakeAsync(() => {
    service.daily.and.returnValue(throwError(() => failure));
    render();

    expect(text()).toContain('Gagal memuat dashboard');
    expect(text()).toContain(failure.message);
    expect(el('.stats')).toBeFalsy();

    service.daily.and.returnValue(of(report));
    (el('app-empty-state button') as HTMLButtonElement).click();
    tick(0);
    fixture.detectChanges();

    expect(text()).toContain('Rp 4.305.000');
    discardPeriodicTasks();
  }));

  it('refreshes every minute and keeps the figures when a refresh fails', fakeAsync(() => {
    render();
    expect(service.daily).toHaveBeenCalledTimes(1);

    service.daily.and.returnValue(throwError(() => failure));
    tick(REFRESH_INTERVAL_MS);
    fixture.detectChanges();

    expect(service.daily).toHaveBeenCalledTimes(2);
    expect(text()).toContain('Rp 4.305.000');
    expect(text()).toContain('Gagal memperbarui');
    expect(el('p-skeleton')).toBeFalsy();

    service.daily.and.returnValue(of({ ...report, totalRevenue: 4400000 }));
    tick(REFRESH_INTERVAL_MS);
    fixture.detectChanges();

    expect(text()).toContain('Rp 4.400.000');
    expect(text()).not.toContain('Gagal memperbarui');
    discardPeriodicTasks();
  }));
});
