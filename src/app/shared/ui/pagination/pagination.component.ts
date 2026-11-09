import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Page buttons around the current page; null marks a gap. Zero-based, like the API. */
export function visiblePages(page: number, totalPages: number): (number | null)[] {
  const wanted = [0, page - 1, page, page + 1, totalPages - 1].filter(
    (p, i, all) => p >= 0 && p < totalPages && all.indexOf(p) === i,
  );
  wanted.sort((a, b) => a - b);

  const result: (number | null)[] = [];
  wanted.forEach((p, i) => {
    if (i > 0 && p - wanted[i - 1] > 1) {
      result.push(null);
    }
    result.push(p);
  });
  return result;
}

/** Footer of a paged list: "Menampilkan 1-8 dari 8 produk" plus the page buttons. */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
  standalone: false,
})
export class PaginationComponent {
  @Input({ required: true }) page!: number;
  @Input({ required: true }) size!: number;
  @Input({ required: true }) totalElements!: number;
  @Input({ required: true }) totalPages!: number;
  @Input() itemLabel = 'data';

  @Output() pageChange = new EventEmitter<number>();

  get from(): number {
    return this.totalElements === 0 ? 0 : this.page * this.size + 1;
  }

  get to(): number {
    return Math.min((this.page + 1) * this.size, this.totalElements);
  }

  get pages(): (number | null)[] {
    return visiblePages(this.page, this.totalPages);
  }
}
