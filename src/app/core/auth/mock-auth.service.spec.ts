import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AppError } from '../http/api-error.model';
import { User } from './auth.models';
import { AuthService } from './auth.service';
import { MockAuthService } from './mock-auth.service';
import { TokenStorage } from './token.storage';

describe('MockAuthService', () => {
  let auth: AuthService;
  let storage: TokenStorage;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useClass: MockAuthService },
      ],
    });
    auth = TestBed.inject(AuthService);
    storage = TestBed.inject(TokenStorage);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    storage.clear();
  });

  afterEach(() => storage.clear());

  it('logs rina in as CASHIER and stores the token', fakeAsync(() => {
    let user: User | undefined;
    auth.login('rina', 'rahasia123').subscribe((u) => (user = u));
    tick(600);

    expect(user).toEqual({ id: 2, name: 'Rina Lestari', username: 'rina', role: 'CASHIER' });
    expect(auth.currentUser).toEqual(user!);
    expect(storage.get()).toBe('mock-token.rina');
    expect(auth.isLoggedIn()).toBeTrue();
    expect(auth.homeUrlFor(user!.role)).toBe('/kasir');
  }));

  it('logs budi in as OWNER', fakeAsync(() => {
    let user: User | undefined;
    auth.login('budi', 'rahasia123').subscribe((u) => (user = u));
    tick(600);

    expect(user?.role).toBe('OWNER');
    expect(auth.homeUrlFor(user!.role)).toBe('/dashboard');
  }));

  it('rejects a wrong password with INVALID_CREDENTIALS', fakeAsync(() => {
    let error: AppError | undefined;
    auth.login('rina', 'salah').subscribe({ error: (e: AppError) => (error = e) });
    tick(600);

    expect(error?.code).toBe('INVALID_CREDENTIALS');
    expect(error?.status).toBe(401);
    expect(storage.get()).toBeNull();
    expect(auth.currentUser).toBeNull();
  }));

  it('restores the user from a stored token', () => {
    storage.set('mock-token.budi');
    let user: User | null = null;
    auth.ensureUser().subscribe((u) => (user = u));

    expect(user!.name).toBe('Budi Santoso');
    expect(auth.currentUser?.role).toBe('OWNER');
  });

  it('drops an unknown token', () => {
    storage.set('not-a-mock-token');
    let user: User | null | undefined;
    auth.ensureUser().subscribe((u) => (user = u));

    expect(user).toBeNull();
    expect(storage.get()).toBeNull();
  });

  it('logout clears the session and goes to /login', fakeAsync(() => {
    auth.login('rina', 'rahasia123').subscribe();
    tick(600);
    auth.logout();

    expect(storage.get()).toBeNull();
    expect(auth.currentUser).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  }));
});
