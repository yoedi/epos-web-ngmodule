import { Component, EventEmitter, Input, Output } from '@angular/core';

import { SaleSummary } from '../../models/sale-history.model';

/** Phone layout of the transaction list: one card per sale (PRD section 7). */
@Component({
  selector: 'app-sale-card-list',
  templateUrl: './sale-card-list.component.html',
  styleUrl: './sale-card-list.component.css',
  standalone: false,
})
export class SaleCardListComponent {
  @Input() sales: readonly SaleSummary[] = [];
  @Input() loading = false;

  @Output() view = new EventEmitter<SaleSummary>();

  readonly skeletonCards = [1, 2, 3, 4];
}
