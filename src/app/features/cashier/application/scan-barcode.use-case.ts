import { Injectable, inject } from '@angular/core';

import { ProductNotFoundError } from '../domain/errors/cart.errors';
import { Product } from '../domain/models/product';
import { ProductCatalogRepository } from '../domain/repositories/product-catalog.repository';

/** Scanner input is digits only; EAN-8 up to GTIN-14. */
const BARCODE_PATTERN = /^\d{8,14}$/;

export function looksLikeBarcode(text: string): boolean {
  return BARCODE_PATTERN.test(text);
}

/** Resolves a scanned barcode to a product (GET /products/barcode/{code}). */
@Injectable()
export class ScanBarcodeUseCase {
  private readonly catalog = inject(ProductCatalogRepository);

  /** Rejects with ProductNotFoundError when no product has this barcode. */
  async execute(barcode: string): Promise<Product> {
    const product = await this.catalog.findByBarcode(barcode);
    if (!product) {
      throw new ProductNotFoundError(barcode);
    }
    return product;
  }
}
