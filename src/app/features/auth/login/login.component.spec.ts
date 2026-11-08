import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';

import { Role, User } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { AppError } from '../../../core/http/api-error.model';
import { SharedModule } from '../../../shared/shared.module';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  const rina: User = { id: 2, name: 'Rina Lestari', username: 'rina', role: 'CASHIER' };
  const budi: User = { id: 1, name: 'Budi Santoso', username: 'budi', role: 'OWNER' };

  const el = (selector: string) =>
    fixture.debugElement.query(By.css(selector))?.nativeElement as HTMLElement | undefined;

  function fillAndSubmit(username: string, password: string): void {
    fixture.componentInstance.form.setValue({ username, password });
    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'homeUrlFor']);
    auth.homeUrlFor.and.callFake((role: Role) => (role === 'OWNER' ? '/dashboard' : '/kasir'));

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [SharedModule],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('shows the store name and focuses username', () => {
    expect(el('.brand__name')?.textContent).toContain('Toko Berkah Jaya');
    expect(document.activeElement?.id).toBe('username');
  });

  it('shows field messages and does not call login when empty', () => {
    fillAndSubmit('', '');

    expect(el('#username-error')?.textContent).toContain('Username wajib diisi');
    expect(el('#password-error')?.textContent).toContain('Password wajib diisi');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('disables the button while loading, then redirects a cashier to /kasir', () => {
    const response = new Subject<User>();
    auth.login.and.returnValue(response);

    fillAndSubmit('rina', 'rahasia123');
    const button = el('button[type=submit]') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();

    // A second submit while loading is ignored.
    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', null);
    expect(auth.login).toHaveBeenCalledTimes(1);

    response.next(rina);
    response.complete();
    fixture.detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/kasir');
    expect(button.disabled).toBeFalse();
  });

  it('redirects an owner to /dashboard', () => {
    const response = new Subject<User>();
    auth.login.and.returnValue(response);
    fillAndSubmit('budi', 'rahasia123');
    response.next(budi);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows the error under the form on wrong credentials', () => {
    const error: AppError = { code: 'INVALID_CREDENTIALS', message: 'x', status: 401 };
    auth.login.and.returnValue(throwError(() => error));

    fillAndSubmit('rina', 'salah');

    expect(el('[role=alert]')?.textContent).toContain('Username atau password salah');
    expect((el('button[type=submit]') as HTMLButtonElement).disabled).toBeFalse();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('toggles password visibility', () => {
    const input = el('#password') as HTMLInputElement;
    const toggle = el('.field__toggle') as HTMLButtonElement;
    expect(input.type).toBe('password');

    toggle.click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Sembunyikan password');
  });
});
