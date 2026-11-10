import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { Role } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { AppError } from '../../../core/http/api-error.model';
import { jakartaToday } from '../models/date-range';
import { SaleQuery } from '../models/sale-history.model';
import { MockSaleHistoryService } from './mock-sale-history.service';

describe('MockSaleHistoryService', () => {
  let role: Role;
  let userId: number;
  let service: MockSaleHistoryService;

  const today = jakartaToday();
  const twoWeeksAgo = jakartaToday(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));
  // Past days are always complete; today depends on the current time.
  const yesterday = jakartaToday(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const twoWeeks: SaleQuery = {
    startDate: twoWeeksAgo,
    endDate: today,
    cashierId: null,
    invoiceNo: '',
    page: 0,
    size: 100,
    direction: 'desc',
  };

  const list = (query: Partial<SaleQuery>) =>
    firstValueFrom(service.list({ ...twoWeeks, ...query }));
  const isoDate = (date: Date) => jakartaToday(date);

  beforeEach(() => {
    role = 'OWNER';
    userId = 1;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        MockSaleHistoryService,
        {
          provide: AuthService,
          useValue: {
            get currentUser() {
              return { id: userId, name: 'x', username: 'x', role };
            },
          },
        },
      ],
    });
    service = TestBed.inject(MockSaleHistoryService);
  });

  it('keeps sales inside the date range and newest first', async () => {
    const { page } = await list({ startDate: yesterday, endDate: yesterday });

    expect(page.totalElements).toBeGreaterThan(0);
    expect(page.content.every((s) => isoDate(s.createdAt) === yesterday)).toBeTrue();
    const times = page.content.map((s) => s.createdAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('sorts oldest first on request', async () => {
    const { page } = await list({ startDate: yesterday, endDate: yesterday, direction: 'asc' });

    expect(page.content[0].invoiceNo).toMatch(/-0001$/);
  });

  it('numbers invoices INV-YYYYMMDD-NNNN', async () => {
    const { page } = await list({ startDate: yesterday, endDate: yesterday });

    const compact = yesterday.replace(/-/g, '');
    expect(page.content.every((s) => new RegExp(`^INV-${compact}-\\d{4}$`).test(s.invoiceNo))).toBeTrue();
  });

  it('computes the summary over the whole filter, not just the page', async () => {
    const all = await list({ startDate: yesterday, endDate: yesterday });
    const firstPage = await list({ startDate: yesterday, endDate: yesterday, size: 5 });

    const revenue = all.page.content.reduce((sum, s) => sum + s.total, 0);
    expect(firstPage.page.content.length).toBe(5);
    expect(firstPage.totals.totalRevenue).toBe(revenue);
    expect(firstPage.totals.transactionCount).toBe(all.page.totalElements);
    expect(Number.isInteger(firstPage.totals.averageTransaction)).toBeTrue();
  });

  it('filters by cashier and by invoice number', async () => {
    const dewi = await list({ cashierId: 3 });
    expect(dewi.page.content.every((s) => s.cashierName === 'Dewi Anggraini')).toBeTrue();

    const target = dewi.page.content[0].invoiceNo;
    const found = await list({ invoiceNo: target.slice(-8).toLowerCase() });
    expect(found.page.content.map((s) => s.invoiceNo)).toContain(target);
  });

  it('returns an empty page with zero totals when nothing matches', async () => {
    const { page, totals } = await list({ invoiceNo: 'TIDAK-ADA' });

    expect(page.totalElements).toBe(0);
    expect(totals).toEqual({ totalRevenue: 0, transactionCount: 0, averageTransaction: 0 });
  });

  it('gives a cashier only their own sales of today, whatever the filter', async () => {
    role = 'CASHIER';
    userId = 2;

    const { page } = await list({ cashierId: 3 });

    expect(
      page.content.every((s) => s.cashierName === 'Rina Lestari' && isoDate(s.createdAt) === today),
    ).toBeTrue();
  });

  it('returns the detail with the store for the receipt', async () => {
    const { page } = await list({ startDate: yesterday, endDate: yesterday, size: 1 });

    const sale = await firstValueFrom(service.get(page.content[0].id));

    expect(sale.invoiceNo).toBe(page.content[0].invoiceNo);
    expect(sale.store.storeName).toBe('Toko Berkah Jaya');
    expect(sale.items.reduce((sum, i) => sum + i.subtotal, 0)).toBe(sale.total);
    expect(sale.change).toBe(sale.paid - sale.total);
  });

  it('hides another day from a cashier with NOT_FOUND', async () => {
    const { page } = await list({ startDate: yesterday, endDate: yesterday, cashierId: 2, size: 1 });
    role = 'CASHIER';
    userId = 2;

    const error = await firstValueFrom(service.get(page.content[0].id)).catch((e: AppError) => e);

    expect((error as AppError).code).toBe('NOT_FOUND');
  });
});
