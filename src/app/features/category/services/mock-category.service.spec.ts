import { provideHttpClient } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { AppError } from '../../../core/http/api-error.model';
import { Category } from '../models/category.model';
import { MockCategoryService } from './mock-category.service';

describe('MockCategoryService', () => {
  let service: MockCategoryService;

  /** Runs the request past the mock latency and returns its result or error. */
  function settle<T>(request$: Observable<T>): { value?: T; error?: AppError } {
    const result: { value?: T; error?: AppError } = {};
    request$.subscribe({
      next: (value) => (result.value = value),
      error: (error: AppError) => (result.error = error),
    });
    tick(1000);
    return result;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), MockCategoryService] });
    service = TestBed.inject(MockCategoryService);
  });

  it('lists the sample categories as app models', fakeAsync(() => {
    const { value } = settle(service.list());

    expect(value?.map((c) => c.name)).toEqual(['Sembako', 'Minuman', 'Makanan', 'Kebutuhan Rumah']);
    expect(value?.[0]).toEqual({ id: 1, name: 'Sembako', productCount: 4 });
  }));

  it('creates a category without products', fakeAsync(() => {
    const { value } = settle(service.create('Bumbu Dapur'));

    expect(value).toEqual({ id: 5, name: 'Bumbu Dapur', productCount: 0 });
    expect(settle(service.list()).value?.length).toBe(5);
  }));

  it('rejects a duplicate name regardless of case', fakeAsync(() => {
    const { error } = settle(service.create('sembako'));

    expect(error?.code).toBe('DUPLICATE_CATEGORY');
    expect(error?.status).toBe(409);
  }));

  it('renames a category, and keeping its own name is not a duplicate', fakeAsync(() => {
    expect(settle(service.update(4, 'Kebutuhan Rumah Tangga')).value?.name).toBe(
      'Kebutuhan Rumah Tangga',
    );
    expect(settle(service.update(4, 'Kebutuhan Rumah Tangga')).error).toBeUndefined();
    expect(settle(service.update(4, 'Minuman')).error?.code).toBe('DUPLICATE_CATEGORY');
  }));

  it('refuses to delete a category that still has products', fakeAsync(() => {
    const { error } = settle(service.remove(1));

    expect(error?.code).toBe('CATEGORY_IN_USE');
    expect(error?.message).toBe('Kategori Sembako masih memiliki 4 produk');
  }));

  it('deletes an empty category', fakeAsync(() => {
    const created = settle(service.create('Bumbu Dapur')).value as Category;

    expect(settle(service.remove(created.id)).error).toBeUndefined();
    expect(settle(service.list()).value?.some((c) => c.id === created.id)).toBeFalse();
  }));
});
