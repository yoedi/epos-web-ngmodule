import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { INLINE_ERROR_CODES } from '../../../core/http/error.interceptor';
import { PageResponseDto } from '../../../core/http/page.model';
import { StockAdjustmentRequestDto, toStockAdjustmentRequest } from '../models/stock-adjustment.model';
import {
  AdjustmentReason,
  ProductSearchParamsDto,
  StockInLine,
  StockInRequestDto,
  StockInResponseDto,
  StockMovement,
  StockMovementDto,
  StockMovementParamsDto,
  StockMovementType,
  StockProduct,
  StockProductDto,
  toStockInRequest,
  toStockMovement,
  toStockProduct,
} from '../models/stock-in.model';

/** Results shown in the product picker. */
export const PRODUCT_SEARCH_LIMIT = 8;

/**
 * Stock endpoints (docs/api-spec.md section 5) plus the product lookups the
 * stock screens need. DTOs stop here. A mock subclass overrides the protected
 * request methods.
 */
@Injectable()
export class StockService {
  protected readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  searchProducts(term: string): Observable<StockProduct[]> {
    return this.requestProducts({ search: term, page: 0, size: PRODUCT_SEARCH_LIMIT }).pipe(
      map((page) => page.content.map(toStockProduct)),
    );
  }

  /** Fails with NOT_FOUND (shown by the caller, not as a toast) when no product has this barcode. */
  findByBarcode(code: string): Observable<StockProduct> {
    return this.requestByBarcode(code).pipe(map(toStockProduct));
  }

  stockIn(note: string, lines: readonly StockInLine[]): Observable<StockMovement[]> {
    return this.requestStockIn(toStockInRequest(note, lines)).pipe(
      map((body) => body.movements.map(toStockMovement)),
    );
  }

  /** Latest stock-in movements, newest first. */
  recentStockIn(size: number): Observable<StockMovement[]> {
    return this.recentMovements('IN', size);
  }

  /** Saves a stock count. VALIDATION_ERROR is left to the caller to show per field. */
  adjust(
    productId: number,
    physicalStock: number,
    reason: AdjustmentReason,
    note: string,
  ): Observable<StockMovement> {
    return this.requestAdjustment(
      toStockAdjustmentRequest(productId, physicalStock, reason, note),
    ).pipe(map(toStockMovement));
  }

  /** Latest adjustments, newest first. */
  recentAdjustments(size: number): Observable<StockMovement[]> {
    return this.recentMovements('ADJUSTMENT', size);
  }

  protected requestProducts(
    params: ProductSearchParamsDto,
  ): Observable<PageResponseDto<StockProductDto>> {
    return this.http.get<PageResponseDto<StockProductDto>>(`${this.url}/products`, {
      params: { ...params },
    });
  }

  protected requestByBarcode(code: string): Observable<StockProductDto> {
    return this.http.get<StockProductDto>(
      `${this.url}/products/barcode/${encodeURIComponent(code)}`,
      { context: new HttpContext().set(INLINE_ERROR_CODES, new Set(['NOT_FOUND'])) },
    );
  }

  protected requestStockIn(body: StockInRequestDto): Observable<StockInResponseDto> {
    return this.http.post<StockInResponseDto>(`${this.url}/stock/in`, body);
  }

  protected requestAdjustment(body: StockAdjustmentRequestDto): Observable<StockMovementDto> {
    return this.http.post<StockMovementDto>(`${this.url}/stock/adjustment`, body);
  }

  protected requestMovements(
    params: StockMovementParamsDto,
  ): Observable<PageResponseDto<StockMovementDto>> {
    return this.http.get<PageResponseDto<StockMovementDto>>(`${this.url}/stock/movements`, {
      params: { ...params },
    });
  }

  private recentMovements(type: StockMovementType, size: number): Observable<StockMovement[]> {
    return this.requestMovements({ type, page: 0, size }).pipe(
      map((page) => page.content.map(toStockMovement)),
    );
  }
}
