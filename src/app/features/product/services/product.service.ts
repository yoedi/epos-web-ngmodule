import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Page, PageResponseDto, toPage } from '../../../core/http/page.model';
import {
  CreateProductDto,
  Product,
  ProductDto,
  ProductFormValue,
  ProductListParamsDto,
  ProductQuery,
  UpdateProductDto,
  toCreateDto,
  toListParams,
  toProduct,
  toUpdateDto,
} from '../models/product.model';

/**
 * Product endpoints (docs/api-spec.md section 3). DTOs stop here; callers only
 * see `Product`. A mock subclass overrides the protected request methods.
 */
@Injectable()
export class ProductService {
  protected readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/products`;

  list(query: ProductQuery): Observable<Page<Product>> {
    return this.requestList(toListParams(query)).pipe(map((dto) => toPage(dto, toProduct)));
  }

  create(value: ProductFormValue): Observable<Product> {
    return this.requestCreate(toCreateDto(value)).pipe(
      map(toProduct),
      switchMap((product) => this.syncActive(product, value.isActive)),
    );
  }

  update(id: number, value: ProductFormValue): Observable<Product> {
    return this.requestUpdate(id, toUpdateDto(value)).pipe(
      map(toProduct),
      switchMap((product) => this.syncActive(product, value.isActive)),
    );
  }

  setActive(id: number, isActive: boolean): Observable<Product> {
    return this.requestSetActive(id, isActive).pipe(map(toProduct));
  }

  /**
   * POST and PATCH /products do not accept is_active, so the toggle takes a
   * second call. The product is already saved by then: a failure here is
   * reported by ErrorInterceptor and must not look like a failed save, since
   * submitting again would hit DUPLICATE_SKU.
   */
  private syncActive(product: Product, isActive: boolean): Observable<Product> {
    if (product.isActive === isActive) {
      return of(product);
    }
    return this.setActive(product.id, isActive).pipe(catchError(() => of(product)));
  }

  protected requestList(params: ProductListParamsDto): Observable<PageResponseDto<ProductDto>> {
    return this.http.get<PageResponseDto<ProductDto>>(this.url, { params: { ...params } });
  }

  protected requestCreate(body: CreateProductDto): Observable<ProductDto> {
    return this.http.post<ProductDto>(this.url, body);
  }

  protected requestUpdate(id: number, body: UpdateProductDto): Observable<ProductDto> {
    return this.http.patch<ProductDto>(`${this.url}/${id}`, body);
  }

  protected requestSetActive(id: number, isActive: boolean): Observable<ProductDto> {
    return this.http.patch<ProductDto>(`${this.url}/${id}/status`, { is_active: isActive });
  }
}
