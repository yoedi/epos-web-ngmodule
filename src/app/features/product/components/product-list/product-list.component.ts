import { Component, DestroyRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { MessageService } from 'primeng/api';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  merge,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../../core/http/api-error.model';
import { Page } from '../../../../core/http/page.model';
import { Category } from '../../../category/models/category.model';
import { CategoryService } from '../../../category/services/category.service';
import {
  Product,
  ProductQuery,
  ProductSort,
  ProductSortField,
  ProductStatusFilter,
} from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { ProductFormComponent, ProductSaved } from '../product-form/product-form.component';

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; page: Page<Product> }
  | { status: 'error'; message: string };

interface FilterChip {
  filter: 'categoryId' | 'status';
  label: string;
}

interface ProductListVm {
  state: ListState;
  query: ProductQuery;
  categories: Category[];
  categoryOptions: { name: string; id: number | null }[];
  canManage: boolean;
  chips: FilterChip[];
  hasFilter: boolean;
}

const PAGE_SIZE = 20;

const INITIAL_QUERY: ProductQuery = {
  search: '',
  categoryId: null,
  status: null,
  page: 0,
  size: PAGE_SIZE,
  sort: null,
};

const STATUS_LABEL: Record<ProductStatusFilter, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
  LOW_STOCK: 'Stok Menipis',
};

/** Unsorted -> ascending -> descending -> unsorted. */
function nextSort(current: ProductSort | null, field: ProductSortField): ProductSort | null {
  if (current?.field !== field) {
    return { field, direction: 'asc' };
  }
  return current.direction === 'asc' ? { field, direction: 'desc' } : null;
}

/** Daftar Produk (PRD 9.5). The owner manages products; the cashier only views them. */
@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
  standalone: false,
})
export class ProductListComponent {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(ProductFormComponent) productForm?: ProductFormComponent;

  readonly filters = inject(FormBuilder).group({
    search: [''],
    categoryId: [null as number | null],
    status: [null as ProductStatusFilter | null],
  });

  readonly statusOptions: { label: string; value: ProductStatusFilter | null }[] = [
    { label: 'Semua Status', value: null },
    { label: STATUS_LABEL.ACTIVE, value: 'ACTIVE' },
    { label: STATUS_LABEL.INACTIVE, value: 'INACTIVE' },
    { label: STATUS_LABEL.LOW_STOCK, value: 'LOW_STOCK' },
  ];

  private readonly querySubject = new BehaviorSubject<ProductQuery>(INITIAL_QUERY);
  private readonly refreshSubject = new Subject<void>();

  /** A new query shows the skeleton; a refresh after saving keeps the rows on screen. */
  private readonly state$: Observable<ListState> = merge(
    this.querySubject.pipe(map((query) => ({ query, skeleton: true }))),
    this.refreshSubject.pipe(
      map(() => ({ query: this.querySubject.value, skeleton: false })),
    ),
  ).pipe(
    switchMap(({ query, skeleton }) => {
      const request$ = this.productService.list(query).pipe(
        tap((page) => this.leaveEmptyPage(page)),
        map((page): ListState => ({ status: 'ready', page })),
        catchError((err: unknown) =>
          of<ListState>({
            status: 'error',
            message: isAppError(err) ? err.message : UNKNOWN_ERROR_MESSAGE,
          }),
        ),
      );
      return skeleton ? request$.pipe(startWith<ListState>({ status: 'loading' })) : request$;
    }),
  );

  /** Filters still work without categories; ErrorInterceptor reports the failure. */
  private readonly categories$ = this.categoryService.list().pipe(
    catchError(() => of<Category[]>([])),
    startWith<Category[]>([]),
  );

  readonly vm$: Observable<ProductListVm> = combineLatest([
    this.state$,
    this.querySubject,
    this.categories$,
    this.auth.currentUser$,
  ]).pipe(
    map(([state, query, categories, user]) => ({
      state,
      query,
      categories,
      categoryOptions: [{ name: 'Semua Kategori', id: null }, ...categories],
      canManage: user?.role === 'OWNER',
      chips: this.chipsFor(query, categories),
      hasFilter: !!query.search || query.categoryId !== null || query.status !== null,
    })),
  );

