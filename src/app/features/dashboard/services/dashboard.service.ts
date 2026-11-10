import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { INLINE_ERROR_CODES } from '../../../core/http/error.interceptor';
import {
  DailyReport,
  DailyReportDto,
  DailyReportParamsDto,
  toDailyReport,
} from '../models/daily-report.model';

/**
 * The dashboard shows load failures in place (error state, "Gagal memperbarui"),
 * and refreshes every minute: a toast per failed refresh would pile up.
 */
const INLINE_CODES = new Set(['NETWORK_ERROR', 'INTERNAL_ERROR']);

/**
 * GET /reports/daily (docs/api-spec.md section 6), OWNER only. DTOs stop here.
 * A mock subclass overrides the protected request method.
 */
@Injectable()
export class DashboardService {
  protected readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/reports/daily`;

  /** Today's report (Asia/Jakarta) unless a `YYYY-MM-DD` date is given. */
  daily(date?: string): Observable<DailyReport> {
    return this.requestDaily(date ? { date } : {}).pipe(map(toDailyReport));
  }

  protected requestDaily(
    params: DailyReportParamsDto,
  ): Observable<DailyReportDto> {
    return this.http.get<DailyReportDto>(this.url, {
      params: { ...params },
      context: new HttpContext().set(INLINE_ERROR_CODES, INLINE_CODES),
    });
  }
}
