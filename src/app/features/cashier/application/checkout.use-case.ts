import { Injectable, inject } from '@angular/core';

import { EmptyCartError } from '../domain/errors/cart.errors';
import { Cart } from '../domain/models/cart';
import { Payment } from '../domain/models/payment';
import { Sale } from '../domain/models/sale';
import { SaleRepository } from '../domain/repositories/sale.repository';

/**
 * Saves the cart as a sale. Only product ids, quantities and the cash
 * received are sent; the server recalculates prices, total and change.
 */
@Injectable()
export class CheckoutUseCase {
  private readonly sales = inject(SaleRepository);

  /**
   * Rejects with EmptyCartError / InsufficientPaymentError before calling the
   * server, or with the server's AppError when the sale is refused.
   */
  async execute(cart: Cart, payment: Payment): Promise<Sale> {
    if (cart.isEmpty) {
      throw new EmptyCartError();
    }
    payment.assertSufficient();
    return this.sales.create({
      items: cart.toSaleItems(),
      paymentMethod: payment.method,
      paid: payment.paid,
    });
  }
}
