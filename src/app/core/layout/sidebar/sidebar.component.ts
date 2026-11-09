import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, fromEvent, map, merge, of } from 'rxjs';

import { initials } from '../../../shared/utils/initials';
import { NavItem, entryLink, isActive } from '../nav-menu';

const APP_VERSION = 'v1.0';

/** Collapsible left menu for laptop (208px) and tablet (60px, icons only). */
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  standalone: false,
})
export class SidebarComponent implements OnChanges {
  private readonly router = inject(Router);

  @Input() items: NavItem[] = [];
  @Input() collapsed = false;
  /** False on tablet, where icon mode is forced. */
  @Input() canToggle = true;
  @Input() storeName: string | null = null;
  @Output() readonly toggleCollapsed = new EventEmitter<void>();

  readonly version = APP_VERSION;
  readonly entryLink = entryLink;
  readonly connection$ = merge(
    of(navigator.onLine),
    fromEvent(window, 'online').pipe(map(() => true)),
    fromEvent(window, 'offline').pipe(map(() => false)),
  ).pipe(map((online) => ({ online, label: online ? 'Online' : 'Offline' })));

  currentUrl = this.router.url;
  private readonly expanded = new Set<NavItem>();

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.currentUrl = e.urlAfterRedirects;
        this.expandActiveGroup();
      });
  }

  ngOnChanges(): void {
    // Items arrive after the user loads; open the group of the current page.
    this.expandActiveGroup();
  }

  get storeInitials(): string {
    return this.storeName ? initials(this.storeName) : '';
  }

  isActive(item: NavItem): boolean {
    return isActive(item, this.currentUrl);
  }

  isExpanded(group: NavItem): boolean {
    return this.expanded.has(group);
  }

  toggleGroup(group: NavItem): void {
    if (this.expanded.has(group)) {
      this.expanded.delete(group);
    } else {
      this.expanded.add(group);
    }
  }

  private expandActiveGroup(): void {
    for (const item of this.items) {
      if (item.children && this.isActive(item)) {
        this.expanded.add(item);
      }
    }
  }
}
