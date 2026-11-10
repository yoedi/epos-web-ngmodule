import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../../../core/auth/auth.service';
import { AppError } from '../../../../core/http/api-error.model';
import { MockPosBackend } from './mock-pos.backend';

describe('MockPosBackend', () => {
  let backend: MockPosBackend;

  function errorOf(work: () => unknown): AppError | undefined {
    try {
      work();
      return undefined;
    } catch (err) {
      return err as AppError;
    }
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MockPosBackend,
        {
          provide: AuthService,
          useValue: { currentUser: { id: 2, name: 'Rina Lestari', username: 'rina', role: 'CASHIER' } },
        },
      ],
    });
    backend = TestBed.inject(MockPosBackend);
  });

  it('recalculates the PRD sample sale: total Rp 144.500, change Rp 5.500', () => {
    const sale = backend.createSale({
      items: [
        { product_id: 1, qty: 1 },
        { product_id: 5, qty: 5 },
        { product_id: 4, qty: 1 },
        { product_id: 8, qty: 10 },
      ],
      payment_method: 'CASH',
      paid: 150000,
    });

    expect(sale.total).toBe(144500);
    expect(sale.change_amount).toBe(5500);
    expect(sale.cashier.name).toBe('Rina Lestari');
    expect(sale.invoice_no).toMatch(/^INV-\d{8}-0001$/);
    expect(sale.created_at).toMatch(/\+07:00$/);
  });

  it('numbers invoices one after another', () => {
    const body = { items: [{ product_id: 8, qty: 1 }], payment_method: 'CASH' as const, paid: 2000 };

    backend.createSale(body);
    const second = backend.createSale(body);

    expect(second.invoice_no).toMatch(/-0002$/);
  });

  it('lowers the stock the search shows', () => {
    backend.createSale({ items: [{ product_id: 2, qty: 2 }], payment_method: 'CASH', paid: 73000 });

    const [minyak] = backend.searchProducts({ search: 'MYK', status: 'ACTIVE', page: 0, size: 8 });
    expect(minyak.stock).toBe(1);
  });

  it('refuses more than the stock and changes nothing', () => {
    const error = errorOf(() =>
      backend.createSale({
        items: [
          { product_id: 1, qty: 1 },
          { product_id: 2, qty: 4 },
        ],
        payment_method: 'CASH',
        paid: 1_000_000,
      }),
    );

    expect(error?.code).toBe('INSUFFICIENT_STOCK');
    expect(error?.message).toBe('Stok Minyak Goreng 2 L tersisa 3');
    const [beras] = backend.searchProducts({ search: 'BRS', status: 'ACTIVE', page: 0, size: 8 });
    expect(beras.stock).toBe(24);
  });

  it('refuses a short payment with the amount missing', () => {
    const error = errorOf(() =>
      backend.createSale({ items: [{ product_id: 1, qty: 1 }], payment_method: 'CASH', paid: 50000 }),
    );

    expect(error?.code).toBe('INSUFFICIENT_PAYMENT');
    expect(error?.message).toBe('Uang kurang Rp 28.000');
  });

  it('leaves inactive products out of the search', () => {
    expect(backend.searchProducts({ search: 'Sabun', status: 'ACTIVE', page: 0, size: 8 })).toEqual(
      [],
    );
  });

  it('reports an unknown barcode as NOT_FOUND', () => {
    const error = errorOf(() => backend.findByBarcode('8990000000000'));

    expect(error?.code).toBe('NOT_FOUND');
    expect(error?.message).toBe('Barang dengan barcode 8990000000000 tidak ditemukan');
  });
});
