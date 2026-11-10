import { Component, HostListener, ViewChild, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  Observable,
  catchError,
  combineLatest,
  fromEvent,
  map,
  of,
  shareReplay,
  startWith,
} from 'rxjs';

import { AuthService } from '../../../../../core/auth/auth.service';
import { StoreSettings } from '../../../../../core/store/store-settings.models';
import { StoreSettingsService } from '../../../../../core/store/store-settings.service';
import { Product } from '../../../domain/models/product';
import { CashierState, CashierStore } from '../../state/cashier.store';
import { QtyChange } from '../cart-table/cart-table.component';
import { ProductSearchComponent } from '../product-search/product-search.component';

/** The cashier screen is not supported on phones in v1 (PRD 7). */
const PHONE_QUERY = '(max-width: 767.98px)';

interface CashierVm {
  state: CashierState;
  cashierName: string;
}

/**
 * Layar Kasir (PRD 9.2). Fully keyboard driven: F2 search, F9 pay, Enter
 * add/confirm, +/− qty, Delete remove, ↑/↓ select, Esc close. All shortcuts
 * are handled here so their rules sit in one place.
 */
@Component({
  selector: 'app-cashier-page',
  templateUrl: './cashier-page.component.html',
  styleUrl: './cashier-page.component.css',
  standalone: false,
  providers: [CashierStore],
})
export class CashierPageComponent {
  readonly store = inject(CashierStore);
  private readonly messages = inject(MessageService);

  @ViewChild(ProductSearchComponent) private search?: ProductSearchComponent;

  readonly isPhone$ = mediaQuery$(PHONE_QUERY);

  readonly vm$: Observable<CashierVm> = combineLatest([
    this.store.state$,
    inject(AuthService).currentUser$,
  ]).pipe(map(([state, user]) => ({ state, cashierName: user?.name ?? '' })));

  /** Receipt header. A failed load still lets the sale go through; the receipt just has no header. */
  readonly storeSettings$: Observable<StoreSettings | null> = inject(StoreSettingsService)
    .load()
    .pipe(
      catchError(() => of(null)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  today = new Date();
  confirmingClear = false;

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (this.confirmingClear || !this.search) {
      return;
    }
    const { phase } = this.store.state;

    switch (event.key) {
      case 'F2':
        event.preventDefault();
        if (phase === 'idle') {
          this.focusSearch();
        }
        return;
      case 'F9':
        event.preventDefault();
        this.openPayment();
        return;
      case 'Escape':
        if (phase === 'paying') {
          event.preventDefault();
          this.closePayment();
        } else if (phase === 'success') {
          event.preventDefault();
          this.startNewSale();
        }
        return;
      case 'Enter':
        // Enter on a focused button already clicks it.
        if (
          phase === 'success' &&
          !event.defaultPrevented &&
          !(event.target instanceof HTMLButtonElement)
        ) {
          event.preventDefault();
          this.startNewSale();
        }
        return;
    }

    // Keys the search box already used (moving through its results) stop here.
    if (phase !== 'idle' || event.defaultPrevented || !cartKeysAllowed(event.target)) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        this.store.moveSelection(event.key === 'ArrowDown' ? 1 : -1);
        return;
      case '+':
        event.preventDefault();
        this.store.changeQty(1);
        return;
      case '-':
        event.preventDefault();
        this.store.changeQty(-1);
        return;
      case 'Delete':
        event.preventDefault();
        this.store.remove();
        return;
    }
  }

  // ── Search ─────────────────────────────────────────────────

  addProduct(product: Product): void {
    if (this.store.add(product)) {
      this.search?.reset();
    }
    this.focusSearch();
  }

  async scan(barcode: string): Promise<void> {
    // A scanner fires the next code right away, so the box is cleared either way.
    this.search?.reset();
    const result = await this.store.scan(barcode);
    if (result.status === 'not-found') {
      this.messages.add({ severity: 'warn', summary: 'Tidak ditemukan', detail: result.message });
    }
    this.focusSearch();
  }

  // ── Cart ───────────────────────────────────────────────────

  changeQty({ productId, qty }: QtyChange): void {
    this.store.setQty(productId, qty);
  }

  askClear(): void {
    if (!this.store.state.cart.isEmpty) {
      this.confirmingClear = true;
    }
  }

  confirmClear(): void {
    this.store.clear();
    this.cancelClear();
  }

  cancelClear(): void {
    this.confirmingClear = false;
    this.focusSearch();
  }

  // ── Payment ────────────────────────────────────────────────

  openPayment(): void {
    this.search?.reset();
    this.store.openPayment();
  }

  closePayment(): void {
    this.store.closePayment();
    if (this.store.state.phase === 'idle') {
      this.focusSearch();
    }
  }

  pay(paid: number): void {
    void this.store.pay(paid);
  }

  printReceipt(): void {
    window.print();
  }

  startNewSale(): void {
    this.store.startNewSale();
    this.today = new Date();
    this.focusSearch();
  }

  private focusSearch(): void {
    // After the current change detection, so a closing dialog does not steal focus back.
    setTimeout(() => this.search?.focus());
  }
}

/**
 * +/−, Delete and the arrows act on the cart unless the user is typing:
 * anywhere outside a text field, or in the search box while it is empty.
 */
function cartKeysAllowed(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) {
    return target.id === 'cashier-search' && target.value === '';
  }
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return false;
  }
  return !(target instanceof HTMLElement && target.isContentEditable);
}

function mediaQuery$(query: string): Observable<boolean> {
  const mql = window.matchMedia(query);
  return fromEvent<MediaQueryListEvent>(mql, 'change').pipe(
    map((event) => event.matches),
    startWith(mql.matches),
  );
}
