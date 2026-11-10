import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { CategoryRoutingModule } from './category-routing.module';
import { CategoryFormComponent } from './components/category-form/category-form.component';
import { CategoryListComponent } from './components/category-list/category-list.component';
import { CategoryTableComponent } from './components/category-table/category-table.component';
import { CategoryService } from './services/category.service';
import { MockCategoryService } from './services/mock-category.service';

@NgModule({
  declarations: [CategoryFormComponent, CategoryListComponent, CategoryTableComponent],
  imports: [SharedModule, CategoryRoutingModule],
  providers: [
    // Mock mode: remove this line once the epos-api endpoints are available.
    { provide: CategoryService, useClass: MockCategoryService },
  ],
})
export class CategoryModule {}
