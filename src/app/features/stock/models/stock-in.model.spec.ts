import {
  StockProduct,
  addLine,
  isValidQty,
  removeLine,
  stockAfter,
  toStockInRequest,
  totalUnits,
} from './stock-in.model';

describe('stock-in model', () => {
  const minyak: StockProduct = { id: 2, sku: 'MYK-002', barcode: null, name: 'Minyak Goreng 2 L', stock: 3 };
  const air: StockProduct = { id: 6, sku: 'AIR-600', barcode: null, name: 'Air Mineral 600 ml', stock: 0 };

  it('adds a new line and shows stock after', () => {
    const lines = addLine([], minyak, 12);
    expect(lines).toEqual([{ product: minyak, qty: 12 }]);
    expect(stockAfter(lines[0])).toBe(15);
  });

  it('merges the same product into one line without mutating the input', () => {
    const first = addLine([], minyak, 12);
    const merged = addLine(first, minyak, 5);
    expect(merged.length).toBe(1);
    expect(merged[0].qty).toBe(17);
    expect(first[0].qty).toBe(12);
  });

  it('removes a line and totals the units', () => {
    const lines = addLine(addLine([], minyak, 12), air, 24);
    expect(totalUnits(lines)).toBe(36);
    expect(removeLine(lines, 2).map((l) => l.product.id)).toEqual([6]);
  });

  it('accepts only whole quantities of at least 1', () => {
    expect(isValidQty(1)).toBeTrue();
    expect(isValidQty(0)).toBeFalse();
    expect(isValidQty(-3)).toBeFalse();
    expect(isValidQty(1.5)).toBeFalse();
    expect(isValidQty(NaN)).toBeFalse();
  });

  it('builds the POST /stock/in body, leaving out an empty note', () => {
    const lines = addLine([], air, 24);
    expect(toStockInRequest('  Belanja grosir 16 Sep ', lines)).toEqual({
      note: 'Belanja grosir 16 Sep',
      items: [{ product_id: 6, qty: 24 }],
    });
    expect(toStockInRequest('  ', lines)).toEqual({ items: [{ product_id: 6, qty: 24 }] });
  });
});
