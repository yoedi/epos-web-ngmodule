import { InsufficientPaymentError, InvalidAmountError } from '../errors/cart.errors';

/** `sales.payment_method`. v1 only has cash; QRIS and others come in v3. */
export type PaymentMethod = 'CASH';

/**
 * Cash received against a total, in whole rupiah. Immutable.
 * Used for the live "Kembalian" in the payment modal; the change of the
 * saved sale comes from the server response.
 */
export class Payment {
  private constructor(
    readonly total: number,
    readonly paid: number,
    readonly method: PaymentMethod,
  ) {}

  static of(total: number, paid: number, method: PaymentMethod = 'CASH'): Payment {
    assertAmount(total);
    assertAmount(paid);
    return new Payment(total, paid, method);
  }

  get isSufficient(): boolean {
    return this.paid >= this.total;
  }

  /** Change to hand back; 0 while the payment is short. */
  get change(): number {
    return Math.max(0, this.paid - this.total);
  }

  /** "Uang kurang Rp X"; 0 once the payment is enough. */
  get shortfall(): number {
    return Math.max(0, this.total - this.paid);
  }

  assertSufficient(): void {
    if (!this.isSufficient) {
      throw new InsufficientPaymentError(this.shortfall);
    }
  }
}

function assertAmount(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new InvalidAmountError();
  }
}
