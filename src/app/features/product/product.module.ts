import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { CategoryService } from '../category/services/category.service';
import { MockCategoryService } from '../category/services/mock-category.service';
import { ProductActionsComponent } from './components/product-actions/product-actions.component';
import { ProductCardListComponent } from './components/product-card-list/product-card-list.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { ProductTableComponent } from './components/product-table/product-table.component';
import { ProductRoutingModule } from './product-routing.module';
import { MockProductService } from './services/mock-product.service';
import { ProductService } from './services/product.service';

@NgModule({
  declarations: [
    ProductActionsComponent,
    ProductCardListComponent,
    ProductFormComponent,
    ProductListComponent,
    ProductTableComponent,
  ],
  imports: [SharedModule, ProductRoutingModule],
  providers: [
    // Mock mode: use plain `ProductService` and remove the CategoryService line
    // once the epos-api endpoints are available.
    { provide: ProductService, useClass: MockProductService },
    { provide: CategoryService, useClass: MockCategoryService },
  ],
})
export class ProductModule {}
