import { Component, EventEmitter, Input, Output } from '@angular/core';
import { map, shareReplay, timer } from 'rxjs';

import { initials } from '../../../shared/utils/initials';
import { ROLE_LABEL, User } from '../../auth/auth.models';
import { StoreState } from '../shell/shell.component';

/** The clock shows minutes; checking every 10 s keeps it at most 10 s late. */
const CLOCK_TICK_MS = 10_000;

/** Top bar: store identity, date-time, signed-in user, Keluar. */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  standalone: false,
})
export class HeaderComponent {
  @Input({ required: true }) store!: StoreState;
  @Input() user: User | null = null;
  @Output() readonly retryStore = new EventEmitter<void>();
  @Output() readonly logout = new EventEmitter<void>();

  readonly roleLabel = ROLE_LABEL;
  readonly initials = initials;
  readonly now$ = timer(0, CLOCK_TICK_MS).pipe(
    map(() => new Date()),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
