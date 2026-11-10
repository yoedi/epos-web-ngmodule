import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { INLINE_ERROR_CODES } from '../../../../core/http/error.interceptor';
import { Sale, SaleRequest } from '../../domain/models/sale';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { SaleResponseDto } from '../dto/sale.dto';
import { toCreateSaleDto, toSale } from '../mappers/sale.mapper';

/**
 * Every failure of POST /sales is shown inside the payment modal with a retry
 * button (PRD 9.2), so none of them should also pop up as a toast.
 */
const SALE_INLINE_CODES: ReadonlySet<string> = new Set([
  'EMPTY_CART',
  'PRODUCT_INACTIVE',
  'NOT_FOUND',
  'NETWORK_ERROR',
  'INTERNAL_ERROR',
]);

/** POST /sales (docs/api-spec.md section 4). */
@Injectable()
export class SaleHttpRepository extends SaleRepository {
  private readonly http = inject(HttpClient);

  override async create(request: SaleRequest): Promise<Sale> {
    const dto = await firstValueFrom(
      this.http.post<SaleResponseDto>(`${environment.apiUrl}/sales`, toCreateSaleDto(request), {
        context: new HttpContext().set(INLINE_ERROR_CODES, SALE_INLINE_CODES),
      }),
    );
    return toSale(dto);
  }
}
