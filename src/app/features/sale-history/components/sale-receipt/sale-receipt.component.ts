import { Component, HostBinding, Input } from '@angular/core';

import { SaleDetail } from '../../models/sale-history.model';

/** Used when the store has no footer text. Same text as the API sample. */
const DEFAULT_FOOTER = 'Terima kasih, selamat belanja kembali';

/**
 * Receipt content of a saved sale (PRD 9.3). `screen` is the paper-like
 * preview in the detail drawer; `print` is the 58 mm thermal layout.
 */
@Component({
  selector: 'app-sale-receipt',
  templateUrl: './sale-receipt.component.html',
  styleUrl: './sale-receipt.component.css',
  standalone: false,
})
export class SaleReceiptComponent {
  @Input({ required: true }) sale!: SaleDetail;
  @Input() variant: 'screen' | 'print' = 'screen';

  @HostBinding('class.receipt--print')
  get isPrint(): boolean {
    return this.variant === 'print';
  }

  get footer(): string {
    return this.sale.store.receiptFooter || DEFAULT_FOOTER;
  }
}
