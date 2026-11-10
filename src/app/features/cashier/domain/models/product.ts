/** Product as the cashier sees it: what can be sold, at which price, how many are left. */
export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  categoryName: string;
  unit: string;
  sellPrice: number;
  stock: number;
  minStock: number;
  isActive: boolean;
}

export function isSoldOut(product: Product): boolean {
  return product.stock <= 0;
}
