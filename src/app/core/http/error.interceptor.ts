import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable, catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AppError, toAppError } from './api-error.model';

/** Codes the caller shows inline (form field, cart, payment modal), never as a toast. */
const INLINE_CODES = new Set([
  'VALIDATION_ERROR',
  'INSUFFICIENT_STOCK',
  'INSUFFICIENT_PAYMENT',
  'INVALID_CREDENTIALS',
  'DUPLICATE_CATEGORY', // category form field
  'CATEGORY_IN_USE', // "Kategori tidak bisa dihapus" dialog
]);

/**
 * Extra codes one request shows inline itself, so no toast is added for them.
 * Example: `{ context: new HttpContext().set(INLINE_ERROR_CODES, new Set(['NOT_FOUND'])) }`.
 * UNAUTHORIZED is always handled here, whatever the request lists.
 */
export const INLINE_ERROR_CODES = new HttpContextToken<ReadonlySet<string>>(() => new Set());

const FORBIDDEN_MESSAGE = 'Anda tidak berwenang melakukan tindakan ini.';

/** Turns ProblemDetail responses into AppError (CLAUDE.md section 7). */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private readonly injector: Injector,
    private readonly messages: MessageService,
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
          return throwError(() => err);
        }
        const appError = toAppError(err);
        this.handle(appError, req.context.get(INLINE_ERROR_CODES));
        return throwError(() => appError);
      }),
    );
  }

  private handle(error: AppError, inlineForRequest: ReadonlySet<string>): void {
    if (error.code === 'UNAUTHORIZED') {
      // Resolved lazily: AuthService -> HttpClient -> interceptors would be circular.
      this.injector.get(AuthService).logout();
      return;
    }
    if (INLINE_CODES.has(error.code) || inlineForRequest.has(error.code)) {
      return;
    }
    this.messages.add({
      severity: 'error',
      summary: error.code === 'FORBIDDEN' ? 'Tidak berwenang' : 'Gagal',
      detail: error.code === 'FORBIDDEN' ? FORBIDDEN_MESSAGE : error.message,
    });
  }
}
