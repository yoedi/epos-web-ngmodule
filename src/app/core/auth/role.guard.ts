import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';

import { Role } from './auth.models';
import { AuthService } from './auth.service';

/**
 * Restricts a route to the role in `data: { role }`.
 * Users with another role are sent to their own home page.
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredRole = route.data['role'] as Role | undefined;
    return this.auth.ensureUser().pipe(
      map((user) => {
        if (!user) {
          return this.router.createUrlTree(['/login']);
        }
        if (!requiredRole || user.role === requiredRole) {
          return true;
        }
        return this.router.parseUrl(this.auth.homeUrlFor(user.role));
      }),
    );
  }
}
