import { Component, inject } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  exhaustMap,
  map,
  of,
  scan,
  startWith,
  switchMap,
  timer,
} from 'rxjs';

import {
  UNKNOWN_ERROR_MESSAGE,
  isAppError,
} from '../../../../core/http/api-error.model';
import { jakartaToday } from '../../../sale-history/models/date-range';
import { DailyReport } from '../../models/daily-report.model';
import { DashboardService } from '../../services/dashboard.service';

/** "Diperbarui otomatis": the report is fetched again every minute. */
export const REFRESH_INTERVAL_MS = 60_000;

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      report: DailyReport;
      updatedAt: Date;
      /** A background refresh failed; the last report stays on screen. */
      refreshError: string | null;
    };

interface DashboardVm {
  state: DashboardState;
  /** The report on screen, null while loading the first time or after a failed first load. */
  report: DailyReport | null;
  loading: boolean;
  /** No sale yet today: zero cards and a friendly message instead of an empty chart. */
  empty: boolean;
  /** Highlighted bar: the hour in progress, only on today's report. */
  currentHour: number | null;
}

type LoadEvent =
  { kind: 'ok'; report: DailyReport } | { kind: 'fail'; message: string };

function errorMessage(err: unknown): string {
  return isAppError(err) ? err.message : UNKNOWN_ERROR_MESSAGE;
}

function reduce(
  state: DashboardState,
  event: LoadEvent | { kind: 'start' },
): DashboardState {
  switch (event.kind) {
    case 'start':
      // Only the first load shows skeletons; a refresh keeps the current figures.
      return state.status === 'ready' ? state : { status: 'loading' };
    case 'ok':
      return {
        status: 'ready',
        report: event.report,
        updatedAt: new Date(),
        refreshError: null,
      };
    case 'fail':
      return state.status === 'ready'
        ? { ...state, refreshError: event.message }
        : { status: 'error', message: event.message };
  }
}

/** Current hour in Asia/Jakarta, the zone of the report. */
function jakartaHour(now = new Date()): number {
  return new Date(now.getTime() + JAKARTA_OFFSET_MS).getUTCHours();
}

/** Dashboard Pemilik (PRD 9.4, mockup 3a and 9a). Route is OWNER only. */
@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
  standalone: false,
})
export class DashboardPageComponent {
  private readonly dashboardService = inject(DashboardService);

  private readonly retry$ = new Subject<void>();

  private readonly state$: Observable<DashboardState> = this.retry$.pipe(
    startWith(undefined),
    // "Coba lagi" loads right away and restarts the one-minute cycle.
    switchMap(() => timer(0, REFRESH_INTERVAL_MS)),
    // A slow response is not overtaken by the next tick.
    exhaustMap(() =>
      this.dashboardService.daily().pipe(
        map((report): LoadEvent => ({ kind: 'ok', report })),
        catchError((err: unknown) =>
          of<LoadEvent>({ kind: 'fail', message: errorMessage(err) }),
        ),
        startWith({ kind: 'start' as const }),
      ),
    ),
    scan(reduce, { status: 'loading' } as DashboardState),
  );

  readonly vm$: Observable<DashboardVm> = this.state$.pipe(
    map((state) => {
      const report = state.status === 'ready' ? state.report : null;
      return {
        state,
        report,
        loading: state.status === 'loading',
        empty: report?.transactionCount === 0,
        currentHour: report?.date === jakartaToday() ? jakartaHour() : null,
      };
    }),
  );

  retry(): void {
    this.retry$.next();
  }
}
