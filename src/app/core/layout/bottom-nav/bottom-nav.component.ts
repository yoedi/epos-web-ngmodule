import { Component, EventEmitter, Input, Output } from '@angular/core';

import { initials } from '../../../shared/utils/initials';
import { ROLE_LABEL, User } from '../../auth/auth.models';
import { NavItem } from '../nav-menu';

/**
 * Phone navigation (<768px, PRD section 7): main menus as tabs, plus
 * "Lainnya" opening a bottom sheet with the remaining links, profile and Keluar.
 */
@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.css',
  standalone: false,
})
export class BottomNavComponent {
  @Input() items: NavItem[] = [];
  @Input() moreItems: NavItem[] = [];
  @Input() user: User | null = null;
  @Output() readonly logout = new EventEmitter<void>();

  readonly roleLabel = ROLE_LABEL;
  readonly initials = initials;
  moreOpen = false;

  openMore(): void {
    this.moreOpen = true;
  }

  closeMore(): void {
    this.moreOpen = false;
  }

  onLogout(): void {
    this.moreOpen = false;
    this.logout.emit();
  }
}
