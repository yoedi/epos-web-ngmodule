import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Product, ProductSort, ProductSortField } from '../../models/product.model';

interface SortableColumn {
  field: ProductSortField;
  label: string;
  align: 'start' | 'center' | 'end';
}

const COLUMNS_BEFORE_COST: readonly SortableColumn[] = [
  { field: 'sku', label: 'SKU', align: 'start' },
  { field: 'name', label: 'Nama', align: 'start' },
  { field: 'category.name', label: 'Kategori', align: 'start' },
  { field: 'sell_price', label: 'Harga Jual', align: 'end' },
];
const COST_COLUMN: SortableColumn = { field: 'cost_price', label: 'Harga Modal', align: 'end' };
const COLUMNS_AFTER_COST: readonly SortableColumn[] = [
  { field: 'stock', label: 'Stok', align: 'start' },
  { field: 'is_active', label: 'Status', align: 'center' },
];

const OWNER_COLUMNS = [...COLUMNS_BEFORE_COST, COST_COLUMN, ...COLUMNS_AFTER_COST];
const CASHIER_COLUMNS = [...COLUMNS_BEFORE_COST, ...COLUMNS_AFTER_COST];

/** Product table for laptop and tablet (PRD 9.5). CSS grid, not <table>. */
@Component({
  selector: 'app-product-table',
  templateUrl: './product-table.component.html',
  styleUrl: './product-table.component.css',
  standalone: false,
})
export class ProductTableComponent {
  @Input() products: readonly Product[] = [];
  @Input() loading = false;
  /** Owner: Harga Modal and Aksi columns are shown (PRD section 6). */
  @Input() canManage = false;
  @Input() sort: ProductSort | null = null;

  @Output() sortChange = new EventEmitter<ProductSortField>();
  @Output() edit = new EventEmitter<Product>();
  @Output() toggleStatus = new EventEmitter<Product>();

  readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  get columns(): readonly SortableColumn[] {
    return this.canManage ? OWNER_COLUMNS : CASHIER_COLUMNS;
  }

  ariaSort(field: ProductSortField): 'ascending' | 'descending' | 'none' {
    if (this.sort?.field !== field) {
      return 'none';
    }
    return this.sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  sortIcon(field: ProductSortField): string {
    if (this.sort?.field !== field) {
      return 'pi-sort-alt';
    }
    return this.sort.direction === 'asc' ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down';
  }
}
