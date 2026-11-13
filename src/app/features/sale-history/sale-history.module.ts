import { NgModule } from '@angular/core';
import { DatePickerModule } from 'primeng/datepicker';

import { SharedModule } from '../../shared/shared.module';
import { SaleCardListComponent } from './components/sale-card-list/sale-card-list.component';
import { SaleHistoryPageComponent } from './components/sale-history-page/sale-history-page.component';
import { SaleReceiptPrintComponent } from './components/sale-receipt-print/sale-receipt-print.component';
import { SaleReceiptComponent } from './components/sale-receipt/sale-receipt.component';
import { SaleTableComponent } from './components/sale-table/sale-table.component';
import { SaleHistoryRoutingModule } from './sale-history-routing.module';
import { SaleHistoryService } from './services/sale-history.service';
import { UserService } from './services/user.service';

@NgModule({
  declarations: [
    SaleCardListComponent,
    SaleHistoryPageComponent,
    SaleReceiptComponent,
    SaleReceiptPrintComponent,
    SaleTableComponent,
  ],
  // DatePicker is only used here so far; move it to SharedModule once a second feature needs it.
  imports: [SharedModule, DatePickerModule, SaleHistoryRoutingModule],
  providers: [SaleHistoryService, UserService],
})
export class SaleHistoryModule {}
