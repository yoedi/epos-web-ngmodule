import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Cashier, UserListItemDto, toCashier } from '../models/cashier.model';

/**
 * GET /users (docs/api-spec.md section 8), OWNER only. Feeds the "Kasir"
 * filter of the history screen. A mock subclass overrides `requestList()`.
 */
@Injectable()
export class UserService {
  protected readonly http = inject(HttpClient);

  listCashiers(): Observable<Cashier[]> {
    return this.requestList('CASHIER').pipe(map((users) => users.map(toCashier)));
  }

  protected requestList(role: 'CASHIER'): Observable<UserListItemDto[]> {
    return this.http.get<UserListItemDto[]>(`${environment.apiUrl}/users`, { params: { role } });
  }
}
