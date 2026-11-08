import { HttpErrorResponse } from '@angular/common/http';

/** Error shape used across the app (CLAUDE.md section 7). */
export interface AppError {
  code: string; // INSUFFICIENT_STOCK, INSUFFICIENT_PAYMENT, etc.
  message: string; // Indonesian message from the server, ready to display
  status: number;
  fieldErrors?: { field: string; message: string }[];
}

/** Spring Boot ProblemDetail body (docs/api-spec.md "Format error"). */
export interface ProblemDetailDto {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
  timestamp?: string;
  errors?: { field: string; message: string }[];
}

export const NETWORK_ERROR_MESSAGE =
  'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.';
export const UNKNOWN_ERROR_MESSAGE = 'Terjadi kesalahan. Silakan coba lagi.';

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AppError).code === 'string' &&
    typeof (value as AppError).message === 'string' &&
    typeof (value as AppError).status === 'number'
  );
}

function isProblemDetail(value: unknown): value is ProblemDetailDto {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ProblemDetailDto).title === 'string'
  );
}

export function toAppError(error: HttpErrorResponse): AppError {
  if (error.status === 0) {
    // Frontend-only code: the request never reached the server.
    return { code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE, status: 0 };
  }

  const body: unknown = error.error;
  if (!isProblemDetail(body)) {
    return { code: 'INTERNAL_ERROR', message: UNKNOWN_ERROR_MESSAGE, status: error.status };
  }

  const appError: AppError = {
    code: body.code ?? 'INTERNAL_ERROR',
    message: body.detail ?? body.title,
    status: body.status ?? error.status,
  };
  if (body.errors?.length) {
    appError.fieldErrors = body.errors.map((e) => ({ field: e.field, message: e.message }));
  }
  return appError;
}
