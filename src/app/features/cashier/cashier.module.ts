import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { AddToCartUseCase } from './application/add-to-cart.use-case';
import { CheckoutUseCase } from './application/checkout.use-case';
import { ScanBarcodeUseCase } from './application/scan-barcode.use-case';
import { SearchProductsUseCase } from './application/search-products.use-case';
import { CashierRoutingModule } from './cashier-routing.module';
import { ProductCatalogHttpRepository } from './data/repositories/product-catalog-http.repository';
import { SaleHttpRepository } from './data/repositories/sale-http.repository';
import { ProductCatalogRepository } from './domain/repositories/product-catalog.repository';
import { SaleRepository } from './domain/repositories/sale.repository';
import { CartSummaryComponent } from './presentation/components/cart-summary/cart-summary.component';
import { CartTableComponent } from './presentation/components/cart-table/cart-table.component';
import { CashierPageComponent } from './presentation/components/cashier-page/cashier-page.component';
import { PaymentMethodComponent } from './presentation/components/payment-method/payment-method.component';
import { PaymentModalComponent } from './presentation/components/payment-modal/payment-modal.component';
import { ProductSearchComponent } from './presentation/components/product-search/product-search.component';
import { ReceiptPrintComponent } from './presentation/components/receipt-print/receipt-print.component';
import { SuccessPanelComponent } from './presentation/components/success-panel/success-panel.component';

/** Layar Kasir (PRD 9.2) and the printed receipt (PRD 9.3). */
@NgModule({
  declarations: [
    CartSummaryComponent,
    CartTableComponent,
    CashierPageComponent,
    PaymentMethodComponent,
    PaymentModalComponent,
    ProductSearchComponent,
    ReceiptPrintComponent,
    SuccessPanelComponent,
  ],
  imports: [SharedModule, CashierRoutingModule],
  providers: [
    { provide: SaleRepository, useClass: SaleHttpRepository },
    { provide: ProductCatalogRepository, useClass: ProductCatalogHttpRepository },
    AddToCartUseCase,
    CheckoutUseCase,
    ScanBarcodeUseCase,
    SearchProductsUseCase,
  ],
})
export class CashierModule {}
