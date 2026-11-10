import { Component, EventEmitter, Input, Output } from '@angular/core';

import { StockInLine, stockAfter } from '../../models/stock-in.model';

/**
 * Draft list of Stok Masuk (PRD 9.7): SKU, name, qty and "stok sebelum → sesudah".
 * On phones each row is laid out as a card (PRD section 7).
 */
@Component({
  selector: 'app-stock-in-table',
  templateUrl: './stock-in-table.component.html',
  styleUrl: './stock-in-table.component.css',
  standalone: false,
})
export class StockInTableComponent {
  @Input({ required: true }) lines: readonly StockInLine[] = [];
  /** Row of the item added last, highlighted like mockup 6a. */
  @Input() highlightId: number | null = null;
  @Input() disabled = false;

  @Output() readonly remove = new EventEmitter<StockInLine>();

  readonly stockAfter = stockAfter;
}
