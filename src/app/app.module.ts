import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule, CoreModule],
  providers: [
    provideAnimationsAsync(),
    // Enables class-based interceptors registered via HTTP_INTERCEPTORS.
    provideHttpClient(withInterceptorsFromDi()),
    providePrimeNG({ theme: { preset: Aura } }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
