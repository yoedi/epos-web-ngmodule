import {
  InsufficientStockError,
  InvalidQuantityError,
  OutOfStockError,
  ProductInactiveError,
} from '../errors/cart.errors';
import { Cart } from './cart';
import { Product } from './product';

function product(overrides: Partial<Product> & Pick<Product, 'id' | 'name'>): Product {
  return {
    sku: `SKU-${overrides.id}`,
    barcode: null,
    categoryName: 'Sembako',
    unit: 'PCS',
    sellPrice: 1000,
    stock: 10,
    minStock: 0,
    isActive: true,
    ...overrides,
  };
}

// Sample data from PRD section 12.
const beras = product({ id: 1, name: 'Beras Premium 5 kg', sellPrice: 78000, stock: 24, minStock: 10 });
const minyak = product({ id: 2, name: 'Minyak Goreng 2 L', sellPrice: 36500, stock: 3, minStock: 12 });
const telur = product({ id: 4, name: 'Telur Ayam 1 kg', sellPrice: 29000, stock: 8, minStock: 10 });
const mie = product({ id: 5, name: 'Mi Instan Goreng', sellPrice: 3500, stock: 120, minStock: 48 });
const air = product({ id: 6, name: 'Air Mineral 600 ml', sellPrice: 4000, stock: 0, minStock: 24 });
const kopi = product({ id: 8, name: 'Kopi Sachet', sellPrice: 2000, stock: 85, minStock: 30 });

describe('Cart', () => {
  describe('adding items', () => {
    it('starts empty', () => {
      const cart = Cart.empty();

      expect(cart.isEmpty).toBeTrue();
      expect(cart.total).toBe(0);
      expect(cart.itemCount).toBe(0);
    });

    it('adds a new line with qty 1', () => {
      const cart = Cart.empty().add(beras);

      expect(cart.lineCount).toBe(1);
      expect(cart.find(beras.id)?.qty).toBe(1);
    });

    it('raises the qty of an existing line instead of adding a second one', () => {
      const cart = Cart.empty().add(kopi).add(kopi, 9);

      expect(cart.lineCount).toBe(1);
      expect(cart.find(kopi.id)?.qty).toBe(10);
    });

    it('keeps lines in the order they were added', () => {
      const cart = Cart.empty().add(beras).add(mie).add(beras);

      expect(cart.items.map((i) => i.productId)).toEqual([beras.id, mie.id]);
    });

    it('is immutable: the original cart is untouched', () => {
      const empty = Cart.empty();
      const one = empty.add(beras);
      const two = one.add(beras);

      expect(empty.isEmpty).toBeTrue();
      expect(one.find(beras.id)?.qty).toBe(1);
      expect(two.find(beras.id)?.qty).toBe(2);
    });

    it('rejects a qty that is not a positive whole number', () => {
      expect(() => Cart.empty().add(beras, 0)).toThrowError(InvalidQuantityError);
      expect(() => Cart.empty().add(beras, 1.5)).toThrowError(InvalidQuantityError);
    });
  });

  describe('stock', () => {
    it('refuses a sold-out product', () => {
      expect(() => Cart.empty().add(air)).toThrowMatching(
        (e) => e instanceof OutOfStockError && e.message === 'Stok Air Mineral 600 ml habis',
      );
    });

    it('refuses an inactive product', () => {
      const inactive = product({ id: 7, name: 'Sabun Mandi Batang', isActive: false });

      expect(() => Cart.empty().add(inactive)).toThrowError(ProductInactiveError);
    });

    it('refuses adding past the stock, with the PRD message', () => {
      const cart = Cart.empty().add(minyak, 3);

      expect(() => cart.add(minyak)).toThrowMatching(
        (e) =>
          e instanceof InsufficientStockError && e.message === 'Stok Minyak Goreng 2 L tersisa 3',
      );
    });

    it('refuses setting a qty above the stock and keeps the cart as it was', () => {
      const cart = Cart.empty().add(minyak);

      expect(() => cart.setQty(minyak.id, 4)).toThrowError(InsufficientStockError);
      expect(cart.find(minyak.id)?.qty).toBe(1);
    });

    it('allows exactly the stock', () => {
      expect(Cart.empty().add(minyak, 3).find(minyak.id)?.qty).toBe(3);
    });

    it('warns "Sisa stok" once what is left reaches the minimum stock', () => {
      const cart = Cart.empty().add(telur).add(beras);

      expect(cart.find(telur.id)?.isRunningLow).toBeTrue();
      expect(cart.find(telur.id)?.remainingStock).toBe(7);
      expect(cart.find(beras.id)?.isRunningLow).toBeFalse();
    });
  });

  describe('changing lines', () => {
    it('sets the qty of a line', () => {
      const cart = Cart.empty().add(mie).setQty(mie.id, 5);

      expect(cart.find(mie.id)?.qty).toBe(5);
    });

    it('refuses a qty below 1 (Delete removes a line instead)', () => {
      const cart = Cart.empty().add(mie);

      expect(() => cart.setQty(mie.id, 0)).toThrowError(InvalidQuantityError);
    });

    it('removes a line', () => {
      const cart = Cart.empty().add(beras).add(mie).remove(beras.id);

      expect(cart.items.map((i) => i.productId)).toEqual([mie.id]);
    });

    it('clears every line', () => {
      expect(Cart.empty().add(beras).add(mie).clear().isEmpty).toBeTrue();
    });
  });

  describe('totals', () => {
    // PRD section 12 sample cart.
    const sample = Cart.empty().add(beras).add(mie, 5).add(telur).add(kopi, 10);

    it('adds up the subtotals: Rp 144.500', () => {
      expect(sample.find(mie.id)?.subtotal).toBe(17500);
      expect(sample.total).toBe(144500);
    });

    it('counts "4 jenis · 17 barang"', () => {
      expect(sample.lineCount).toBe(4);
      expect(sample.itemCount).toBe(17);
    });

    it('sends only product ids and quantities to the server', () => {
      expect(sample.toSaleItems()).toEqual([
        { productId: 1, qty: 1 },
        { productId: 5, qty: 5 },
        { productId: 4, qty: 1 },
        { productId: 8, qty: 10 },
      ]);
    });
  });
});
