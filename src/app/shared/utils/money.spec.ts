import { formatRupiah, formatThousands, parseDigits } from './money';

describe('money', () => {
  it('formats thousands with dots', () => {
    expect(formatThousands(0)).toBe('0');
    expect(formatThousands(500)).toBe('500');
    expect(formatThousands(144500)).toBe('144.500');
    expect(formatThousands(1875000)).toBe('1.875.000');
  });

  it('formats rupiah without decimals', () => {
    expect(formatRupiah(36500)).toBe('Rp 36.500');
    expect(formatRupiah(0)).toBe('Rp 0');
  });

  it('puts the minus sign before Rp', () => {
    expect(formatRupiah(-1500)).toBe('-Rp 1.500');
  });

  it('parses digits out of formatted text', () => {
    expect(parseDigits('1.500')).toBe(1500);
    expect(parseDigits('Rp 36.500')).toBe(36500);
    expect(parseDigits('0')).toBe(0);
  });

  it('returns null when there are no digits', () => {
    expect(parseDigits('')).toBeNull();
    expect(parseDigits('abc')).toBeNull();
  });
});
