import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { CategoryRoutingModule } from './category-routing.module';
import { CategoryFormComponent } from './components/category-form/category-form.component';
import { CategoryListComponent } from './components/category-list/category-list.component';
import { CategoryTableComponent } from './components/category-table/category-table.component';

@NgModule({
  declarations: [CategoryFormComponent, CategoryListComponent, CategoryTableComponent],
  imports: [SharedModule, CategoryRoutingModule],
})
export class CategoryModule {}
