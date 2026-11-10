import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

import { SaleDetail } from '../../models/sale-history.model';

/**
 * Print host for "Cetak Ulang" (PRD 9.9). Invisible on screen. The host moves
 * to <body> so styles/print.css can hide everything else with one rule.
 */
@Component({
  selector: 'app-sale-receipt-print',
  template: '<app-sale-receipt [sale]="sale" variant="print" />',
  styles: ':host { display: none; } @media print { :host { display: block; } }',
  standalone: false,
})
export class SaleReceiptPrintComponent implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  @Input({ required: true }) sale!: SaleDetail;

  ngOnInit(): void {
    this.document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }
}
