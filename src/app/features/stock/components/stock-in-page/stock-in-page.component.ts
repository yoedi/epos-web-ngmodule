import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MessageService } from 'primeng/api';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../../core/http/api-error.model';
import {
  StockInLine,
  StockProduct,
  addLine,
  isValidQty,
  removeLine,
  totalUnits,
} from '../../models/stock-in.model';
import { StockService } from '../../services/stock.service';
import { HistoryState } from '../stock-in-history/stock-in-history.component';
import { StockProductPickerComponent } from '../stock-product-picker/stock-product-picker.component';

const HISTORY_SIZE = 10;

interface DraftSummary {
  lines: StockInLine[];
  itemCount: number;
  units: number;
}

/**
 * Stok Masuk (PRD 9.7, mockup 6a). Items are collected in a draft list with
 * "stok sebelum → sesudah", then saved at once with POST /stock/in.
 * The draft stays on the page when saving fails, so the owner can try again.
 */
@Component({
  selector: 'app-stock-in-page',
  templateUrl: './stock-in-page.component.html',
  styleUrl: './stock-in-page.component.css',
  standalone: false,
})
export class StockInPageComponent {
  private readonly stockService = inject(StockService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(StockProductPickerComponent)
  private picker!: StockProductPickerComponent;
  @ViewChild('qtyField') private qtyField!: ElementRef<HTMLElement>;

  readonly note = new FormControl('', { nonNullable: true });

  private readonly linesSubject = new BehaviorSubject<StockInLine[]>([]);
  readonly draft$: Observable<DraftSummary> = this.linesSubject.pipe(
    map((lines) => ({ lines, itemCount: lines.length, units: totalUnits(lines) })),
  );

  private readonly reloadHistory$ = new BehaviorSubject<void>(undefined);
  readonly history$: Observable<HistoryState> = this.reloadHistory$.pipe(
    switchMap(() =>
      this.stockService.recentStockIn(HISTORY_SIZE).pipe(
        map((movements): HistoryState => ({ status: 'ready', movements })),
        catchError((err: unknown) =>
          of<HistoryState>({
            status: 'error',
            message: isAppError(err) ? err.message : UNKNOWN_ERROR_MESSAGE,
          }),
        ),
        startWith<HistoryState>({ status: 'loading' }),
      ),
    ),
  );

  selected: StockProduct | null = null;
  qty = 1;
  pickerError: string | null = null;
  qtyError: string | null = null;
  /** Messages of a VALIDATION_ERROR on save; other errors are toasts (CLAUDE.md section 7). */
  saveErrors: string[] = [];
  highlightId: number | null = null;
  submitting = false;

  onSelection(product: StockProduct | null): void {
    this.selected = product;
    if (product) {
      this.pickerError = null;
      this.focusQty();
    }
  }

  setQty(value: number): void {
    if (isValidQty(value)) {
      this.qty = value;
      this.qtyError = null;
    } else {
      this.qtyError = 'Jumlah harus bilangan bulat lebih dari 0';
    }
  }

  add(): void {
    if (this.submitting) {
      return;
    }
    if (!this.selected) {
      this.pickerError = 'Pilih barang terlebih dahulu';
      this.picker.focus();
      return;
    }
    if (this.qtyError) {
      this.focusQty();
      return;
    }
    this.linesSubject.next(addLine(this.linesSubject.value, this.selected, this.qty));
    this.highlightId = this.selected.id;
    this.saveErrors = [];
    this.selected = null;
    this.qty = 1;
    this.picker.reset();
    this.picker.focus();
  }

  remove(line: StockInLine): void {
    this.linesSubject.next(removeLine(this.linesSubject.value, line.product.id));
    if (this.highlightId === line.product.id) {
      this.highlightId = null;
    }
    this.picker.focus();
  }

  cancel(): void {
    this.linesSubject.next([]);
    this.note.setValue('');
    this.clearEntry();
    this.picker.focus();
  }

  save(): void {
    const lines = this.linesSubject.value;
    if (this.submitting || lines.length === 0) {
      return;
    }
    this.submitting = true;
    this.saveErrors = [];
    this.stockService
      .stockIn(this.note.value, lines)
      .pipe(
        finalize(() => (this.submitting = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (movements) => {
          const units = movements.reduce((sum, m) => sum + m.qty, 0);
          this.messages.add({
            severity: 'success',
            summary: 'Stok masuk tersimpan',
            detail: `${movements.length} barang · total +${units} unit`,
          });
          this.cancel();
          this.reloadHistory$.next();
        },
        error: (err: unknown) => {
          // The draft is kept; "Simpan Stok Masuk" works again as the retry.
          if (isAppError(err) && err.code === 'VALIDATION_ERROR') {
            this.saveErrors = err.fieldErrors?.map((e) => e.message) ?? [err.message];
          }
        },
      });
  }

  retryHistory(): void {
    this.reloadHistory$.next();
  }

  /** Enter in the qty field adds the line; the stepper commits the typed value first. */
  onQtyEnter(): void {
    this.add();
  }

  private clearEntry(): void {
    this.selected = null;
    this.qty = 1;
    this.pickerError = null;
    this.qtyError = null;
    this.saveErrors = [];
    this.highlightId = null;
    this.picker.reset();
  }

  private focusQty(): void {
    const input = this.qtyField.nativeElement.querySelector('input');
    input?.focus();
    input?.select();
  }
}
