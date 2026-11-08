import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/auth/auth.guard';
import { RoleGuard } from './core/auth/role.guard';
import { PlaceholderComponent } from './placeholder/placeholder.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'kasir' },
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.module').then((m) => m.AuthModule),
  },
  // Temporary placeholders until the cashier and dashboard features exist.
  {
    path: 'kasir',
    component: PlaceholderComponent,
    canActivate: [AuthGuard],
    data: { title: 'Kasir' },
  },
  {
    path: 'dashboard',
    component: PlaceholderComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { title: 'Dashboard', role: 'OWNER' },
  },
  { path: '**', redirectTo: 'kasir' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
