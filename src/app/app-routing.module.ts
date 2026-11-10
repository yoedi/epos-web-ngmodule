import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/auth/auth.guard';
import { RoleGuard } from './core/auth/role.guard';
import { ShellComponent } from './core/layout/shell/shell.component';

const OWNER = { role: 'OWNER' };

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    // Every signed-in page renders inside the shell (sidebar, header, bottom nav).
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'kasir' },
      {
        // Both roles (PRD section 6).
        path: 'kasir',
        loadChildren: () =>
          import('./features/cashier/cashier.module').then((m) => m.CashierModule),
      },
      {
        // Owner only (PRD section 6).
        path: 'dashboard',
        canActivate: [RoleGuard],
        data: OWNER,
        loadChildren: () =>
          import('./features/dashboard/dashboard.module').then((m) => m.DashboardModule),
      },
      {
        // Both roles: the owner sees every sale, the cashier only their own of today (PRD section 6).
        path: 'transaksi',
        loadChildren: () =>
          import('./features/sale-history/sale-history.module').then((m) => m.SaleHistoryModule),
      },
      {
        // Both roles: the owner manages, the cashier only views (PRD section 6).
        path: 'produk',
        loadChildren: () =>
          import('./features/product/product.module').then((m) => m.ProductModule),
      },
      {
        // Both roles: the owner manages, the cashier only views (PRD section 6).
        path: 'kategori',
        loadChildren: () =>
          import('./features/category/category.module').then((m) => m.CategoryModule),
      },
      {
        // Owner only (PRD section 6): /stok/masuk and /stok/penyesuaian. /stok redirects to /stok/masuk.
        path: 'stok',
        canActivate: [RoleGuard],
        data: OWNER,
        loadChildren: () => import('./features/stock/stock.module').then((m) => m.StockModule),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
