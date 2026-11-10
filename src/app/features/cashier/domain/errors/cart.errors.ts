/**
 * Business rule violations raised by Cart, Payment and the use cases.
 * Messages are Indonesian and ready to display (PRD 9.2), except where the
 * presentation needs to format money: those errors carry the amount instead.
 */
export abstract class CashierError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Qty would go above the stock: "Stok Minyak Goreng 2 L tersisa 3". */
export class InsufficientStockError extends CashierError {
  constructor(
    readonly productName: string,
    readonly available: number,
  ) {
    super('INSUFFICIENT_STOCK', `Stok ${productName} tersisa ${available}`);
  }
}

/** Sold-out products show "Habis" and cannot be added. */
export class OutOfStockError extends CashierError {
  constructor(readonly productName: string) {
    super('OUT_OF_STOCK', `Stok ${productName} habis`);
  }
}

export class ProductInactiveError extends CashierError {
  constructor(readonly productName: string) {
    super('PRODUCT_INACTIVE', `Produk ${productName} sudah tidak aktif`);
  }
}

export class InvalidQuantityError extends CashierError {
  constructor() {
    super('INVALID_QUANTITY', 'Jumlah barang minimal 1');
  }
}

export class EmptyCartError extends CashierError {
  constructor() {
    super('EMPTY_CART', 'Keranjang masih kosong');
  }
}

/** The presentation formats the message: "Uang kurang Rp 44.500". */
export class InsufficientPaymentError extends CashierError {
  constructor(readonly shortfall: number) {
    super('INSUFFICIENT_PAYMENT', 'Uang kurang');
  }
}

export class InvalidAmountError extends CashierError {
  constructor() {
    super('INVALID_AMOUNT', 'Nominal harus bilangan bulat rupiah, tidak negatif');
  }
}

export class ProductNotFoundError extends CashierError {
  constructor(readonly barcode: string) {
    super('NOT_FOUND', `Barang dengan barcode ${barcode} tidak ditemukan`);
  }
}
