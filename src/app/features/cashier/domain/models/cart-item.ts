import { Product } from './product';

/** One cart line. Immutable: changing the qty gives a new item. */
export class CartItem {
  constructor(
    readonly product: Product,
    readonly qty: number,
  ) {}

  get productId(): number {
    return this.product.id;
  }

  /** Estimate for the screen; the server recalculates on checkout. */
  get subtotal(): number {
    return this.product.sellPrice * this.qty;
  }

  /** Stock left on the shelf once this line is sold. */
  get remainingStock(): number {
    return this.product.stock - this.qty;
  }

  /** "Sisa stok 7" warning: what is left reaches the minimum stock. */
  get isRunningLow(): boolean {
    return this.remainingStock <= this.product.minStock;
  }

  get canIncrease(): boolean {
    return this.qty < this.product.stock;
  }

  withQty(qty: number): CartItem {
    return new CartItem(this.product, qty);
  }
}
