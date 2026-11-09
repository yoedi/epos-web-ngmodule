import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { RupiahPipe } from './pipes/rupiah.pipe';
import { ConfirmDialogComponent } from './ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from './ui/empty-state/empty-state.component';
import { MoneyInputComponent } from './ui/money-input/money-input.component';
import { PaginationComponent } from './ui/pagination/pagination.component';
import { StockBadgeComponent } from './ui/stock-badge/stock-badge.component';

const ANGULAR_MODULES = [CommonModule, FormsModule, ReactiveFormsModule];
const PRIMENG_MODULES = [
  ButtonModule,
  DialogModule,
  DrawerModule,
  InputTextModule,
  SelectModule,
  SkeletonModule,
  ToastModule,
  ToggleSwitchModule,
];
const SHARED_DECLARATIONS = [
  ConfirmDialogComponent,
  EmptyStateComponent,
  MoneyInputComponent,
  PaginationComponent,
  RupiahPipe,
  StockBadgeComponent,
];

/**
 * Shared UI building blocks for feature modules.
 * No `providers` here: feature modules are lazy loaded, and providers
 * in a shared module would create duplicate service instances.
 */
@NgModule({
  declarations: SHARED_DECLARATIONS,
  imports: [...ANGULAR_MODULES, ...PRIMENG_MODULES],
  exports: [...ANGULAR_MODULES, ...PRIMENG_MODULES, ...SHARED_DECLARATIONS],
})
export class SharedModule {}
