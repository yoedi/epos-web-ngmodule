import { Component, ElementRef, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../../core/http/api-error.model';
import { StockProduct, looksLikeBarcode } from '../../models/stock-in.model';
import { StockService } from '../../services/stock.service';

type PickerState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; term: string; products: StockProduct[] }
  | { status: 'error'; message: string };

function errorMessage(err: unknown): string {
  return isAppError(err) ? err.message : UNKNOWN_ERROR_MESSAGE;
}

/**
 * "Barang" field of Stok Masuk (PRD 9.7): search by name/SKU or scan a barcode.
 * ↑/↓ move through the results, Enter picks, Esc closes the list.
 * A scanner types digits then Enter, which goes straight to the barcode lookup.
 */
@Component({
  selector: 'app-stock-product-picker',
  templateUrl: './stock-product-picker.component.html',
  styleUrl: './stock-product-picker.component.css',
  standalone: false,
})
export class StockProductPickerComponent {
  private readonly stockService = inject(StockService);

  /** The picked product, or null once the user types something else. */
  @Output() readonly selectionChange = new EventEmitter<StockProduct | null>();

  @ViewChild('input', { static: true }) private input!: ElementRef<HTMLInputElement>;

  readonly term = new FormControl('', { nonNullable: true });
  readonly skeletonRows = [1, 2, 3];

  state: PickerState = { status: 'idle' };
  activeIndex = 0;
  dismissed = false;
  private selected: StockProduct | null = null;

  private readonly retry$ = new Subject<void>();
  private readonly scan$ = new Subject<string>();

  constructor() {
    const typed$ = this.term.valueChanges.pipe(
      map((value) => value.trim()),
      // Showing the picked product's name is not a new search.
      filter((value) => value !== this.selected?.name),
      debounceTime(300),
      distinctUntilChanged(),
    );
    const search$ = merge(typed$, this.retry$.pipe(map(() => this.term.value.trim()))).pipe(
      switchMap((term) =>
        term === ''
          ? of<PickerState>({ status: 'idle' })
          : this.load(this.stockService.searchProducts(term), term),
      ),
    );
    const scanned$ = this.scan$.pipe(
      switchMap((code) =>
        this.load(
          this.stockService.findByBarcode(code).pipe(map((product) => [product])),
          code,
        ),
      ),
    );

    merge(
      search$.pipe(map((state) => ({ state, scanned: false }))),
      scanned$.pipe(map((state) => ({ state, scanned: true }))),
    )
      .pipe(takeUntilDestroyed())
      .subscribe(({ state, scanned }) => {
        this.state = state;
        this.activeIndex = 0;
        this.dismissed = false;
        // A scan resolves to exactly one product: pick it right away.
        if (scanned && state.status === 'ready') {
          this.pick(state.products[0]);
        }
      });

    this.term.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      if (this.selected && value.trim() !== this.selected.name) {
        this.selected = null;
        this.selectionChange.emit(null);
      }
    });
  }

  get open(): boolean {
    return (
      !this.dismissed &&
      this.selected === null &&
      this.state.status !== 'idle' &&
      this.term.value.trim() !== ''
    );
  }

  get products(): StockProduct[] {
    return this.state.status === 'ready' ? this.state.products : [];
  }

  get errorMessage(): string {
    return this.state.status === 'error' ? this.state.message : '';
  }

  get activeOptionId(): string | null {
    return this.open && this.products.length > 0 ? this.optionId(this.activeIndex) : null;
  }

  optionId(index: number): string {
    return `stock-picker-option-${index}`;
  }

  focus(): void {
    this.input.nativeElement.focus();
    this.input.nativeElement.select();
  }

  /** Empties the field after a line was added, ready for the next item. */
  reset(): void {
    this.selected = null;
    this.state = { status: 'idle' };
    this.activeIndex = 0;
    this.term.setValue('');
  }

  retry(): void {
    this.retry$.next();
    this.focus();
  }

  pick(product: StockProduct): void {
    this.selected = product;
    this.term.setValue(product.name);
    this.dismissed = true;
    this.selectionChange.emit(product);
  }

  handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
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
    if (value === '' || this.selected) {
      // Already picked: Enter re-announces it so the page moves focus to Jumlah.
      if (this.selected) {
        this.selectionChange.emit(this.selected);
      }
      return;
    }
    if (looksLikeBarcode(value)) {
      this.scan$.next(value);
      return;
    }
    // Only act on results that belong to what is typed now.
    const product = this.products[this.activeIndex];
    if (this.open && this.state.status === 'ready' && this.state.term === value && product) {
      this.pick(product);
    }
  }

  private load(request: Observable<StockProduct[]>, term: string): Observable<PickerState> {
    return request.pipe(
      map((products): PickerState => ({ status: 'ready', term, products })),
      catchError((err: unknown) =>
        of<PickerState>({ status: 'error', message: errorMessage(err) }),
      ),
      startWith<PickerState>({ status: 'loading' }),
    );
  }

  private moveActive(step: 1 | -1): void {
    const count = this.products.length;
    this.activeIndex = (this.activeIndex + step + count) % count;
    document.getElementById(this.optionId(this.activeIndex))?.scrollIntoView({ block: 'nearest' });
  }
}
