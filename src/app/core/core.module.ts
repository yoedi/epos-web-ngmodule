import { NgModule, Optional, SkipSelf } from '@angular/core';
import { MessageService } from 'primeng/api';

import { AuthService } from './auth/auth.service';
import { MockAuthService } from './auth/mock-auth.service';

/**
 * App-wide singletons: auth, HTTP interceptors, layout shell.
 * Must be imported by AppModule only.
 */
@NgModule({
  providers: [
    MessageService,
    // Mock mode: remove this line once epos-api /auth endpoints are available.
    { provide: AuthService, useClass: MockAuthService },
  ],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parent: CoreModule) {
    if (parent) {
      throw new Error('CoreModule hanya boleh diimpor AppModule');
    }
  }
}
