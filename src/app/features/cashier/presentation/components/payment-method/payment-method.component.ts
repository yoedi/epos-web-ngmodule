import { Component, Input } from '@angular/core';

/**
 * "Metode Pembayaran" choice. v1 only accepts cash, but it is shown as a
 * choice so QRIS and others (v3) fit without changing the layout (PRD 5).
 */
@Component({
  selector: 'app-payment-method',
  templateUrl: './payment-method.component.html',
  styleUrl: './payment-method.component.css',
  standalone: false,
})
export class PaymentMethodComponent {
  /** Unique per instance: the summary panel and the payment modal both show one. */
  @Input({ required: true }) labelId!: string;
}
