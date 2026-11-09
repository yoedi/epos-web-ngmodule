import { RupiahPipe } from './rupiah.pipe';

describe('RupiahPipe', () => {
  const pipe = new RupiahPipe();

  it('formats an integer rupiah amount', () => {
    expect(pipe.transform(144500)).toBe('Rp 144.500');
  });

  it('keeps zero, which is a valid price', () => {
    expect(pipe.transform(0)).toBe('Rp 0');
  });

  it('renders nothing while the value is not there yet', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
