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
      // Placeholders until each feature module exists; swap for loadChildren.
      { path: 'kasir', component: PlaceholderComponent, data: { title: 'Kasir' } },
      {
        path: 'dashboard',
        component: PlaceholderComponent,
        canActivate: [RoleGuard],
        data: { title: 'Dashboard', ...OWNER },
      },
      { path: 'transaksi', component: PlaceholderComponent, data: { title: 'Riwayat Transaksi' } },
      {
        // Both roles: the owner manages, the cashier only views (PRD section 6).
        path: 'produk',
        loadChildren: () =>
          import('./features/product/product.module').then((m) => m.ProductModule),
      },
      { path: 'kategori', component: PlaceholderComponent, data: { title: 'Kategori' } },
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
