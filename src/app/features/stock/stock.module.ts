import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { StockAdjustmentHistoryComponent } from './components/stock-adjustment-history/stock-adjustment-history.component';
import { StockAdjustmentPageComponent } from './components/stock-adjustment-page/stock-adjustment-page.component';
import { StockInHistoryComponent } from './components/stock-in-history/stock-in-history.component';
import { StockInPageComponent } from './components/stock-in-page/stock-in-page.component';
import { StockInTableComponent } from './components/stock-in-table/stock-in-table.component';
import { StockProductPickerComponent } from './components/stock-product-picker/stock-product-picker.component';
import { MockStockService } from './services/mock-stock.service';
import { StockService } from './services/stock.service';
import { StockRoutingModule } from './stock-routing.module';

@NgModule({
  declarations: [
    StockAdjustmentHistoryComponent,
    StockAdjustmentPageComponent,
    StockInHistoryComponent,
    StockInPageComponent,
    StockInTableComponent,
    StockProductPickerComponent,
  ],
  imports: [SharedModule, StockRoutingModule],
  providers: [
    // Mock mode: use plain `StockService` once the epos-api endpoints are available.
    { provide: StockService, useClass: MockStockService },
  ],
})
export class StockModule {}
