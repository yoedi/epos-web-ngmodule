import {
  ProductDto,
  ProductFormValue,
  ProductQuery,
  marginOf,
  toCreateDto,
  toListParams,
  toProduct,
  toUpdateDto,
} from './product.model';

describe('product model', () => {
  const dto: ProductDto = {
    id: 2,
    sku: 'MYK-002',
    barcode: '8991234567890',
    name: 'Minyak Goreng 2 L',
    category: { id: 1, name: 'Sembako' },
    unit: 'LITER',
    cost_price: 32000,
    sell_price: 36500,
    stock: 3,
    min_stock: 12,
    stock_status: 'LOW_STOCK',
    is_active: true,
  };

  const form: ProductFormValue = {
    name: 'Kecap Manis 275 ml',
    sku: 'KCP-001',
    barcode: null,
    categoryId: 1,
    unit: 'PCS',
    costPrice: 9500,
    sellPrice: 11500,
    initialStock: 24,
    minStock: 10,
    isActive: true,
  };

  describe('toProduct', () => {
    it('maps snake_case fields to the application model', () => {
      const product = toProduct(dto);

      expect(product.sellPrice).toBe(36500);
      expect(product.costPrice).toBe(32000);
      expect(product.minStock).toBe(12);
      expect(product.stockStatus).toBe('LOW_STOCK');
      expect(product.isActive).toBeTrue();
    });

    it('uses null when the server hides cost_price from a cashier', () => {
      const { cost_price: _hidden, ...cashierDto } = dto;

      expect(toProduct(cashierDto).costPrice).toBeNull();
    });
  });

  describe('toListParams', () => {
    const query: ProductQuery = {
      search: '',
      categoryId: null,
      status: null,
      page: 0,
      size: 20,
      sort: null,
    };

    it('only sends paging when nothing is filtered', () => {
      expect(toListParams(query)).toEqual({ page: 0, size: 20 });
    });

    it('sends each active filter and the sort as field,direction', () => {
      const params = toListParams({
        ...query,
        search: 'beras',
        categoryId: 1,
        status: 'LOW_STOCK',
        page: 2,
        sort: { field: 'sell_price', direction: 'desc' },
      });

      expect(params).toEqual({
        search: 'beras',
        category_id: 1,
        status: 'LOW_STOCK',
        page: 2,
        size: 20,
        sort: 'sell_price,desc',
      });
    });
  });

  describe('request bodies', () => {
    it('leaves an empty barcode out when creating', () => {
      expect('barcode' in toCreateDto(form)).toBeFalse();
      expect(toCreateDto({ ...form, barcode: '899' }).barcode).toBe('899');
    });

    it('sends initial_stock when creating', () => {
      expect(toCreateDto(form).initial_stock).toBe(24);
    });

    it('never sends stock fields other than min_stock when editing', () => {
      const body = toUpdateDto(form);

      expect('initial_stock' in body).toBeFalse();
      expect('stock' in body).toBeFalse();
      expect(body.min_stock).toBe(10);
    });

    it('sends a null barcode when editing so it can be cleared', () => {
      expect(toUpdateDto(form).barcode).toBeNull();
    });
  });

  describe('marginOf', () => {
    it('computes the amount and whole percent of the selling price', () => {
      expect(marginOf(11000, 12500)).toEqual({ amount: 1500, percent: 12 });
    });

    it('is negative when selling below cost', () => {
      expect(marginOf(1000, 800)).toEqual({ amount: -200, percent: -25 });
    });

    it('has no percent for a zero selling price', () => {
      expect(marginOf(1000, 0)).toEqual({ amount: -1000, percent: null });
    });
  });
});
