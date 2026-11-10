import { Component, EventEmitter, Input, Output } from '@angular/core';

import { formatSignedQty, reasonLabel } from '../../models/stock-adjustment.model';
import { HistoryState } from '../stock-in-history/stock-in-history.component';

/** "Riwayat Penyesuaian Terbaru" panel next to Penyesuaian Stok (PRD 9.8). */
@Component({
  selector: 'app-stock-adjustment-history',
  templateUrl: './stock-adjustment-history.component.html',
  styleUrl: '../stock-in-history/stock-in-history.component.css',
  standalone: false,
})
export class StockAdjustmentHistoryComponent {
  @Input({ required: true }) state!: HistoryState;
  @Output() readonly retry = new EventEmitter<void>();

  readonly skeletonRows = [1, 2, 3, 4];
  readonly reasonLabel = reasonLabel;
  readonly signed = formatSignedQty;
}
