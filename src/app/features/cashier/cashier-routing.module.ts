import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CashierPageComponent } from './presentation/components/cashier-page/cashier-page.component';

const routes: Routes = [{ path: '', component: CashierPageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CashierRoutingModule {}
