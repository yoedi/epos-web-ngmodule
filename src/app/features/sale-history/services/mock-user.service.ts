import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { UserListItemDto } from '../models/cashier.model';
import { UserService } from './user.service';

const MOCK_LATENCY_MS = 300;

/**
 * Cashiers of the sample store: Rina from PRD section 12 (same id as in
 * MockAuthService), Dewi from mockup 5a. Sorted by name, like the server.
 */
export const MOCK_CASHIERS: readonly UserListItemDto[] = [
  { id: 3, name: 'Dewi Anggraini', username: 'dewi', role: 'CASHIER', is_active: true },
  { id: 2, name: 'Rina Lestari', username: 'rina', role: 'CASHIER', is_active: true },
];

/** Stand-in for UserService while the backend is not ready. */
@Injectable()
export class MockUserService extends UserService {
  protected override requestList(): Observable<UserListItemDto[]> {
    return of(MOCK_CASHIERS.map((user) => ({ ...user }))).pipe(delay(MOCK_LATENCY_MS));
  }
}
