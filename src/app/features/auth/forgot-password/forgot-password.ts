import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Alert } from '../../../shared/ui/alert';
import { Skeleton } from '../../../shared/ui/skeleton';

@Component({
  selector: 'cv-forgot-password',
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
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  protected readonly loading = signal(false);
  protected readonly sent = signal('');
  protected readonly errorMessage = signal('');
  protected readonly form = this.fb.nonNullable.group({
    email: [this.requestedEmail(), [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    this.auth.requestPasswordReset(this.form.controls.email.value).subscribe({
      next: (message) => {
        this.loading.set(false);
        this.sent.set(message);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  private requestedEmail(): string {
    const email = this.route.snapshot.queryParamMap.get('email')?.trim() ?? '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
  }
}
