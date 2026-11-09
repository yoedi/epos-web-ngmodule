import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Product } from '../../models/product.model';

/** Edit and Nonaktifkan/Aktifkan buttons of one product, for the table and the cards. */
@Component({
  selector: 'app-product-actions',
  templateUrl: './product-actions.component.html',
  styleUrl: './product-actions.component.css',
  standalone: false,
})
export class ProductActionsComponent {
  @Input({ required: true }) product!: Product;
  @Output() edit = new EventEmitter<Product>();
  @Output() toggleStatus = new EventEmitter<Product>();
}
