import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  Observable,
  Subject,
  distinctUntilChanged,
  map,
  switchMap,
  timer,
} from 'rxjs';

import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../../core/http/api-error.model';
import { AddToCartUseCase } from '../../application/add-to-cart.use-case';
import { CheckoutUseCase } from '../../application/checkout.use-case';
import { ScanBarcodeUseCase } from '../../application/scan-barcode.use-case';
import {
  CashierError,
  EmptyCartError,
  InsufficientPaymentError,
  ProductNotFoundError,
} from '../../domain/errors/cart.errors';
import { Cart } from '../../domain/models/cart';
import { Payment } from '../../domain/models/payment';
import { Product } from '../../domain/models/product';
import { Sale } from '../../domain/models/sale';

/** How long the "BARU" highlight stays on the last added line. */
export const HIGHLIGHT_MS = 2400;

/** Inline message above the cart, e.g. "Stok Minyak Goreng 2 L tersisa 3". */
export interface CartNotice {
  kind: 'warning' | 'error';
  message: string;
}

/** Why saving the sale failed, shown inside the payment modal with "Coba Lagi". */
export interface SaleFailure {
  code: string;
  message: string;
  /** Set for INSUFFICIENT_PAYMENT so the template can format "Uang kurang Rp X". */
  shortfall: number | null;
}

export type ScanResult =
  | { status: 'added' }
  | { status: 'refused' }
  | { status: 'not-found'; message: string };

/** idle: building the cart · paying: payment modal open · success: sale saved. */
export type CashierPhase = 'idle' | 'paying' | 'success';

export interface CashierState {
  cart: Cart;
  selectedId: number | null;
  highlightedId: number | null;
  notice: CartNotice | null;
  phase: CashierPhase;
  submitting: boolean;
  failure: SaleFailure | null;
  sale: Sale | null;
}

const INITIAL_STATE: CashierState = {
  cart: Cart.empty(),
  selectedId: null,
  highlightedId: null,
  notice: null,
  phase: 'idle',
  submitting: false,
  failure: null,
  sale: null,
};

/**
 * State of the cashier screen (CLAUDE.md section 4). Business rules stay in
 * Cart / Payment and the use cases; this class only keeps the result and
 * turns errors into messages. Provided by CashierPageComponent, so the cart
 * does not outlive the page (and never leaks to the next signed-in user).
 */
@Injectable()
export class CashierStore {
  private readonly addToCart = inject(AddToCartUseCase);
  private readonly scanBarcode = inject(ScanBarcodeUseCase);
  private readonly checkout = inject(CheckoutUseCase);

  private readonly stateSubject = new BehaviorSubject<CashierState>(INITIAL_STATE);
  readonly state$ = this.stateSubject.asObservable();

  readonly cart$ = this.slice((s) => s.cart);
  readonly total$ = this.cart$.pipe(map((cart) => cart.total));
  readonly phase$ = this.slice((s) => s.phase);

  private readonly highlight$ = new Subject<number>();

  constructor() {
    // Clears the highlight after a while; a newer add restarts the timer.
    this.highlight$
      .pipe(
        switchMap((id) => timer(HIGHLIGHT_MS).pipe(map(() => id))),
        takeUntilDestroyed(),
      )
      .subscribe((id) => {
        if (this.state.highlightedId === id) {
          this.patch({ highlightedId: null });
        }
      });
  }

  /** Snapshot for keyboard handlers; templates use state$. */
  get state(): CashierState {
    return this.stateSubject.value;
  }

  // ── Cart ───────────────────────────────────────────────────

  /** Returns false (and shows why) when the product cannot be added. */
  add(product: Product): boolean {
    try {
      const cart = this.addToCart.execute(this.state.cart, product);
      this.patch({ cart, selectedId: product.id, highlightedId: product.id, notice: null });
      this.highlight$.next(product.id);
      return true;
    } catch (err: unknown) {
      this.patch({ notice: { kind: 'warning', message: messageOf(err) } });
      return false;
    }
  }

  /**
   * Resolves a scanned barcode and adds the product. Never rejects: an unknown
   * barcode is returned for a toast, other problems become the cart notice.
   */
  async scan(barcode: string): Promise<ScanResult> {
    try {
      const product = await this.scanBarcode.execute(barcode);
      return { status: this.add(product) ? 'added' : 'refused' };
    } catch (err: unknown) {
      if (err instanceof ProductNotFoundError) {
        return { status: 'not-found', message: err.message };
      }
      this.patch({ notice: { kind: 'error', message: messageOf(err) } });
      return { status: 'refused' };
    }
  }

