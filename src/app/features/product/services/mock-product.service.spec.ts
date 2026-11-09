import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { Role } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { AppError } from '../../../core/http/api-error.model';
import { Product, ProductFormValue, ProductQuery } from '../models/product.model';
import { MockProductService } from './mock-product.service';

describe('MockProductService', () => {
  let role: Role;
  let service: MockProductService;

  const allProducts: ProductQuery = {
    search: '',
    categoryId: null,
    status: null,
    page: 0,
    size: 20,
    sort: null,
  };

  const newProduct: ProductFormValue = {
    name: 'Kecap Manis 275 ml',
    sku: 'KCP-001',
    barcode: '8991111222333',
    categoryId: 1,
    unit: 'PCS',
    costPrice: 9500,
    sellPrice: 11500,
    initialStock: 24,
    minStock: 10,
    isActive: true,
  };

  const skus = (products: Product[]) => products.map((p) => p.sku);
  const list = (query: Partial<ProductQuery>) =>
    firstValueFrom(service.list({ ...allProducts, ...query }));

  beforeEach(() => {
    role = 'OWNER';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        MockProductService,
        {
          provide: AuthService,
          useValue: {
            get currentUser() {
              return { id: 1, name: 'x', username: 'x', role };
            },
          },
        },
      ],
    });
    service = TestBed.inject(MockProductService);
  });

  it('returns the eight sample products with paging info', async () => {
    const page = await list({});

    expect(page.content.length).toBe(8);
    expect(page.totalElements).toBe(8);
    expect(page.totalPages).toBe(1);
    expect(page.last).toBeTrue();
  });

  it('searches name, SKU and barcode, ignoring case', async () => {
    expect(skus((await list({ search: 'BERAS' })).content)).toEqual(['BRS-005']);
    expect(skus((await list({ search: 'myk-' })).content)).toEqual(['MYK-002']);
    expect(skus((await list({ search: '8991234567951' })).content)).toEqual(['KPI-001']);
  });

  it('filters by category', async () => {
    expect((await list({ categoryId: 1 })).totalElements).toBe(4);
  });

  it('filters by status; low stock includes sold-out products', async () => {
    expect(skus((await list({ status: 'INACTIVE' })).content)).toEqual(['SBN-001']);
    expect(skus((await list({ status: 'LOW_STOCK' })).content)).toEqual([
      'MYK-002',
      'TLR-001',
      'AIR-600',
    ]);
  });

  it('sorts by a column in both directions', async () => {
    const asc = await list({ sort: { field: 'sell_price', direction: 'asc' } });
    const desc = await list({ sort: { field: 'sell_price', direction: 'desc' } });

    expect(asc.content[0].sku).toBe('KPI-001');
    expect(desc.content[0].sku).toBe('BRS-005');
  });

  it('paginates', async () => {
    const page = await list({ page: 1, size: 3 });

    expect(skus(page.content)).toEqual(['TLR-001', 'MIE-001', 'AIR-600']);
    expect(page.totalPages).toBe(3);
    expect(page.last).toBeFalse();
  });

  it('hides the cost price from a cashier', async () => {
    role = 'CASHIER';

    expect((await list({})).content.every((p) => p.costPrice === null)).toBeTrue();
  });

  it('computes stock status for a new product', async () => {
    const created = await firstValueFrom(service.create({ ...newProduct, initialStock: 0 }));

    expect(created.stockStatus).toBe('OUT_OF_STOCK');
    expect(created.id).toBe(9);
  });

  it('applies the active toggle when creating an inactive product', async () => {
    const created = await firstValueFrom(service.create({ ...newProduct, isActive: false }));

    expect(created.isActive).toBeFalse();
  });

  it('rejects a duplicate SKU and barcode', async () => {
    await expectAsync(firstValueFrom(service.create({ ...newProduct, sku: 'BRS-005' }))).toBeRejectedWith(
      jasmine.objectContaining<AppError>({ code: 'DUPLICATE_SKU' }),
    );
    await expectAsync(
      firstValueFrom(service.create({ ...newProduct, barcode: '8991234567890' })),
    ).toBeRejectedWith(jasmine.objectContaining<AppError>({ code: 'DUPLICATE_BARCODE' }));
  });

  it('lets a product keep its own SKU when editing, and leaves stock alone', async () => {
    const updated = await firstValueFrom(
      service.update(2, { ...newProduct, sku: 'MYK-002', barcode: null, initialStock: 99 }),
    );

    expect(updated.sku).toBe('MYK-002');
    expect(updated.barcode).toBeNull();
    expect(updated.stock).toBe(3);
  });

  it('changes the active status', async () => {
    const updated = await firstValueFrom(service.setActive(1, false));

    expect(updated.isActive).toBeFalse();
    expect(skus((await list({ status: 'INACTIVE' })).content)).toContain('BRS-005');
  });
});
