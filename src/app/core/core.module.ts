import { CommonModule } from '@angular/common';
import { NgModule, Optional, SkipSelf } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { SkeletonModule } from 'primeng/skeleton';

import { AuthService } from './auth/auth.service';
import { MockAuthService } from './auth/mock-auth.service';
import { BottomNavComponent } from './layout/bottom-nav/bottom-nav.component';
import { HeaderComponent } from './layout/header/header.component';
import { ShellComponent } from './layout/shell/shell.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { MockStoreSettingsService } from './store/mock-store-settings.service';
import { StoreSettingsService } from './store/store-settings.service';

/**
 * App-wide singletons: auth, HTTP interceptors, layout shell.
 * Must be imported by AppModule only.
 */
@NgModule({
  declarations: [ShellComponent, SidebarComponent, HeaderComponent, BottomNavComponent],
  // Not SharedModule: it would pull Forms into the initial bundle for no use here.
  imports: [CommonModule, RouterModule, DrawerModule, SkeletonModule],
  providers: [
    MessageService,
    // Mock mode: remove these lines once the epos-api endpoints are available.
    { provide: AuthService, useClass: MockAuthService },
    { provide: StoreSettingsService, useClass: MockStoreSettingsService },
  ],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parent: CoreModule) {
    if (parent) {
      throw new Error('CoreModule hanya boleh diimpor AppModule');
    }
  }
}
