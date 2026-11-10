import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SaleHistoryPageComponent } from './components/sale-history-page/sale-history-page.component';

const routes: Routes = [{ path: '', component: SaleHistoryPageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SaleHistoryRoutingModule {}
