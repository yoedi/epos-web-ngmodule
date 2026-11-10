import { Injectable } from '@angular/core';
import { Observable, delay, of, switchMap, throwError, timer } from 'rxjs';

import { AppError } from '../../../core/http/api-error.model';
import { CategoryDto, SaveCategoryDto } from '../models/category.model';
import { CategoryService } from './category.service';

const MOCK_LATENCY_MS = 300;

/** Categories of the sample products in PRD section 12. */
export const MOCK_CATEGORIES: readonly CategoryDto[] = [
  { id: 1, name: 'Sembako', product_count: 4 },
  { id: 2, name: 'Minuman', product_count: 2 },
  { id: 3, name: 'Makanan', product_count: 1 },
  { id: 4, name: 'Kebutuhan Rumah', product_count: 1 },
];

const NOT_FOUND: AppError = { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan', status: 404 };
const DUPLICATE: AppError = {
  code: 'DUPLICATE_CATEGORY',
  message: 'Nama kategori sudah ada',
  status: 409,
};

/**
 * Stand-in for CategoryService while the backend is not ready. Follows the
 * contract of docs/api-spec.md section 2, including the duplicate-name and
 * in-use checks. Changes last until the page is reloaded.
 */
@Injectable()
export class MockCategoryService extends CategoryService {
  private categories: CategoryDto[] = MOCK_CATEGORIES.map((c) => ({ ...c }));

  protected override requestList(): Observable<CategoryDto[]> {
    return this.respond(this.categories.map((c) => ({ ...c })));
  }

  protected override requestCreate(body: SaveCategoryDto): Observable<CategoryDto> {
    if (this.isTaken(body.name, null)) {
      return this.fail(DUPLICATE);
    }
    const category: CategoryDto = {
      id: Math.max(0, ...this.categories.map((c) => c.id)) + 1,
      name: body.name,
      product_count: 0,
    };
    this.categories = [...this.categories, category];
    return this.respond({ ...category });
  }

  protected override requestUpdate(id: number, body: SaveCategoryDto): Observable<CategoryDto> {
    const current = this.categories.find((c) => c.id === id);
    if (!current) {
      return this.fail(NOT_FOUND);
    }
    if (this.isTaken(body.name, id)) {
      return this.fail(DUPLICATE);
    }
    const updated: CategoryDto = { ...current, name: body.name };
    this.categories = this.categories.map((c) => (c.id === id ? updated : c));
    return this.respond({ ...updated });
  }

  protected override requestRemove(id: number): Observable<void> {
    const current = this.categories.find((c) => c.id === id);
    if (!current) {
      return this.fail(NOT_FOUND);
    }
    if (current.product_count > 0) {
      return this.fail({
        code: 'CATEGORY_IN_USE',
        message: `Kategori ${current.name} masih memiliki ${current.product_count} produk`,
        status: 409,
      });
    }
    this.categories = this.categories.filter((c) => c.id !== id);
    return this.respond(undefined);
  }

  /** Names are compared without case, like a unique index on lower(name). */
  private isTaken(name: string, ownId: number | null): boolean {
    const wanted = name.toLowerCase();
    return this.categories.some((c) => c.id !== ownId && c.name.toLowerCase() === wanted);
  }

  private respond<T>(body: T): Observable<T> {
    return of(body).pipe(delay(MOCK_LATENCY_MS));
  }

  private fail(error: AppError): Observable<never> {
    return timer(MOCK_LATENCY_MS).pipe(switchMap(() => throwError(() => error)));
  }
}
