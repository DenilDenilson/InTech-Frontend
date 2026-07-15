import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { LoginCredentials } from '../../../../core/models/auth';
import { AuthService } from '../../../../core/services/auth.service';
import { getSafeReturnUrl } from '../../../../shared/utils/safe-return-url';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.html',
})
export class LoginPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly returnUrl: string;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {
    this.returnUrl = getSafeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  }

  login(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    const rawCredentials = this.form.getRawValue();
    const credentials: LoginCredentials = {
      username: rawCredentials.username.trim(),
      password: rawCredentials.password,
    };

    if (!credentials.username) {
      this.form.controls.username.setErrors({ required: true });
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.authService
      .login(credentials)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getLoginErrorMessage(error));
        },
      });
  }

  isInvalid(controlName: 'username' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private getLoginErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'El backend devolvió una respuesta inválida. Intenta nuevamente.';
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el backend. Intenta nuevamente en unos momentos.';
    }

    if (error.status === 401) {
      return 'Usuario o contraseña incorrectos.';
    }

    if (error.status === 429) {
      return 'Demasiados intentos. Espera unos segundos antes de volver a intentar.';
    }

    return 'No se pudo iniciar sesión. Intenta nuevamente.';
  }
}
