import {
  formatSignedQty,
  isNoteRequired,
  isValidPhysicalStock,
  parsePhysicalStock,
  reasonLabel,
  stockDifference,
  toStockAdjustmentRequest,
} from './stock-adjustment.model';

describe('stock adjustment model', () => {
  it('computes the difference as physical minus system stock', () => {
    expect(stockDifference(3, 26)).toBe(23);
    expect(stockDifference(24, 20)).toBe(-4);
    expect(stockDifference(8, 8)).toBe(0);
  });

  it('accepts whole numbers from 0 as a physical count', () => {
    expect(isValidPhysicalStock(0)).toBeTrue();
    expect(isValidPhysicalStock(26)).toBeTrue();
    expect(isValidPhysicalStock(-1)).toBeFalse();
    expect(isValidPhysicalStock(2.5)).toBeFalse();
    expect(isValidPhysicalStock(NaN)).toBeFalse();
  });

  it('requires a note only for "Lainnya"', () => {
    expect(isNoteRequired('LAINNYA')).toBeTrue();
    expect(isNoteRequired('RUSAK')).toBeFalse();
    expect(isNoteRequired(null)).toBeFalse();
  });

  it('labels reasons in Indonesian', () => {
    expect(reasonLabel('SALAH_HITUNG')).toBe('Salah Hitung');
    expect(reasonLabel(null)).toBe('');
  });

  it('sends the physical count, not the difference, and drops an empty note', () => {
    expect(toStockAdjustmentRequest(2, 26, 'RUSAK', ' Kemasan bocor ')).toEqual({
      product_id: 2,
      physical_stock: 26,
      reason: 'RUSAK',
      note: 'Kemasan bocor',
    });
    expect(toStockAdjustmentRequest(2, 26, 'HILANG', '  ')).toEqual({
      product_id: 2,
      physical_stock: 26,
      reason: 'HILANG',
    });
  });

  it('formats the difference with a visible sign', () => {
    expect(formatSignedQty(23)).toBe('+23');
    expect(formatSignedQty(-4)).toBe('−4');
    expect(formatSignedQty(0)).toBe('0');
  });

  it('parses a typed count of digits only', () => {
    expect(parsePhysicalStock(' 26 ')).toBe(26);
    expect(parsePhysicalStock('0')).toBe(0);
    expect(parsePhysicalStock('')).toBeNull();
    expect(parsePhysicalStock('-1')).toBeNull();
    expect(parsePhysicalStock('2.5')).toBeNull();
    expect(parsePhysicalStock('1e3')).toBeNull();
  });
});
