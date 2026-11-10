import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Category } from '../../models/category.model';

/**
 * Category table (PRD 9.6). CSS grid, not <table>. On phones each row turns
 * into a card (PRD section 7); the list is short, so one component covers both.
 */
@Component({
  selector: 'app-category-table',
  templateUrl: './category-table.component.html',
  styleUrl: './category-table.component.css',
  standalone: false,
})
export class CategoryTableComponent {
  @Input() categories: readonly Category[] = [];
  @Input() loading = false;
  /** Owner: the Aksi column is shown (PRD section 6). */
  @Input() canManage = false;

  @Output() edit = new EventEmitter<Category>();
  @Output() remove = new EventEmitter<Category>();

  readonly skeletonRows = [1, 2, 3, 4];
}
