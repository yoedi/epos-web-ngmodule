import { Component, Input } from '@angular/core';

/** `stock_status` computed by the server (docs/api-spec.md section 3). */
export type StockStatus = 'SAFE' | 'LOW_STOCK' | 'OUT_OF_STOCK';

const LABEL: Record<StockStatus, string> = {
  SAFE: 'Aman',
  LOW_STOCK: 'Menipis',
  OUT_OF_STOCK: 'Habis',
};

/** Stock pill: Aman / Menipis / Habis, optionally followed by the quantity. */
@Component({
  selector: 'app-stock-badge',
  templateUrl: './stock-badge.component.html',
  styleUrl: './stock-badge.component.css',
  standalone: false,
})
export class StockBadgeComponent {
  @Input({ required: true }) status!: StockStatus;
  @Input() qty: number | null = null;

  get label(): string {
    return LABEL[this.status];
  }
}
