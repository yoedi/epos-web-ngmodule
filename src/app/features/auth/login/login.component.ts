import { AfterViewInit, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../core/http/api-error.model';

type LoginField = 'username' | 'password';

const INVALID_CREDENTIALS_MESSAGE = 'Username atau password salah';
const REQUIRED_MESSAGE: Record<LoginField, string> = {
  username: 'Username wajib diisi',
  password: 'Password wajib diisi',
};

/** Login screen (PRD 9.1). */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  standalone: false,
})
export class LoginComponent implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('usernameInput') private usernameInput?: ElementRef<HTMLInputElement>;

  readonly store = environment.store;
  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submitting = false;
  showPassword = false;
  errorMessage: string | null = null;

  constructor() {
    // Editing either field dismisses the previous login error.
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => (this.errorMessage = null));
  }

  ngAfterViewInit(): void {
    this.usernameInput?.nativeElement.focus();
  }

  fieldError(name: LoginField): string | null {
    const control = this.form.controls[name];
    if (!control.touched || !control.errors) {
      return null;
    }
    const serverMessage: unknown = control.errors['server'];
    return typeof serverMessage === 'string' ? serverMessage : REQUIRED_MESSAGE[name];
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (this.submitting) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.getRawValue();
    this.submitting = true;
    this.errorMessage = null;

    this.auth
      .login(username.trim(), password)
      .pipe(
        finalize(() => (this.submitting = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => this.router.navigateByUrl(this.auth.homeUrlFor(user.role)),
        error: (err: unknown) => this.showError(err),
      });
  }

  private showError(err: unknown): void {
    if (!isAppError(err)) {
      this.errorMessage = UNKNOWN_ERROR_MESSAGE;
      return;
    }
    if (err.code === 'INVALID_CREDENTIALS') {
      this.errorMessage = INVALID_CREDENTIALS_MESSAGE;
      return;
    }
    if (err.code === 'VALIDATION_ERROR' && err.fieldErrors?.length) {
      for (const { field, message } of err.fieldErrors) {
        const control = this.form.get(field);
        control?.setErrors({ server: message });
        control?.markAsTouched();
      }
      return;
    }
    this.errorMessage = err.message;
  }
}
