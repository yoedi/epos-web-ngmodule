import { TestBed } from '@angular/core/testing';

import { EmptyCartError, InsufficientPaymentError } from '../domain/errors/cart.errors';
import { Cart } from '../domain/models/cart';
import { Payment } from '../domain/models/payment';
import { Product } from '../domain/models/product';
import { Sale } from '../domain/models/sale';
import { SaleRepository } from '../domain/repositories/sale.repository';
import { CheckoutUseCase } from './checkout.use-case';

describe('CheckoutUseCase', () => {
  let useCase: CheckoutUseCase;
  let repository: jasmine.SpyObj<SaleRepository>;

  const beras: Product = {
    id: 1,
    sku: 'BRS-005',
    barcode: null,
    name: 'Beras Premium 5 kg',
    categoryName: 'Sembako',
    unit: 'KG',
    sellPrice: 78000,
    stock: 24,
    minStock: 10,
    isActive: true,
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<SaleRepository>('SaleRepository', ['create']);
    repository.create.and.resolveTo({ invoiceNo: 'INV-20260916-0001' } as Sale);
    TestBed.configureTestingModule({
      providers: [CheckoutUseCase, { provide: SaleRepository, useValue: repository }],
    });
    useCase = TestBed.inject(CheckoutUseCase);
  });

  it('sends ids, quantities and cash received, never prices or totals', async () => {
    const cart = Cart.empty().add(beras, 2);

    await useCase.execute(cart, Payment.of(cart.total, 200000));

    expect(repository.create).toHaveBeenCalledOnceWith({
      items: [{ productId: 1, qty: 2 }],
      paymentMethod: 'CASH',
      paid: 200000,
    });
  });

  it('refuses an empty cart without calling the server', async () => {
    await expectAsync(useCase.execute(Cart.empty(), Payment.of(0, 0))).toBeRejectedWithError(
      EmptyCartError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses a short payment without calling the server', async () => {
    const cart = Cart.empty().add(beras);

    await expectAsync(useCase.execute(cart, Payment.of(cart.total, 50000))).toBeRejectedWithError(
      InsufficientPaymentError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