  filterSheetOpen = false;

  formOpen = false;
  formBusy = false;
  editing: Product | null = null;

  toDeactivate: Product | null = null;
  statusBusy = false;

  private focusBeforeOverlay: HTMLElement | null = null;

  constructor() {
    const { search, categoryId, status } = this.filters.controls;

    search.valueChanges
      .pipe(
        debounceTime(300),
        map((value) => (value ?? '').trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        if (value !== this.querySubject.value.search) {
          this.patchQuery({ search: value, page: 0 });
        }
      });

    merge(categoryId.valueChanges, status.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.patchQuery({ categoryId: categoryId.value, status: status.value, page: 0 }),
      );
  }

  retry(): void {
    this.patchQuery({});
  }

  changeSort(field: ProductSortField): void {
    this.patchQuery({ sort: nextSort(this.querySubject.value.sort, field), page: 0 });
  }

  changePage(page: number): void {
    this.patchQuery({ page });
  }

  removeChip(chip: FilterChip): void {
    this.filters.controls[chip.filter].setValue(null);
  }

  clearFilters(): void {
    this.filters.setValue({ search: '', categoryId: null, status: null }, { emitEvent: false });
    // Also resets the debounced search stream; its later emission finds nothing to change.
    this.filters.controls.search.setValue('');
    this.patchQuery({ search: '', categoryId: null, status: null, page: 0 });
  }

  openCreate(): void {
    this.rememberFocus();
    this.editing = null;
    this.formOpen = true;
  }

  openEdit(product: Product): void {
    this.rememberFocus();
    this.editing = product;
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.formBusy = false;
    this.editing = null;
    this.restoreFocus();
  }

  handleSaved({ product, created }: ProductSaved): void {
    this.closeForm();
    this.notify(`${product.name} berhasil ${created ? 'ditambahkan' : 'diperbarui'}`);
    this.refreshSubject.next();
  }

  toggleStatus(product: Product): void {
    if (product.isActive) {
      this.rememberFocus();
      this.toDeactivate = product;
    } else {
      this.applyStatus(product, true);
    }
  }

  confirmDeactivate(): void {
    if (this.toDeactivate) {
      this.applyStatus(this.toDeactivate, false);
    }
  }

  cancelDeactivate(): void {
    this.toDeactivate = null;
    this.restoreFocus();
  }

  private applyStatus(product: Product, isActive: boolean): void {
    if (this.statusBusy) {
      return;
    }
    this.statusBusy = true;
    this.productService
      .setActive(product.id, isActive)
      .pipe(
        finalize(() => {
          this.statusBusy = false;
          this.cancelDeactivate();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notify(`${product.name} ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
          this.refreshSubject.next();
        },
        // Shown as a toast by ErrorInterceptor; the row keeps its previous status.
        error: () => undefined,
      });
  }

  private patchQuery(patch: Partial<ProductQuery>): void {
    this.querySubject.next({ ...this.querySubject.value, ...patch });
  }

  /** Deactivating the last row of the last page under a filter leaves an empty page. */
  private leaveEmptyPage(page: Page<Product>): void {
    if (page.content.length === 0 && page.totalElements > 0) {
      this.patchQuery({ page: page.totalPages - 1 });
    }
  }

  private chipsFor(query: ProductQuery, categories: readonly Category[]): FilterChip[] {
    const chips: FilterChip[] = [];
    const category = categories.find((c) => c.id === query.categoryId);
    if (category) {
      chips.push({ filter: 'categoryId', label: category.name });
    }
    if (query.status) {
      chips.push({ filter: 'status', label: STATUS_LABEL[query.status] });
    }
    return chips;
  }

  private notify(detail: string): void {
    this.messages.add({ severity: 'success', summary: 'Berhasil', detail });
  }

  private rememberFocus(): void {
    this.focusBeforeOverlay = document.activeElement as HTMLElement | null;
  }

  private restoreFocus(): void {
    this.focusBeforeOverlay?.focus();
    this.focusBeforeOverlay = null;
  }
}
