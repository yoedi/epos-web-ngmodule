import { InsufficientPaymentError, InvalidAmountError } from '../errors/cart.errors';
import { Payment } from './payment';

describe('Payment', () => {
  it('computes the change: Rp 150.000 for Rp 144.500 gives Rp 5.500', () => {
    const payment = Payment.of(144500, 150000);

    expect(payment.isSufficient).toBeTrue();
    expect(payment.change).toBe(5500);
    expect(payment.shortfall).toBe(0);
  });

  it('accepts the exact amount with no change', () => {
    const payment = Payment.of(144500, 144500);

    expect(payment.isSufficient).toBeTrue();
    expect(payment.change).toBe(0);
  });

  it('reports the shortfall when the cash is not enough', () => {
    const payment = Payment.of(144500, 100000);

    expect(payment.isSufficient).toBeFalse();
    expect(payment.shortfall).toBe(44500);
    expect(payment.change).toBe(0);
  });

  it('throws InsufficientPaymentError carrying the shortfall', () => {
    expect(() => Payment.of(144500, 100000).assertSufficient()).toThrowMatching(
      (e) => e instanceof InsufficientPaymentError && e.shortfall === 44500,
    );
    expect(() => Payment.of(144500, 150000).assertSufficient()).not.toThrow();
  });

  it('defaults to cash', () => {
    expect(Payment.of(1000, 1000).method).toBe('CASH');
  });

  it('refuses amounts that are not whole, non-negative rupiah', () => {
    expect(() => Payment.of(1000, -1)).toThrowError(InvalidAmountError);
    expect(() => Payment.of(1000.5, 2000)).toThrowError(InvalidAmountError);
    expect(() => Payment.of(1000, Number.NaN)).toThrowError(InvalidAmountError);
  });
});
