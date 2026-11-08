import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Role } from '../core/auth/auth.models';
import { AuthService } from '../core/auth/auth.service';

const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Pemilik',
  CASHIER: 'Kasir',
};

/**
 * TEMPORARY: stands in for /kasir and /dashboard so the post-login redirect
 * can be tested. Delete once the cashier and dashboard features are built.
 */
@Component({
  selector: 'app-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrl: './placeholder.component.css',
  standalone: false,
})
export class PlaceholderComponent {
  private readonly auth = inject(AuthService);

  readonly title: string = inject(ActivatedRoute).snapshot.data['title'] ?? '';
  readonly user$ = this.auth.currentUser$;
  readonly roleLabel = ROLE_LABEL;

  logout(): void {
    this.auth.logout();
  }
}
