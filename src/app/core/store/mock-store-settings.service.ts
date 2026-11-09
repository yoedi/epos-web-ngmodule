import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { StoreSettingsDto } from './store-settings.models';
import { StoreSettingsService } from './store-settings.service';

const MOCK_LATENCY_MS = 400;

/** Sample store from PRD section 12 and docs/api-spec.md section 7. */
const MOCK_STORE: StoreSettingsDto = {
  store_name: 'Toko Berkah Jaya',
  address: 'Jl. Kaliurang Km 5, Yogyakarta',
  phone: '0274-123456',
  receipt_footer: 'Terima kasih, selamat belanja kembali',
};

/**
 * Stand-in for StoreSettingsService while the backend is not ready.
 * Registered in CoreModule providers.
 */
@Injectable()
export class MockStoreSettingsService extends StoreSettingsService {
  protected override request(): Observable<StoreSettingsDto> {
    return of(MOCK_STORE).pipe(delay(MOCK_LATENCY_MS));
  }
}
