import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError, timer, switchMap } from 'rxjs';

import { AppError } from '../http/api-error.model';
import { LoginRequestDto, LoginResponseDto, UserDto } from './auth.models';
import { AuthService } from './auth.service';

const MOCK_PASSWORD = 'rahasia123';
const MOCK_LATENCY_MS = 600;
const MOCK_TOKEN_PREFIX = 'mock-token.';

/** Sample users from PRD section 12 and docs/api-spec.md section 1. */
const MOCK_USERS: UserDto[] = [
  { id: 1, name: 'Budi Santoso', username: 'budi', role: 'OWNER' },
  { id: 2, name: 'Rina Lestari', username: 'rina', role: 'CASHIER' },
];

/**
 * Stand-in for AuthService while the backend is not ready.
 * Only the HTTP calls are replaced; session state stays in AuthService.
 * Registered in CoreModule providers.
 */
@Injectable()
export class MockAuthService extends AuthService {
  protected override requestLogin(body: LoginRequestDto): Observable<LoginResponseDto> {
    const user = MOCK_USERS.find((u) => u.username === body.username);
    if (!user || body.password !== MOCK_PASSWORD) {
      const error: AppError = {
        code: 'INVALID_CREDENTIALS',
        message: 'Username atau password salah',
        status: 401,
      };
      return timer(MOCK_LATENCY_MS).pipe(switchMap(() => throwError(() => error)));
    }
    return of({
      access_token: MOCK_TOKEN_PREFIX + user.username,
      token_type: 'Bearer',
      expires_in: 28800,
      user,
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  protected override requestMe(): Observable<UserDto> {
    const token = this.tokenStorage.get() ?? '';
    const user = token.startsWith(MOCK_TOKEN_PREFIX)
      ? MOCK_USERS.find((u) => u.username === token.slice(MOCK_TOKEN_PREFIX.length))
      : undefined;
    if (!user) {
      const error: AppError = {
        code: 'UNAUTHORIZED',
        message: 'Sesi berakhir. Silakan masuk kembali.',
        status: 401,
      };
      return throwError(() => error);
    }
    return of(user);
  }
}
