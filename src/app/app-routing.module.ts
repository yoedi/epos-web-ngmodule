import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/auth/auth.guard';
import { RoleGuard } from './core/auth/role.guard';
import { ShellComponent } from './core/layout/shell/shell.component';
import { PlaceholderComponent } from './placeholder/placeholder.component';

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
      // Placeholders until each feature module exists; swap for loadChildren.
      {
        path: 'dashboard',
        component: PlaceholderComponent,
        canActivate: [RoleGuard],
        data: { title: 'Dashboard', ...OWNER },
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
        path: 'stok',
        canActivate: [RoleGuard],
        data: OWNER,
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'masuk' },
          { path: 'masuk', component: PlaceholderComponent, data: { title: 'Stok Masuk' } },
          {
            path: 'penyesuaian',
            component: PlaceholderComponent,
            data: { title: 'Penyesuaian Stok' },
          },
        ],
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
