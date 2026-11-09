import { initials } from './initials';

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Rina Lestari')).toBe('RL');
    expect(initials('Budi Santoso')).toBe('BS');
  });

  it('skips the leading "Toko" of a store name', () => {
    expect(initials('Toko Berkah Jaya')).toBe('BJ');
  });

  it('handles single words, extra spaces and empty input', () => {
    expect(initials('  warung ')).toBe('W');
    expect(initials('')).toBe('');
  });
});
