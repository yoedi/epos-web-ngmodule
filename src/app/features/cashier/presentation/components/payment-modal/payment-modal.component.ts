import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { FormControl } from '@angular/forms';

import { formatThousands } from '../../../../../shared/utils/money';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { Payment } from '../../../domain/models/payment';
import { Sale } from '../../../domain/models/sale';
import { SaleFailure } from '../../state/cashier.store';

/** Quick cash buttons after "Uang Pas" (PRD 9.2). */
const QUICK_AMOUNTS = [10_000, 20_000, 50_000, 100_000].map((value) => ({
  value,
  label: formatThousands(value),
}));

/**
 * Payment modal: total, cash received with quick amounts, live change, and
 * "Selesaikan Transaksi". Shows the success panel once the sale is saved.
 * Esc is handled by CashierPageComponent so all shortcuts live in one place.
 */
@Component({
  selector: 'app-payment-modal',
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.css',
  standalone: false,
})
export class PaymentModalComponent implements OnChanges, AfterViewChecked {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() visible = false;
  @Input({ required: true }) total!: number;
  @Input() submitting = false;
  @Input() failure: SaleFailure | null = null;
  /** Set once the sale is saved: the modal switches to the success panel. */
  @Input() sale: Sale | null = null;

  @Output() readonly submitted = new EventEmitter<number>();
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly printReceipt = new EventEmitter<void>();
  @Output() readonly newSale = new EventEmitter<void>();

  @ViewChild(MoneyInputComponent) private amountInput?: MoneyInputComponent;

  readonly paid = new FormControl<number | null>(null);
  readonly quickAmounts = QUICK_AMOUNTS;
  readonly dialogStyle = { width: 'var(--dialog-w-payment)', maxWidth: 'calc(100vw - 2rem)' };
  /** Divider under the header (mockup 2a); PrimeNG owns the content element. */
  readonly contentStyle = { borderTop: 'var(--border-w) solid var(--c-border-inner)' };

  private focusPending = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.paid.reset(null);
      this.focusPending = true;
    }
  }

  /**
   * Focuses "Uang Diterima" as soon as the dialog is in the DOM. PrimeNG's own
   * focus waits for the open animation, and digits typed by a fast cashier in
   * the meantime would land in the search box behind the modal.
   */
  ngAfterViewChecked(): void {
    if (this.focusPending && this.host.nativeElement.querySelector('#payment-paid')) {
      this.focusPending = false;
      this.focusAmount();
    }
  }

  /** Live payment against the total; null until something is typed. */
  get payment(): Payment | null {
    const paid = this.paid.value;
    return paid === null ? null : Payment.of(this.total, paid);
  }

  get canSubmit(): boolean {
    return !this.submitting && !!this.payment?.isSufficient;
  }

  focusAmount(): void {
    this.amountInput?.focus();
  }

  setAmount(amount: number): void {
    this.paid.setValue(amount);
    // Back to the field so Enter confirms instead of pressing the quick button again.
    this.focusAmount();
  }

  submit(): void {
    const payment = this.payment;
    if (this.canSubmit && payment) {
      this.submitted.emit(payment.paid);
    }
  }
}
