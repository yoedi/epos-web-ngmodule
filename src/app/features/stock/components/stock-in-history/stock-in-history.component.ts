import { Component, EventEmitter, Input, Output } from '@angular/core';

import { StockMovement } from '../../models/stock-in.model';

export type HistoryState =
  | { status: 'loading' }
  | { status: 'ready'; movements: StockMovement[] }
  | { status: 'error'; message: string };

/** "Riwayat Stok Masuk Terbaru" panel of PRD 9.7, one row per saved item. */
@Component({
  selector: 'app-stock-in-history',
  templateUrl: './stock-in-history.component.html',
  styleUrl: './stock-in-history.component.css',
  standalone: false,
})
export class StockInHistoryComponent {
  @Input({ required: true }) state!: HistoryState;
  @Output() readonly retry = new EventEmitter<void>();

  readonly skeletonRows = [1, 2, 3, 4];
}
