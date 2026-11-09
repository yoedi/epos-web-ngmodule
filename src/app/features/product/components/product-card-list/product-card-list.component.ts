import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Product } from '../../models/product.model';

/** Products as a list of cards on phones (PRD section 7, mockup 9b). */
@Component({
  selector: 'app-product-card-list',
  templateUrl: './product-card-list.component.html',
  styleUrl: './product-card-list.component.css',
  standalone: false,
})
export class ProductCardListComponent {
  @Input() products: readonly Product[] = [];
  @Input() loading = false;
  @Input() canManage = false;

  @Output() edit = new EventEmitter<Product>();
  @Output() toggleStatus = new EventEmitter<Product>();

  readonly skeletonCards = [1, 2, 3];
}
