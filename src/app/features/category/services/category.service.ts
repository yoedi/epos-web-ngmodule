import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Category, CategoryDto, SaveCategoryDto, toCategory } from '../models/category.model';

/**
 * Category endpoints (docs/api-spec.md section 2). Cross-feature: the list is
 * also used by the product filter and form (PRD 9.5). DTOs stop here; callers
 * only see `Category`. A mock subclass overrides the protected request methods.
 */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  protected readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/categories`;

  list(): Observable<Category[]> {
    return this.requestList().pipe(map((items) => items.map(toCategory)));
  }

  create(name: string): Observable<Category> {
    return this.requestCreate({ name }).pipe(map(toCategory));
  }

  update(id: number, name: string): Observable<Category> {
    return this.requestUpdate(id, { name }).pipe(map(toCategory));
  }

  /** Fails with CATEGORY_IN_USE while the category still has products. */
  remove(id: number): Observable<void> {
    return this.requestRemove(id);
  }

  protected requestList(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(this.url);
  }

  protected requestCreate(body: SaveCategoryDto): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(this.url, body);
  }

  protected requestUpdate(id: number, body: SaveCategoryDto): Observable<CategoryDto> {
    return this.http.patch<CategoryDto>(`${this.url}/${id}`, body);
  }

  protected requestRemove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
