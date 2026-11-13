import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { ProductActionsComponent } from './components/product-actions/product-actions.component';
import { ProductCardListComponent } from './components/product-card-list/product-card-list.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { ProductTableComponent } from './components/product-table/product-table.component';
import { ProductRoutingModule } from './product-routing.module';
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
  providers: [ProductService],
})
export class ProductModule {}
