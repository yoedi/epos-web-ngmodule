import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { AuthService } from '../auth/auth.service';
import { AppError, NETWORK_ERROR_MESSAGE } from './api-error.model';
import { ErrorInterceptor } from './error.interceptor';

describe('ErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let messages: MessageService;
  let auth: jasmine.SpyObj<AuthService>;

  function get(): AppError {
    let error: AppError | undefined;
    http.get('/api/test').subscribe({ error: (e: AppError) => (error = e) });
    return new Proxy({} as AppError, { get: (_, key: keyof AppError) => error?.[key] });
  }

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        { provide: AuthService, useValue: auth },
        MessageService,
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    messages = TestBed.inject(MessageService);
    spyOn(messages, 'add');
  });

  afterEach(() => httpMock.verify());

  it('maps a ProblemDetail to AppError without a toast for inline codes', () => {
    const error = get();
    httpMock.expectOne('/api/test').flush(
      {
        title: 'Stok tidak mencukupi',
        status: 422,
        detail: 'Stok Minyak Goreng 2 L tersisa 3',
        code: 'INSUFFICIENT_STOCK',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(error.code).toBe('INSUFFICIENT_STOCK');
    expect(error.message).toBe('Stok Minyak Goreng 2 L tersisa 3');
    expect(error.status).toBe(422);
    expect(messages.add).not.toHaveBeenCalled();
  });

  it('maps validation errors to fieldErrors', () => {
    const error = get();
    httpMock.expectOne('/api/test').flush(
      {
        title: 'Validasi gagal',
        status: 400,
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'sku', message: 'SKU wajib diisi' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(error.message).toBe('Validasi gagal');
    expect(error.fieldErrors).toEqual([{ field: 'sku', message: 'SKU wajib diisi' }]);
    expect(messages.add).not.toHaveBeenCalled();
  });

  it('reports a network failure as NETWORK_ERROR with a toast', () => {
    const error = get();
    httpMock.expectOne('/api/test').error(new ProgressEvent('error'));

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
    expect(messages.add).toHaveBeenCalled();
  });

  it('logs out on UNAUTHORIZED', () => {
    get();
    httpMock.expectOne('/api/test').flush(
      { title: 'Tidak terautentikasi', status: 401, code: 'UNAUTHORIZED' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(auth.logout).toHaveBeenCalled();
    expect(messages.add).not.toHaveBeenCalled();
  });

  it('shows a "tidak berwenang" toast on FORBIDDEN', () => {
    get();
    httpMock.expectOne('/api/test').flush(
      { title: 'Akses ditolak', status: 403, code: 'FORBIDDEN' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(messages.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ summary: 'Tidak berwenang' }),
    );
  });
});
