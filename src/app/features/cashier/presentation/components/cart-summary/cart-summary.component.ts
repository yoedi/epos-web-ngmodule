import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Cart } from '../../../domain/models/cart';

/** Right column: invoice, counts, the big TOTAL, payment method, Bayar and Kosongkan. */
@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.component.html',
  styleUrl: './cart-summary.component.css',
  standalone: false,
})
export class CartSummaryComponent {
  @Input({ required: true }) cart!: Cart;
  @Input() cashierName = '';
  /**
   * The server assigns the invoice number when the sale is saved; there is no
   * endpoint for the next one. Until then only today's prefix is known.
   */
  @Input({ required: true }) today!: Date;

  @Output() readonly pay = new EventEmitter<void>();
  @Output() readonly clear = new EventEmitter<void>();
}
