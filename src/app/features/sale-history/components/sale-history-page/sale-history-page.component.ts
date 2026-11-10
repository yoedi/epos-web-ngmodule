import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../../core/http/api-error.model';
import { Cashier } from '../../models/cashier.model';
import { fromIsoDate, jakartaToday, toIsoDate } from '../../models/date-range';
import {
  SaleDetail,
  SaleListResult,
  SaleQuery,
  SaleSummary,
} from '../../models/sale-history.model';
import { SaleHistoryService } from '../../services/sale-history.service';
import { UserService } from '../../services/user.service';

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; result: SaleListResult }
  | { status: 'error'; message: string };

type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; sale: SaleDetail }
  | { status: 'error'; message: string };

interface SaleHistoryVm {
  state: ListState;
  query: SaleQuery;
  /** Owner: date range and cashier filters are shown (PRD 9.9, section 6). */
  isOwner: boolean;
  cashierOptions: { name: string; id: number | null }[];
  start: Date;
  end: Date;
  isToday: boolean;
  sameDay: boolean;
  /** Filters folded into the phone sheet that differ from the default. */
  sheetFilterCount: number;
  hasFilter: boolean;
}

type DateRange = (Date | null)[] | null;

const PAGE_SIZE = 20;

function errorMessage(err: unknown): string {
  return isAppError(err) ? err.message : UNKNOWN_ERROR_MESSAGE;
}

/** Riwayat Transaksi (PRD 9.9). Owner sees every sale; a cashier only their own of today. */
@Component({
  selector: 'app-sale-history-page',
  templateUrl: './sale-history-page.component.html',
  styleUrl: './sale-history-page.component.css',
  standalone: false,
})
export class SaleHistoryPageComponent {
  private readonly saleService = inject(SaleHistoryService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);

  private readonly today = jakartaToday();
  /** No sales in the future. */
  readonly maxDate = fromIsoDate(this.today);

  private readonly defaultQuery: SaleQuery = {
    startDate: this.today,
    endDate: this.today,
    cashierId: null,
    invoiceNo: '',
    page: 0,
    size: PAGE_SIZE,
    direction: 'desc',
  };

  private readonly fb = inject(FormBuilder);

  readonly filters = this.fb.group({
    // fb.control: a bare array here would be read as [value, validators].
    range: this.fb.control<DateRange>(this.defaultRange()),
    cashierId: [null as number | null],
    invoiceNo: [''],
  });

  private readonly querySubject = new BehaviorSubject<SaleQuery>(this.defaultQuery);

  private readonly state$: Observable<ListState> = this.querySubject.pipe(
    switchMap((query) =>
      this.saleService.list(query).pipe(
        map((result): ListState => ({ status: 'ready', result })),
        catchError((err: unknown) =>
          of<ListState>({ status: 'error', message: errorMessage(err) }),
        ),
        startWith<ListState>({ status: 'loading' }),
      ),
    ),
  );

  private readonly isOwner$ = this.auth.currentUser$.pipe(
    map((user) => user?.role === 'OWNER'),
    distinctUntilChanged(),
  );

  /** GET /users is OWNER only. Filter still works without it; ErrorInterceptor reports failures. */
  private readonly cashiers$ = this.isOwner$.pipe(
    switchMap((isOwner) =>
      isOwner
        ? this.userService.listCashiers().pipe(
            catchError(() => of<Cashier[]>([])),
            startWith<Cashier[]>([]),
          )
        : of<Cashier[]>([]),
    ),
  );

  readonly vm$: Observable<SaleHistoryVm> = combineLatest([
    this.state$,
    this.querySubject,
    this.isOwner$,
    this.cashiers$,
  ]).pipe(
    map(([state, query, isOwner, cashiers]) => {
      const rangeChanged = query.startDate !== this.today || query.endDate !== this.today;
      const sheetFilterCount = Number(rangeChanged) + Number(query.cashierId !== null);
      return {
        state,
        query,
        isOwner,
        cashierOptions: [{ name: 'Semua Kasir', id: null }, ...cashiers],
        start: fromIsoDate(query.startDate),
        end: fromIsoDate(query.endDate),
        isToday: !rangeChanged,
        sameDay: query.startDate === query.endDate,
        sheetFilterCount,
        hasFilter: sheetFilterCount > 0 || !!query.invoiceNo,
      };
    }),
  );

