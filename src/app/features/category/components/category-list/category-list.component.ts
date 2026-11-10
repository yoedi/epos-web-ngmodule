import { Component, DestroyRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  finalize,
  map,
  merge,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../../core/http/api-error.model';
import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';
import { CategoryFormComponent, CategorySaved } from '../category-form/category-form.component';

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; categories: Category[] }
  | { status: 'error'; message: string };

interface CategoryListVm {
  state: ListState;
  canManage: boolean;
}

/** Shown before the request when the list already says the category has products. */
function inUseMessage(category: Category): string {
  return `Kategori ${category.name} masih memiliki ${category.productCount} produk`;
}

/** Kategori (PRD 9.6). The owner manages categories; the cashier only views them. */
@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css',
  standalone: false,
})
export class CategoryListComponent {
  private readonly categoryService = inject(CategoryService);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(CategoryFormComponent) categoryForm?: CategoryFormComponent;

  private readonly reloadSubject = new Subject<void>();
  private readonly refreshSubject = new Subject<void>();

  /** A reload shows the skeleton; a refresh after saving keeps the rows on screen. */
  private readonly state$: Observable<ListState> = merge(
    this.reloadSubject.pipe(
      startWith(undefined),
      map(() => true),
    ),
    this.refreshSubject.pipe(map(() => false)),
  ).pipe(
    switchMap((skeleton) => {
      const request$ = this.categoryService.list().pipe(
        map((categories): ListState => ({ status: 'ready', categories })),
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

  readonly vm$: Observable<CategoryListVm> = combineLatest([
    this.state$,
    this.auth.currentUser$,
  ]).pipe(map(([state, user]) => ({ state, canManage: user?.role === 'OWNER' })));

  readonly dialogStyle = { width: 'var(--dialog-w-sm)', maxWidth: '100%' };

  formOpen = false;
  formBusy = false;
  editing: Category | null = null;

  toDelete: Category | null = null;
  deleteBusy = false;
  /** Why the category cannot be deleted; non-null opens the explanation dialog. */
  blockedMessage: string | null = null;

  private focusBeforeOverlay: HTMLElement | null = null;

  retry(): void {
    this.reloadSubject.next();
  }

  openCreate(): void {
    this.rememberFocus();
    this.editing = null;
    this.formOpen = true;
  }

  openEdit(category: Category): void {
    this.rememberFocus();
    this.editing = category;
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.formBusy = false;
    this.editing = null;
    this.restoreFocus();
  }

  handleSaved({ category, created }: CategorySaved): void {
    this.closeForm();
    this.notify(`${category.name} berhasil ${created ? 'ditambahkan' : 'diperbarui'}`);
    this.refreshSubject.next();
  }

  /** Deleting is blocked while the category has products (PRD 9.6, api-spec CATEGORY_IN_USE). */
  askDelete(category: Category): void {
    this.rememberFocus();
    if (category.productCount > 0) {
      this.blockedMessage = inUseMessage(category);
    } else {
      this.toDelete = category;
    }
  }

  cancelDelete(): void {
    this.toDelete = null;
    this.restoreFocus();
  }

  closeBlocked(): void {
    this.blockedMessage = null;
    this.restoreFocus();
  }

  confirmDelete(): void {
    const category = this.toDelete;
    if (!category || this.deleteBusy) {
      return;
    }
    this.deleteBusy = true;
    this.categoryService
      .remove(category.id)
      .pipe(
        finalize(() => (this.deleteBusy = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          // The focused row is gone, so focus is not restored to it.
          this.toDelete = null;
          this.focusBeforeOverlay = null;
          this.notify(`${category.name} berhasil dihapus`);
          this.refreshSubject.next();
        },
        error: (err: unknown) => {
          this.toDelete = null;
          if (isAppError(err) && err.code === 'CATEGORY_IN_USE') {
            // Someone added a product to it since the list was loaded.
            this.blockedMessage = err.message;
            this.refreshSubject.next();
          } else {
            // Shown as a toast by ErrorInterceptor.
            this.restoreFocus();
          }
        },
      });
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
