import { BOTTOM_NAV, SIDEBAR_MENU, entryLink, isActive, visibleFor } from './nav-menu';

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe('nav-menu', () => {
  describe('visibleFor', () => {
    it('shows the owner every sidebar menu', () => {
      expect(labels(visibleFor(SIDEBAR_MENU, 'OWNER'))).toEqual([
        'Dashboard',
        'Kasir',
        'Transaksi',
        'Produk',
        'Stok',
      ]);
    });

    it('hides Dashboard and Stok from the cashier', () => {
      expect(labels(visibleFor(SIDEBAR_MENU, 'CASHIER'))).toEqual(['Kasir', 'Transaksi', 'Produk']);
    });

    it('keeps Produk children for the cashier', () => {
      const produk = visibleFor(SIDEBAR_MENU, 'CASHIER').find((i) => i.label === 'Produk');
      expect(labels([...(produk?.children ?? [])])).toEqual(['Daftar Produk', 'Kategori']);
    });

    it('drops a group whose children are all hidden', () => {
      const menu = [{ label: 'Grup', children: [{ label: 'A', link: '/a', roles: ['OWNER'] as const }] }];
      expect(visibleFor(menu, 'CASHIER')).toEqual([]);
    });

    it('builds the phone bottom nav per role', () => {
      expect(labels(visibleFor(BOTTOM_NAV, 'OWNER'))).toEqual([
        'Dashboard',
        'Transaksi',
        'Produk',
        'Stok',
      ]);
      expect(labels(visibleFor(BOTTOM_NAV, 'CASHIER'))).toEqual(['Kasir', 'Transaksi', 'Produk']);
    });
  });

  describe('isActive', () => {
    const stok = SIDEBAR_MENU.find((i) => i.label === 'Stok')!;

    it('matches a leaf link and the routes below it', () => {
      const leaf = { label: 'Produk', link: '/produk' };
      expect(isActive(leaf, '/produk')).toBeTrue();
      expect(isActive(leaf, '/produk/12')).toBeTrue();
      expect(isActive(leaf, '/produk?status=aktif')).toBeTrue();
      expect(isActive(leaf, '/produktif')).toBeFalse();
    });

    it('marks a group active when one of its children is', () => {
      expect(isActive(stok, '/stok/penyesuaian')).toBeTrue();
      expect(isActive(stok, '/kasir')).toBeFalse();
    });
  });

  it('entryLink sends a group to its first child', () => {
    const stok = SIDEBAR_MENU.find((i) => i.label === 'Stok')!;
    expect(entryLink(stok)).toBe('/stok/masuk');
    expect(entryLink({ label: 'Kasir', link: '/kasir' })).toBe('/kasir');
  });
});
