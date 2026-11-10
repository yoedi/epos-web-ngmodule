import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

import { Sale } from '../../../domain/models/sale';

/**
 * Confirmation after a saved sale: invoice, total, paid, change, all as
 * returned by the server. "Transaksi Baru" gets focus so Enter starts over.
 */
@Component({
  selector: 'app-success-panel',
  templateUrl: './success-panel.component.html',
  styleUrl: './success-panel.component.css',
  standalone: false,
})
export class SuccessPanelComponent implements AfterViewInit {
  @Input({ required: true }) sale!: Sale;

  @Output() readonly printReceipt = new EventEmitter<void>();
  @Output() readonly newSale = new EventEmitter<void>();

  @ViewChild('newSaleButton') private newSaleButton?: ElementRef<HTMLButtonElement>;

  ngAfterViewInit(): void {
    this.newSaleButton?.nativeElement.focus();
  }
}
