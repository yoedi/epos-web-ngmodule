import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { isAppError } from '../../../../core/http/api-error.model';
import { INLINE_ERROR_CODES } from '../../../../core/http/error.interceptor';
import { PageResponseDto } from '../../../../core/http/page.model';
import { Product } from '../../domain/models/product';
import { ProductCatalogRepository } from '../../domain/repositories/product-catalog.repository';
import { CashierProductDto, ProductSearchParamsDto } from '../dto/product.dto';
import { toProduct } from '../mappers/product.mapper';

/**
 * The cashier screen shows these failures itself (search dropdown, cart
 * notice, "tidak ditemukan" toast), so ErrorInterceptor must not toast them too.
 */
const SEARCH_INLINE_CODES: ReadonlySet<string> = new Set(['NETWORK_ERROR', 'INTERNAL_ERROR']);
const BARCODE_INLINE_CODES: ReadonlySet<string> = new Set([...SEARCH_INLINE_CODES, 'NOT_FOUND']);

/** GET /products and GET /products/barcode/{code} (docs/api-spec.md section 3). */
@Injectable()
export class ProductCatalogHttpRepository extends ProductCatalogRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/products`;

  override async search(term: string, limit: number): Promise<Product[]> {
    const params: ProductSearchParamsDto = { search: term, status: 'ACTIVE', page: 0, size: limit };
    const page = await firstValueFrom(
      this.http.get<PageResponseDto<CashierProductDto>>(this.url, {
        params: { ...params },
        context: new HttpContext().set(INLINE_ERROR_CODES, SEARCH_INLINE_CODES),
      }),
    );
    return page.content.map(toProduct);
  }

  override async findByBarcode(barcode: string): Promise<Product | null> {
    try {
      const dto = await firstValueFrom(
        this.http.get<CashierProductDto>(`${this.url}/barcode/${encodeURIComponent(barcode)}`, {
          context: new HttpContext().set(INLINE_ERROR_CODES, BARCODE_INLINE_CODES),
        }),
      );
      return toProduct(dto);
    } catch (err: unknown) {
      if (isAppError(err) && err.code === 'NOT_FOUND') {
        return null;
      }
      throw err;
    }
  }
}
