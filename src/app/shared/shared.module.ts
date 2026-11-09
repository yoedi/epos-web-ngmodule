import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';

const ANGULAR_MODULES = [CommonModule, FormsModule, ReactiveFormsModule];
const PRIMENG_MODULES = [ButtonModule, InputTextModule, SkeletonModule, ToastModule];

/**
 * Shared UI building blocks for feature modules.
 * No `providers` here: feature modules are lazy loaded, and providers
 * in a shared module would create duplicate service instances.
 */
@NgModule({
  declarations: [],
  imports: [...ANGULAR_MODULES, ...PRIMENG_MODULES],
  exports: [...ANGULAR_MODULES, ...PRIMENG_MODULES],
})
export class SharedModule {}
