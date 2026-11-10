import { Injectable, inject } from '@angular/core';

import { Product } from '../domain/models/product';
import { ProductCatalogRepository } from '../domain/repositories/product-catalog.repository';

/** Enough rows for the dropdown without scrolling on a 768px-high screen. */
export const SEARCH_LIMIT = 8;

/** Product lookup for the search dropdown of the cashier screen. */
@Injectable()
export class SearchProductsUseCase {
  private readonly catalog = inject(ProductCatalogRepository);

  execute(term: string): Promise<Product[]> {
    const trimmed = term.trim();
    return trimmed ? this.catalog.search(trimmed, SEARCH_LIMIT) : Promise.resolve([]);
  }
}
