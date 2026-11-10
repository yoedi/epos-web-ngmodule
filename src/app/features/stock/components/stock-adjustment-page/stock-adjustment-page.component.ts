import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Observable, catchError, finalize, map, of, startWith, switchMap } from 'rxjs';

import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../../core/http/api-error.model';
import {
  ADJUSTMENT_REASONS,
  formatSignedQty,
  isNoteRequired,
  parsePhysicalStock,
  reasonLabel,
  stockDifference,
} from '../../models/stock-adjustment.model';
import { AdjustmentReason, StockProduct } from '../../models/stock-in.model';
import { StockService } from '../../services/stock.service';
import { HistoryState } from '../stock-in-history/stock-in-history.component';
import { StockProductPickerComponent } from '../stock-product-picker/stock-product-picker.component';

const HISTORY_SIZE = 10;

/**
 * Penyesuaian Stok (PRD 9.8). Pick a product, type the counted stock, pick a
 * reason, confirm, then POST /stock/adjustment. The form keeps its values when
 * saving fails, so "Simpan Penyesuaian" works again as the retry.
 */
@Component({
  selector: 'app-stock-adjustment-page',
  templateUrl: './stock-adjustment-page.component.html',
  styleUrls: [
    '../stock-in-page/stock-in-page.component.css',
    './stock-adjustment-page.component.css',
  ],
  standalone: false,
})
export class StockAdjustmentPageComponent {
  private readonly stockService = inject(StockService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(StockProductPickerComponent)
  private picker!: StockProductPickerComponent;
  @ViewChild('physicalInput') private physicalInput!: ElementRef<HTMLInputElement>;

  readonly reasons = ADJUSTMENT_REASONS;
  readonly signed = formatSignedQty;
  readonly reasonLabel = reasonLabel;

  readonly physical = new FormControl('', { nonNullable: true });
  readonly reason = new FormControl<AdjustmentReason | null>(null);
  readonly note = new FormControl('', { nonNullable: true });

  private readonly reloadHistory$ = new BehaviorSubject<void>(undefined);
  readonly history$: Observable<HistoryState> = this.reloadHistory$.pipe(
    switchMap(() =>
      this.stockService.recentAdjustments(HISTORY_SIZE).pipe(
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
  pickerError: string | null = null;
  physicalError: string | null = null;
  reasonError: string | null = null;
  noteError: string | null = null;
  /** VALIDATION_ERROR messages without a field on this form. Other errors are toasts. */
  saveErrors: string[] = [];
  confirming = false;
  submitting = false;

  constructor() {
    // A changed value clears its own error; the next save checks again.
    this.physical.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => (this.physicalError = null));
    this.reason.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.reasonError = null;
      this.noteError = null;
    });
    this.note.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => (this.noteError = null));
  }

  /** The typed count, or null while it is empty or not a whole number. */
  get physicalStock(): number | null {
    return parsePhysicalStock(this.physical.value);
  }

  /** Physical minus system stock; null until both are known. */
  get difference(): number | null {
    const physical = this.physicalStock;
    return this.selected && physical !== null
      ? stockDifference(this.selected.stock, physical)
      : null;
  }

  get noteRequired(): boolean {
    return isNoteRequired(this.reason.value);
  }

  get dirty(): boolean {
    return (
      this.selected !== null ||
      this.physical.value !== '' ||
      this.reason.value !== null ||
      this.note.value !== ''
    );
  }

  onSelection(product: StockProduct | null): void {
    this.selected = product;
    this.saveErrors = [];
    if (product) {
      this.pickerError = null;
      this.focusPhysical();
    }
  }

  /** Validates the form, then asks for confirmation (PRD 9.8 "Konfirmasi sebelum simpan"). */
  review(): void {
    if (this.submitting) {
      return;
    }
    this.saveErrors = [];
    this.pickerError = this.selected ? null : 'Pilih barang terlebih dahulu';
    this.physicalError = this.validatePhysical();
    this.reasonError = this.reason.value ? null : 'Pilih alasan penyesuaian';
    this.noteError =
      this.noteRequired && this.note.value.trim() === ''
        ? 'Catatan wajib diisi untuk alasan Lainnya'
        : null;

    if (this.pickerError) {
      this.picker.focus();
    } else if (this.physicalError) {
      this.focusPhysical();
    } else if (!this.reasonError && !this.noteError) {
      this.confirming = true;
    }
  }

  closeConfirm(): void {
    if (!this.submitting) {
      this.confirming = false;
    }
  }

  save(): void {
    const product = this.selected;
    const physical = this.physicalStock;
    const reason = this.reason.value;
    if (this.submitting || !product || physical === null || !reason) {
      return;
    }
    this.submitting = true;
    this.stockService
      .adjust(product.id, physical, reason, this.note.value)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.confirming = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (movement) => {
          this.messages.add({
            severity: 'success',
            summary: 'Penyesuaian stok tersimpan',
            detail: `${movement.productName}: ${movement.stockBefore} → ${movement.stockAfter} (${formatSignedQty(movement.qty)})`,
          });
          this.reset();
          this.reloadHistory$.next();
        },
        error: (err: unknown) => {
          // The form is kept; other codes were already shown as a toast by ErrorInterceptor.
          if (isAppError(err) && err.code === 'VALIDATION_ERROR') {
            this.showFieldErrors(err.fieldErrors ?? [], err.message);
          }
        },
      });
  }

  reset(): void {
    this.selected = null;
    this.physical.setValue('');
    this.reason.setValue(null);
    this.note.setValue('');
    this.pickerError = null;
    this.physicalError = null;
    this.reasonError = null;
    this.noteError = null;
    this.saveErrors = [];
    this.picker.reset();
    this.picker.focus();
  }

  retryHistory(): void {
    this.reloadHistory$.next();
  }

  private validatePhysical(): string | null {
    if (!this.selected) {
      return null;
    }
    if (this.physical.value.trim() === '') {
      return 'Isi stok fisik hasil hitung';
    }
    if (this.difference === null) {
      return 'Stok fisik harus bilangan bulat 0 atau lebih';
    }
    if (this.difference === 0) {
      return 'Stok fisik sama dengan stok sistem, tidak ada selisih';
    }
    return null;
  }

  private showFieldErrors(fieldErrors: { field: string; message: string }[], fallback: string): void {
    const unplaced: string[] = [];
    for (const { field, message } of fieldErrors) {
      switch (field) {
        case 'product_id':
          this.pickerError = message;
          break;
        case 'physical_stock':
          this.physicalError = message;
          break;
        case 'reason':
          this.reasonError = message;
          break;
        case 'note':
          this.noteError = message;
          break;
        default:
          unplaced.push(message);
      }
    }
    this.saveErrors = fieldErrors.length === 0 ? [fallback] : unplaced;
  }

  private focusPhysical(): void {
    this.physicalInput.nativeElement.focus();
    this.physicalInput.nativeElement.select();
  }
}
