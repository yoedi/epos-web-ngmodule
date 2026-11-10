import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';

import { Cart } from '../../../domain/models/cart';
import { CartNotice } from '../../state/cashier.store';

export interface QtyChange {
  productId: number;
  qty: number;
}

/**
 * Cart lines as a CSS-grid table: No, Nama Barang, Harga, Qty stepper,
 * Subtotal, delete. The selected line is the target of +/−/Delete.
 */
@Component({
  selector: 'app-cart-table',
  templateUrl: './cart-table.component.html',
  styleUrl: './cart-table.component.css',
  standalone: false,
})
export class CartTableComponent implements AfterViewChecked {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input({ required: true }) cart!: Cart;
  @Input() selectedId: number | null = null;
  @Input() highlightedId: number | null = null;
  @Input() notice: CartNotice | null = null;

  @Output() readonly qtyChange = new EventEmitter<QtyChange>();
  @Output() readonly remove = new EventEmitter<number>();
  @Output() readonly selectItem = new EventEmitter<number>();
  @Output() readonly clear = new EventEmitter<void>();
  @Output() readonly dismissNotice = new EventEmitter<void>();

  private scrolledToId: number | null = null;

  /** Keeps the selected line visible when ↑/↓ moves past the scroll area. */
  ngAfterViewChecked(): void {
    if (this.selectedId === this.scrolledToId) {
      return;
    }
    this.scrolledToId = this.selectedId;
    this.host.nativeElement
      .querySelector(`[data-product-id="${this.selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }
}
