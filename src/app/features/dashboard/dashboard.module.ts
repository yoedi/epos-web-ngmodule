import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { DashboardPageComponent } from './components/dashboard-page/dashboard-page.component';
import { HourlySalesChartComponent } from './components/hourly-sales-chart/hourly-sales-chart.component';
import { LowStockListComponent } from './components/low-stock-list/low-stock-list.component';
import { TopProductsListComponent } from './components/top-products-list/top-products-list.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardService } from './services/dashboard.service';
import { MockDashboardService } from './services/mock-dashboard.service';

@NgModule({
  declarations: [
    DashboardPageComponent,
    HourlySalesChartComponent,
    LowStockListComponent,
    TopProductsListComponent,
  ],
  imports: [SharedModule, DashboardRoutingModule],
  providers: [
    // Mock mode: use plain `DashboardService` once GET /reports/daily is available.
    { provide: DashboardService, useClass: MockDashboardService },
  ],
})
export class DashboardModule {}
