import { LOCALE_ID, NgModule } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { ToastModule } from 'primeng/toast';
import Aura from '@primeng/themes/aura';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { AuthInterceptor } from './core/http/auth.interceptor';
import { ErrorInterceptor } from './core/http/error.interceptor';
import { PlaceholderComponent } from './placeholder/placeholder.component';

// Indonesian month names for DatePipe: "18 Sep 2026, 14:32" (PRD section 7).
registerLocaleData(localeId);

@NgModule({
  declarations: [AppComponent, PlaceholderComponent],
  imports: [BrowserModule, AppRoutingModule, CoreModule, ToastModule],
  providers: [
    { provide: LOCALE_ID, useValue: 'id' },
    provideAnimationsAsync(),
    // Enables class-based interceptors registered via HTTP_INTERCEPTORS.
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    providePrimeNG({ theme: { preset: Aura } }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
