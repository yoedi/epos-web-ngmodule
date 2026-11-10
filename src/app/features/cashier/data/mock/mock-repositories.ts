import { Injectable, inject } from '@angular/core';

import { Product } from '../../domain/models/product';
import { Sale, SaleRequest } from '../../domain/models/sale';
import { ProductCatalogRepository } from '../../domain/repositories/product-catalog.repository';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { toProduct } from '../mappers/product.mapper';
import { toCreateSaleDto, toSale } from '../mappers/sale.mapper';
import { MOCK_LATENCY_MS, MockPosBackend } from './mock-pos.backend';

/** Runs `work` after the simulated network delay; its throw becomes the rejection. */
function later<T>(work: () => T): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(work());
      } catch (err: unknown) {
        reject(err);
      }
    }, MOCK_LATENCY_MS),
  );
}

/** Stand-in for ProductCatalogHttpRepository. Registered in CashierModule providers. */
@Injectable()
export class MockProductCatalogRepository extends ProductCatalogRepository {
  private readonly backend = inject(MockPosBackend);

  override search(term: string, limit: number): Promise<Product[]> {
    return later(() =>
      this.backend
        .searchProducts({ search: term, status: 'ACTIVE', page: 0, size: limit })
        .map(toProduct),
    );
  }

  override async findByBarcode(barcode: string): Promise<Product | null> {
    try {
      return await later(() => toProduct(this.backend.findByBarcode(barcode)));
    } catch {
      return null;
    }
  }
}

/** Stand-in for SaleHttpRepository. Registered in CashierModule providers. */
@Injectable()
export class MockSaleRepository extends SaleRepository {
  private readonly backend = inject(MockPosBackend);

  override create(request: SaleRequest): Promise<Sale> {
    return later(() => toSale(this.backend.createSale(toCreateSaleDto(request))));
  }
}