  filterSheetOpen = false;

  // ── Detail drawer ──
  private readonly detailIdSubject = new BehaviorSubject<number | null>(null);
  readonly detail$: Observable<DetailState | null> = this.detailIdSubject.pipe(
    switchMap((id) =>
      id === null
        ? of(null)
        : this.saleService.get(id).pipe(
            map((sale): DetailState => ({ status: 'ready', sale })),
            catchError((err: unknown) =>
              of<DetailState>({ status: 'error', message: errorMessage(err) }),
            ),
            startWith<DetailState>({ status: 'loading' }),
          ),
    ),
  );
  detailOpen = false;
  private focusBeforeDrawer: HTMLElement | null = null;

  constructor() {
    const { range, cashierId, invoiceNo } = this.filters.controls;

    invoiceNo.valueChanges
      .pipe(
        debounceTime(300),
        map((value) => (value ?? '').trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        if (value !== this.querySubject.value.invoiceNo) {
          this.patchQuery({ invoiceNo: value, page: 0 });
        }
      });

    cashierId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.patchQuery({ cashierId: id, page: 0 }));

    // The picker emits after each click; only a complete range is applied.
    range.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const [start, end] = value ?? [];
      if (!start || !end) {
        return;
      }
      const startDate = toIsoDate(start);
      const endDate = toIsoDate(end);
      const current = this.querySubject.value;
      if (startDate !== current.startDate || endDate !== current.endDate) {
        this.patchQuery({ startDate, endDate, page: 0 });
      }
    });
  }

  /** Closing the picker after one click means a single day; nothing picked keeps the old range. */
  completeRange(): void {
    const control = this.filters.controls.range;
    const [start, end] = control.value ?? [];
    if (start && !end) {
      control.setValue([start, start]);
    } else if (!start) {
      const { startDate, endDate } = this.querySubject.value;
      control.setValue([fromIsoDate(startDate), fromIsoDate(endDate)], { emitEvent: false });
    }
  }

  resetFilters(): void {
    this.filters.setValue(
      { range: this.defaultRange(), cashierId: null, invoiceNo: '' },
      { emitEvent: false },
    );
    // Also resets the debounced search stream; its later emission finds nothing to change.
    this.filters.controls.invoiceNo.setValue('');
    this.querySubject.next({ ...this.defaultQuery, direction: this.querySubject.value.direction });
  }

  retry(): void {
    this.patchQuery({});
  }

  toggleSort(): void {
    const direction = this.querySubject.value.direction === 'desc' ? 'asc' : 'desc';
    this.patchQuery({ direction, page: 0 });
  }

  changePage(page: number): void {
    this.patchQuery({ page });
  }

  openDetail(sale: SaleSummary): void {
    this.focusBeforeDrawer = document.activeElement as HTMLElement | null;
    this.detailIdSubject.next(sale.id);
    this.detailOpen = true;
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.detailIdSubject.next(null);
    this.focusBeforeDrawer?.focus();
    this.focusBeforeDrawer = null;
  }

  retryDetail(): void {
    this.detailIdSubject.next(this.detailIdSubject.value);
  }

  /** "Cetak Ulang": SaleReceiptPrintComponent is already on the page once the detail loads. */
  reprint(): void {
    window.print();
  }

  private defaultRange(): Date[] {
    return [fromIsoDate(this.today), fromIsoDate(this.today)];
  }

  private patchQuery(patch: Partial<SaleQuery>): void {
    this.querySubject.next({ ...this.querySubject.value, ...patch });
  }
}
