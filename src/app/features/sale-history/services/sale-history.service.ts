import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  SaleDetail,
  SaleDetailDto,
  SaleListParamsDto,
  SaleListResponseDto,
  SaleListResult,
  SaleQuery,
  toListParams,
  toSaleDetail,
  toSaleListResult,
} from '../models/sale-history.model';

/**
 * Read side of the sales endpoints (docs/api-spec.md section 4): GET /sales and
 * GET /sales/{id}. DTOs stop here. A mock subclass overrides the protected
 * request methods.
 */
@Injectable()
export class SaleHistoryService {
  protected readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/sales`;

  list(query: SaleQuery): Observable<SaleListResult> {
    return this.requestList(toListParams(query)).pipe(map(toSaleListResult));
  }

  get(id: number): Observable<SaleDetail> {
    return this.requestDetail(id).pipe(map(toSaleDetail));
  }

  protected requestList(params: SaleListParamsDto): Observable<SaleListResponseDto> {
    return this.http.get<SaleListResponseDto>(this.url, { params: { ...params } });
  }

  protected requestDetail(id: number): Observable<SaleDetailDto> {
    return this.http.get<SaleDetailDto>(`${this.url}/${id}`);
  }
}
