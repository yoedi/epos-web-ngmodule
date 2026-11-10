import { Component, ElementRef, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  from,
  map,
  merge,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../../../core/http/api-error.model';
import { looksLikeBarcode } from '../../../application/scan-barcode.use-case';
import { SEARCH_LIMIT, SearchProductsUseCase } from '../../../application/search-products.use-case';
import { Product, isSoldOut } from '../../../domain/models/product';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; term: string; products: Product[] }
  | { status: 'error'; message: string };

/**
 * Big search box of the cashier screen with its result dropdown.
 * ↑/↓ move through the results, Enter adds, Esc closes the list.
 * A scanner types digits then Enter, which goes straight to the barcode lookup.
 */
@Component({
  selector: 'app-product-search',
  templateUrl: './product-search.component.html',
  styleUrl: './product-search.component.css',
  standalone: false,
})
export class ProductSearchComponent {
  private readonly searchProducts = inject(SearchProductsUseCase);

  @Output() readonly picked = new EventEmitter<Product>();
  @Output() readonly scanned = new EventEmitter<string>();

  @ViewChild('input', { static: true }) private input!: ElementRef<HTMLInputElement>;

  readonly term = new FormControl('', { nonNullable: true });
  readonly skeletonRows = [1, 2, 3];
  readonly isSoldOut = isSoldOut;

  state: SearchState = { status: 'idle' };
  activeIndex = 0;
  dismissed = false;

  private readonly retry$ = new Subject<void>();

  constructor() {
    const typed$ = this.term.valueChanges.pipe(
      debounceTime(300),
      map((value) => value.trim()),
      distinctUntilChanged(),
    );
    merge(typed$, this.retry$.pipe(map(() => this.term.value.trim())))
      .pipe(
        switchMap((term) =>
          term === ''
            ? of<SearchState>({ status: 'idle' })
            : from(this.searchProducts.execute(term)).pipe(
                map((products): SearchState => ({ status: 'ready', term, products })),
                catchError((err: unknown) =>
                  of<SearchState>({
                    status: 'error',
                    message: isAppError(err) ? err.message : UNKNOWN_ERROR_MESSAGE,
                  }),
                ),
                startWith<SearchState>({ status: 'loading' }),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        this.state = state;
        this.activeIndex = 0;
        this.dismissed = false;
      });
  }

  get open(): boolean {
    return !this.dismissed && this.state.status !== 'idle' && this.term.value.trim() !== '';
  }

  get products(): Product[] {
    return this.state.status === 'ready' ? this.state.products : [];
  }

  get errorMessage(): string {
    return this.state.status === 'error' ? this.state.message : '';
  }

  get activeOptionId(): string | null {
    return this.open && this.products.length > 0 ? this.optionId(this.activeIndex) : null;
  }

  optionId(index: number): string {
    return `cashier-search-option-${index}`;
  }

  focus(): void {
    this.input.nativeElement.focus();
    this.input.nativeElement.select();
  }

  /** Empties the box after an item was added, ready for the next scan. */
  reset(): void {
    this.term.setValue('');
    this.state = { status: 'idle' };
    this.activeIndex = 0;
  }

  retry(): void {
    this.retry$.next();
    this.focus();
  }

  pick(product: Product): void {
    this.picked.emit(product);
  }

  handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        // With the list closed, the arrows move through the cart (CashierPageComponent).
        if (this.open && this.products.length > 0) {
          event.preventDefault();
          this.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        }
        return;
      case 'Enter':
        event.preventDefault();
        this.confirm();
        return;
      case 'Escape':
        if (this.open) {
          event.preventDefault();
          this.dismissed = true;
        }
        return;
    }
  }

  private confirm(): void {
    const value = this.term.value.trim();
    if (value === '') {
      return;
    }
    if (looksLikeBarcode(value)) {
      this.scanned.emit(value);
      return;
    }
    // Only act on results that belong to what is typed now.
    const product = this.products[this.activeIndex];
    if (this.open && this.state.status === 'ready' && this.state.term === value && product) {
      this.pick(product);
    }
  }

  private moveActive(step: 1 | -1): void {
    const count = Math.min(this.products.length, SEARCH_LIMIT);
    this.activeIndex = (this.activeIndex + step + count) % count;
    document.getElementById(this.optionId(this.activeIndex))?.scrollIntoView({ block: 'nearest' });
  }
}
