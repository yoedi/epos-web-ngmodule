import { Injectable } from '@angular/core';

import { Cart } from '../domain/models/cart';
import { Product } from '../domain/models/product';

/** Puts one more unit of a product in the cart. Throws a CashierError when not allowed. */
@Injectable()
export class AddToCartUseCase {
  execute(cart: Cart, product: Product, qty = 1): Cart {
    return cart.add(product, qty);
  }
}
