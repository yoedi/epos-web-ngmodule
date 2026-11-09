/** Leading word dropped from store names, so "Toko Berkah Jaya" becomes "BJ". */
const STORE_PREFIX = /^toko\s+/i;

/** Up to two uppercase initials: "Rina Lestari" → "RL", "Toko Berkah Jaya" → "BJ". */
export function initials(name: string): string {
  return name
    .replace(STORE_PREFIX, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}
