import { Product } from '../models/product';

/** Finds sellable products for the cashier. Bound to an implementation in CashierModule. */
export abstract class ProductCatalogRepository {
  /** Active products matching name, SKU or barcode. */
  abstract search(term: string, limit: number): Promise<Product[]>;

  /** Resolves to null when no product has this barcode. */
  abstract findByBarcode(barcode: string): Promise<Product | null>;
}
