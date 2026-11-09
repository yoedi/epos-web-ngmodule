import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Category, CategoryDto, toCategory } from '../models/category.model';

/**
 * Reads the categories (GET /categories). Cross-feature: used by the product
 * filter and form (PRD 9.5). A mock subclass overrides `request()`.
 */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  protected readonly http = inject(HttpClient);

  list(): Observable<Category[]> {
    return this.request().pipe(map((items) => items.map(toCategory)));
  }

  protected request(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(`${environment.apiUrl}/categories`);
  }
}
