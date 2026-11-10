import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { StockAdjustmentPageComponent } from './components/stock-adjustment-page/stock-adjustment-page.component';
import { StockInPageComponent } from './components/stock-in-page/stock-in-page.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'masuk' },
  { path: 'masuk', component: StockInPageComponent },
  { path: 'penyesuaian', component: StockAdjustmentPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StockRoutingModule {}