  setQty(productId: number, qty: number): void {
    try {
      this.patch({ cart: this.state.cart.setQty(productId, qty), selectedId: productId, notice: null });
    } catch (err: unknown) {
      this.patch({ notice: { kind: 'warning', message: messageOf(err) } });
    }
  }

  /** +/− on the selected line (or the given one). Going below 1 does nothing; Delete removes. */
  changeQty(delta: 1 | -1, productId = this.state.selectedId): void {
    const item = productId === null ? undefined : this.state.cart.find(productId);
    if (!item || item.qty + delta < 1) {
      return;
    }
    this.setQty(item.productId, item.qty + delta);
  }

  remove(productId = this.state.selectedId): void {
    if (productId === null) {
      return;
    }
    const { cart } = this.state;
    const index = cart.items.findIndex((item) => item.productId === productId);
    if (index < 0) {
      return;
    }
    const next = cart.remove(productId);
    // Keep a line selected so Delete can be pressed again.
    const neighbour = next.items[Math.min(index, next.items.length - 1)];
    this.patch({ cart: next, selectedId: neighbour?.productId ?? null, notice: null });
  }

  clear(): void {
    this.patch({ cart: this.state.cart.clear(), selectedId: null, highlightedId: null, notice: null });
  }

  /** Arrow up/down through the cart lines. */
  moveSelection(step: 1 | -1): void {
    const { items } = this.state.cart;
    if (items.length === 0) {
      return;
    }
    const current = items.findIndex((item) => item.productId === this.state.selectedId);
    const next =
      current < 0
        ? step === 1
          ? 0
          : items.length - 1
        : Math.min(items.length - 1, Math.max(0, current + step));
    this.patch({ selectedId: items[next].productId });
  }

  select(productId: number): void {
    this.patch({ selectedId: productId });
  }

  dismissNotice(): void {
    this.patch({ notice: null });
  }

  // ── Payment ────────────────────────────────────────────────

  openPayment(): boolean {
    if (this.state.phase !== 'idle') {
      return false;
    }
    if (this.state.cart.isEmpty) {
      this.patch({ notice: { kind: 'warning', message: new EmptyCartError().message } });
      return false;
    }
    this.patch({ phase: 'paying', failure: null, notice: null });
    return true;
  }

  /** Esc / Batal. Ignored while saving so the outcome is never hidden. */
  closePayment(): void {
    if (this.state.phase === 'paying' && !this.state.submitting) {
      this.patch({ phase: 'idle', failure: null });
    }
  }

  /**
   * Saves the sale. The `submitting` flag blocks double clicks. On failure
   * the cart stays as it is, so "Coba Lagi" sends the same sale again.
   */
  async pay(paid: number): Promise<void> {
    const { cart, phase, submitting } = this.state;
    if (phase !== 'paying' || submitting) {
      return;
    }
    this.patch({ submitting: true, failure: null });
    try {
      const sale = await this.checkout.execute(cart, Payment.of(cart.total, paid));
      this.patch({
        ...INITIAL_STATE,
        phase: 'success',
        sale,
      });
    } catch (err: unknown) {
      this.patch({ submitting: false, failure: failureOf(err) });
    }
  }

  /** "Transaksi Baru": back to an empty cart. */
  startNewSale(): void {
    if (this.state.phase === 'success') {
      this.stateSubject.next(INITIAL_STATE);
    }
  }

  private patch(patch: Partial<CashierState>): void {
    this.stateSubject.next({ ...this.state, ...patch });
  }

  private slice<T>(project: (state: CashierState) => T): Observable<T> {
    return this.state$.pipe(map(project), distinctUntilChanged());
  }
}

function messageOf(err: unknown): string {
  if (err instanceof CashierError || isAppError(err)) {
    return err.message;
  }
  return UNKNOWN_ERROR_MESSAGE;
}

function failureOf(err: unknown): SaleFailure {
  if (err instanceof InsufficientPaymentError) {
    return { code: err.code, message: err.message, shortfall: err.shortfall };
  }
  if (err instanceof CashierError || isAppError(err)) {
    return { code: err.code, message: err.message, shortfall: null };
  }
  return { code: 'INTERNAL_ERROR', message: UNKNOWN_ERROR_MESSAGE, shortfall: null };
}
