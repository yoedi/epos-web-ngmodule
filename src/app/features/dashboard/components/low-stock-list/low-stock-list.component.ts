import { Component, Input } from '@angular/core';

import { LowStockProduct } from '../../models/daily-report.model';

/**
 * "Stok Menipis" table (PRD 9.4). "Tambah Stok" opens Stok Masuk with the
 * product already picked (`/stok/masuk?produk=<id>`).
 */
@Component({
  selector: 'app-low-stock-list',
  templateUrl: './low-stock-list.component.html',
  styleUrl: './low-stock-list.component.css',
  standalone: false,
})
export class LowStockListComponent {
  @Input({ required: true }) products: readonly LowStockProduct[] = [];
  @Input() loading = false;

  readonly skeletonRows = [1, 2, 3];
}
