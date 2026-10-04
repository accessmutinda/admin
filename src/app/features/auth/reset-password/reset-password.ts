import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Alert } from '../../../shared/ui/alert';
import { AuthService } from '../../../core/auth/auth.service';

function passwordsMatch(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { mismatch: true } : null;
  };
}

@Component({
  selector: 'cv-reset-password',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    AuthCenteredLayout,
    Alert,
  ],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly done = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly hideCurrentPassword = signal(true);
  protected readonly hidePassword = signal(true);
  protected readonly passwordFocused = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/[0-9]/), Validators.pattern(/[A-Z]/)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch() },
  );

  protected readonly rules = [
    { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
    { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
    { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
    { label: 'One special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
  ];

  private static readonly STRENGTH_META = [
    { label: 'Too weak', barClass: 'bg-error', textClass: 'text-error' },
    { label: 'Weak', barClass: 'bg-error', textClass: 'text-error' },
    { label: 'Fair', barClass: 'bg-warning', textClass: 'text-warning' },
    { label: 'Good', barClass: 'bg-teal', textClass: 'text-teal' },
    { label: 'Strong', barClass: 'bg-success', textClass: 'text-success' },
  ];

  protected ruleMet(test: (v: string) => boolean): boolean {
    return test(this.form.controls.password.value);
  }

  protected strengthScore(): number {
    const value = this.form.controls.password.value;
    if (!value) {
      return 0;
    }
    return this.rules.filter((rule) => rule.test(value)).length;
  }

  protected strengthMeta() {
    return ResetPassword.STRENGTH_META[this.strengthScore()];
  }

  protected confirmMatches(): boolean {
    const { password, confirmPassword } = this.form.controls;
    return !!confirmPassword.value && confirmPassword.value === password.value;
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    const { currentPassword, password } = this.form.getRawValue();
    this.auth.resetPassword(currentPassword, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
        setTimeout(() => this.router.navigateByUrl('/account/security'), 2200);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
