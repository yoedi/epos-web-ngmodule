import { Component, Input } from '@angular/core';

import { TopProduct } from '../../models/daily-report.model';

/** "5 Barang Terlaris Hari Ini" table (PRD 9.4): name, qty sold, total. */
@Component({
  selector: 'app-top-products-list',
  templateUrl: './top-products-list.component.html',
  styleUrl: './top-products-list.component.css',
  standalone: false,
})
export class TopProductsListComponent {
  @Input({ required: true }) products: readonly TopProduct[] = [];
  @Input() loading = false;

  readonly skeletonRows = [1, 2, 3, 4, 5];
}
