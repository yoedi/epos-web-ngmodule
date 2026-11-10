import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

import { StoreSettings } from '../../../../../core/store/store-settings.models';
import { Sale } from '../../../domain/models/sale';

/** Used when the store settings could not be loaded. Same text as the API sample. */
const DEFAULT_FOOTER = 'Terima kasih, selamat belanja kembali';

/**
 * 58 mm thermal receipt (PRD 9.3). Invisible on screen; only printed.
 * The host moves to <body> so styles/print.css can hide everything else
 * with one rule, without fighting the app layout.
 */
@Component({
  selector: 'app-receipt-print',
  templateUrl: './receipt-print.component.html',
  styleUrl: './receipt-print.component.css',
  standalone: false,
})
export class ReceiptPrintComponent implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  @Input({ required: true }) sale!: Sale;
  @Input() store: StoreSettings | null = null;

  get footer(): string {
    return this.store?.receiptFooter || DEFAULT_FOOTER;
  }

  ngOnInit(): void {
    this.document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }
}
