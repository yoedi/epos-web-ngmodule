import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { CategoryDto } from '../models/category.model';
import { CategoryService } from './category.service';

const MOCK_LATENCY_MS = 300;

/** Categories of the sample products in PRD section 12. */
export const MOCK_CATEGORIES: readonly CategoryDto[] = [
  { id: 1, name: 'Sembako', product_count: 4 },
  { id: 2, name: 'Minuman', product_count: 2 },
  { id: 3, name: 'Makanan', product_count: 1 },
  { id: 4, name: 'Kebutuhan Rumah', product_count: 1 },
];

/** Stand-in for CategoryService while the backend is not ready. */
@Injectable()
export class MockCategoryService extends CategoryService {
  protected override request(): Observable<CategoryDto[]> {
    return of([...MOCK_CATEGORIES]).pipe(delay(MOCK_LATENCY_MS));
  }
}
