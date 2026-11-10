import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { StockInPageComponent } from './components/stock-in-page/stock-in-page.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'masuk' },
  { path: 'masuk', component: StockInPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StockRoutingModule {}
