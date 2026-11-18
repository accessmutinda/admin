import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Alert } from '../../../shared/ui/alert';
import { Skeleton } from '../../../shared/ui/skeleton';

function passwordsMatch(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { mismatch: true } : null;
  };
}

@Component({
  selector: 'cv-password-reset',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    AuthCenteredLayout,
    Alert,
    Skeleton,
  ],
  templateUrl: './password-reset.html',
})
export class PasswordReset {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly uid = this.route.snapshot.queryParamMap.get('uid') ?? '';
  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly linkReady = !!this.uid && !!this.token;
  protected readonly loading = signal(false);
  protected readonly done = signal('');
  protected readonly errorMessage = signal('');
  protected readonly hidePassword = signal(true);
  protected readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch() },
  );

  protected submit(): void {
    if (!this.linkReady || this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    const { password, confirmPassword } = this.form.getRawValue();
    this.auth.confirmPasswordReset(this.uid, this.token, password, confirmPassword).subscribe({
      next: (message) => {
        this.loading.set(false);
        this.done.set(message);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
