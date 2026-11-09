import { Component, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  combineLatest,
  fromEvent,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { StoreSettings } from '../../store/store-settings.models';
import { StoreSettingsService } from '../../store/store-settings.service';
import { BOTTOM_NAV, MORE_MENU, NavItem, SIDEBAR_MENU, visibleFor } from '../nav-menu';

/** Load state of the store identity shown in the header and sidebar. */
export type StoreState =
  | { status: 'loading' }
  | { status: 'ready'; data: StoreSettings }
  | { status: 'error' };

/** Tablet range (PRD section 7): the sidebar is forced into icon mode. */
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1279.98px)';
const COLLAPSED_KEY = 'epos.sidebar_collapsed';

/**
 * Layout for every signed-in page: sidebar (laptop/tablet), header,
 * routed content, and bottom navigation (phone).
 */
@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
  standalone: false,
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly storeSettings = inject(StoreSettingsService);

  readonly user$ = this.auth.currentUser$;

  readonly sidebarMenu$ = this.menuFor(SIDEBAR_MENU);
  readonly bottomNav$ = this.menuFor(BOTTOM_NAV);
  readonly moreMenu$ = this.menuFor(MORE_MENU);

  private readonly reloadStore$ = new Subject<void>();
  readonly store$: Observable<StoreState> = this.reloadStore$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.storeSettings.load().pipe(
        map((data): StoreState => ({ status: 'ready', data })),
        catchError(() => of<StoreState>({ status: 'error' })),
        startWith<StoreState>({ status: 'loading' }),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Tablet always shows icons only, so the toggle is hidden there. */
  readonly isTablet$ = mediaQuery$(TABLET_QUERY);

  private readonly collapsedByUser$ = new BehaviorSubject<boolean>(readCollapsedPref());
  readonly sidebarCollapsed$ = combineLatest([this.collapsedByUser$, this.isTablet$]).pipe(
    map(([byUser, tablet]) => byUser || tablet),
  );

  toggleSidebar(): void {
    const next = !this.collapsedByUser$.value;
    this.collapsedByUser$.next(next);
    writeCollapsedPref(next);
  }

  retryStore(): void {
    this.reloadStore$.next();
  }

  logout(): void {
    this.auth.logout();
  }

  private menuFor(items: readonly NavItem[]): Observable<NavItem[]> {
    return this.user$.pipe(map((user) => (user ? visibleFor(items, user.role) : [])));
  }
}

function mediaQuery$(query: string): Observable<boolean> {
  const mql = window.matchMedia(query);
  return fromEvent<MediaQueryListEvent>(mql, 'change').pipe(
    map((event) => event.matches),
    startWith(mql.matches),
  );
}

function readCollapsedPref(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsedPref(collapsed: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  } catch {
    // Storage unavailable: the preference lasts until reload.
  }
}
