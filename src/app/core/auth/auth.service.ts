import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequestDto, LoginResponseDto, Role, User, UserDto, toUser } from './auth.models';
import { TokenStorage } from './token.storage';

const HOME_URL: Record<Role, string> = {
  CASHIER: '/kasir',
  OWNER: '/dashboard',
};

/**
 * Holds the signed-in user. Talks to POST /auth/login and GET /auth/me
 * (docs/api-spec.md section 1). Dependencies use inject() so a mock
 * subclass only needs to override the protected request methods.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  protected readonly http = inject(HttpClient);
  protected readonly tokenStorage = inject(TokenStorage);
  private readonly router = inject(Router);

  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.userSubject.asObservable();

  /** Snapshot for guards and services. Templates use currentUser$. */
  get currentUser(): User | null {
    return this.userSubject.value;
  }

  login(username: string, password: string): Observable<User> {
    return this.requestLogin({ username, password }).pipe(
      tap((res) => this.tokenStorage.set(res.access_token)),
      map((res) => toUser(res.user)),
      tap((user) => this.userSubject.next(user)),
    );
  }

  logout(): void {
    this.tokenStorage.clear();
    this.userSubject.next(null);
    this.router.navigateByUrl('/login');
  }

  isLoggedIn(): boolean {
    return this.tokenStorage.get() !== null;
  }

  /** Returns the current user, restoring it from the token after a page reload. */
  ensureUser(): Observable<User | null> {
    if (this.userSubject.value) {
      return of(this.userSubject.value);
    }
    if (!this.isLoggedIn()) {
      return of(null);
    }
    return this.requestMe().pipe(
      map(toUser),
      tap((user) => this.userSubject.next(user)),
      catchError(() => {
        this.tokenStorage.clear();
        return of(null);
      }),
    );
  }

  homeUrlFor(role: Role): string {
    return HOME_URL[role];
  }

  protected requestLogin(body: LoginRequestDto): Observable<LoginResponseDto> {
    return this.http.post<LoginResponseDto>(`${environment.apiUrl}/auth/login`, body);
  }

  protected requestMe(): Observable<UserDto> {
    return this.http.get<UserDto>(`${environment.apiUrl}/auth/me`);
  }
}
