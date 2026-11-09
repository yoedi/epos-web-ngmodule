import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { StoreSettings, StoreSettingsDto, toStoreSettings } from './store-settings.models';

/**
 * Reads the store identity (GET /store-settings). Used by the shell header
 * and, later, by receipt printing. A mock subclass overrides `request()`.
 */
@Injectable({ providedIn: 'root' })
export class StoreSettingsService {
  protected readonly http = inject(HttpClient);

  load(): Observable<StoreSettings> {
    return this.request().pipe(map(toStoreSettings));
  }

  protected request(): Observable<StoreSettingsDto> {
    return this.http.get<StoreSettingsDto>(`${environment.apiUrl}/store-settings`);
  }
}
