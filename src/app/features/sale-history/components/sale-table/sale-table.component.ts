import { Component, EventEmitter, Input, Output } from '@angular/core';

import { SaleSummary, SortDirection } from '../../models/sale-history.model';

/** Transaction table for laptop and tablet (PRD 9.9, mockup 5a). CSS grid, not <table>. */
@Component({
  selector: 'app-sale-table',
  templateUrl: './sale-table.component.html',
  styleUrl: './sale-table.component.css',
  standalone: false,
})
export class SaleTableComponent {
  @Input() sales: readonly SaleSummary[] = [];
  @Input() loading = false;
  @Input() direction: SortDirection = 'desc';

  @Output() toggleSort = new EventEmitter<void>();
  @Output() view = new EventEmitter<SaleSummary>();

  readonly skeletonRows = [1, 2, 3, 4, 5, 6];
}
