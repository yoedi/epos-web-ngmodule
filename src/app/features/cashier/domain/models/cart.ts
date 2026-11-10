import {
  InsufficientStockError,
  InvalidQuantityError,
  OutOfStockError,
  ProductInactiveError,
} from '../errors/cart.errors';
import { CartItem } from './cart-item';
import { Product, isSoldOut } from './product';

/** Line of POST /sales: the client never sends prices or totals. */
export interface SaleItemRequest {
  productId: number;
  qty: number;
}

/**
 * Shopping cart of the cashier screen. Immutable: every operation returns
 * a new Cart and leaves the old one untouched. Stock checks here are for
 * the user's convenience only; the server stays the source of truth.
 */
export class Cart {
  private static readonly EMPTY = new Cart([]);

  private constructor(readonly items: readonly CartItem[]) {}

  static empty(): Cart {
    return Cart.EMPTY;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** "4 jenis": number of different products. */
  get lineCount(): number {
    return this.items.length;
  }

  /** "17 barang": sum of all quantities. */
  get itemCount(): number {
    return this.items.reduce((sum, item) => sum + item.qty, 0);
  }

  /** Estimate shown before paying. The total of the saved sale comes from the server. */
  get total(): number {
    return this.items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  find(productId: number): CartItem | undefined {
    return this.items.find((item) => item.productId === productId);
  }

  /** Adds `qty` of a product, or raises the qty of its existing line. */
  add(product: Product, qty = 1): Cart {
    assertQuantity(qty);
    if (!product.isActive) {
      throw new ProductInactiveError(product.name);
    }
    if (isSoldOut(product)) {
      throw new OutOfStockError(product.name);
    }

    const existing = this.find(product.id);
    const nextQty = (existing?.qty ?? 0) + qty;
    assertInStock(product, nextQty);

    if (!existing) {
      return new Cart([...this.items, new CartItem(product, nextQty)]);
    }
    // The latest product data wins, in case the stock changed since it was added.
    return this.replace(product.id, new CartItem(product, nextQty));
  }

  setQty(productId: number, qty: number): Cart {
    const item = this.find(productId);
    if (!item) {
      return this;
    }
    assertQuantity(qty);
    assertInStock(item.product, qty);
    return qty === item.qty ? this : this.replace(productId, item.withQty(qty));
  }

  remove(productId: number): Cart {
    const items = this.items.filter((item) => item.productId !== productId);
    if (items.length === this.items.length) {
      return this;
    }
    return items.length === 0 ? Cart.empty() : new Cart(items);
  }

  clear(): Cart {
    return Cart.empty();
  }

  toSaleItems(): SaleItemRequest[] {
    return this.items.map((item) => ({ productId: item.productId, qty: item.qty }));
  }

  private replace(productId: number, next: CartItem): Cart {
    return new Cart(this.items.map((item) => (item.productId === productId ? next : item)));
  }
}

function assertQuantity(qty: number): void {
  if (!Number.isInteger(qty) || qty < 1) {
    throw new InvalidQuantityError();
  }
}

function assertInStock(product: Product, qty: number): void {
  if (qty > product.stock) {
    throw new InsufficientStockError(product.name, product.stock);
  }
}
