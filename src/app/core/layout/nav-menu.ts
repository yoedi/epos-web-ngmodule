import { Role } from '../auth/auth.models';

/**
 * One menu entry. A leaf has `link`; a group has `children`.
 * `roles` omitted means every role may see it.
 */
export interface NavItem {
  label: string;
  icon?: string;
  link?: string;
  roles?: readonly Role[];
  children?: readonly NavItem[];
}

const OWNER_ONLY: readonly Role[] = ['OWNER'];
const CASHIER_ONLY: readonly Role[] = ['CASHIER'];

/** Sidebar menu (PRD section 8). Access rules from PRD section 6. */
export const SIDEBAR_MENU: readonly NavItem[] = [
  { label: 'Dashboard', icon: 'pi-th-large', link: '/dashboard', roles: OWNER_ONLY },
  { label: 'Kasir', icon: 'pi-shopping-cart', link: '/kasir' },
  { label: 'Transaksi', icon: 'pi-receipt', link: '/transaksi' },
  {
    label: 'Produk',
    icon: 'pi-box',
    children: [
      { label: 'Daftar Produk', link: '/produk' },
      { label: 'Kategori', link: '/kategori' },
    ],
  },
  {
    label: 'Stok',
    icon: 'pi-inbox',
    roles: OWNER_ONLY,
    children: [
      { label: 'Stok Masuk', link: '/stok/masuk' },
      { label: 'Penyesuaian Stok', link: '/stok/penyesuaian' },
    ],
  },
];

/**
 * Phone bottom navigation (PRD section 8, "Navigasi di HP").
 * The cashier set is not in the PRD; it mirrors the owner set with Kasir as home.
 */
export const BOTTOM_NAV: readonly NavItem[] = [
  { label: 'Dashboard', icon: 'pi-th-large', link: '/dashboard', roles: OWNER_ONLY },
  { label: 'Kasir', icon: 'pi-shopping-cart', link: '/kasir', roles: CASHIER_ONLY },
  { label: 'Transaksi', icon: 'pi-receipt', link: '/transaksi' },
  { label: 'Produk', icon: 'pi-box', link: '/produk' },
  { label: 'Stok', icon: 'pi-inbox', link: '/stok', roles: OWNER_ONLY },
];

/** Links inside the phone "Lainnya" sheet, next to the profile and Keluar. */
export const MORE_MENU: readonly NavItem[] = [
  { label: 'Kategori', icon: 'pi-tags', link: '/kategori' },
];

/**
 * Items the role may see. Hidden, not disabled (PRD section 6).
 * A group whose children are all hidden is dropped too.
 */
export function visibleFor(items: readonly NavItem[], role: Role): NavItem[] {
  return items
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) => (item.children ? { ...item, children: visibleFor(item.children, role) } : item))
    .filter((item) => !item.children || item.children.length > 0);
}

/** Where a click on the item goes: its own link, or the first child's for a group. */
export function entryLink(item: NavItem): string {
  return item.link ?? item.children?.[0]?.link ?? '/';
}

/** True when `url` is the item's link or one of its children's links (or below them). */
export function isActive(item: NavItem, url: string): boolean {
  if (item.link) {
    return url === item.link || url.startsWith(item.link + '/') || url.startsWith(item.link + '?');
  }
  return (item.children ?? []).some((child) => isActive(child, url));
}
