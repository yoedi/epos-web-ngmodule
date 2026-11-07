import { NgModule, Optional, SkipSelf } from '@angular/core';

/**
 * App-wide singletons: auth, HTTP interceptors, layout shell.
 * Must be imported by AppModule only.
 */
@NgModule({})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parent: CoreModule) {
    if (parent) {
      throw new Error('CoreModule hanya boleh diimpor AppModule');
    }
  }
}
