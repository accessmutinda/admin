import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Skeleton } from '../../../shared/ui/skeleton';
import { AuthSplitLayout } from '../../../shared/layouts/auth-split-layout';
import { Alert } from '../../../shared/ui/alert';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'cv-sign-in',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    Skeleton,
    AuthSplitLayout,
    Alert,
  ],
  templateUrl: './sign-in.html',
})
export class SignIn {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly returnTo = this.route.snapshot.queryParamMap.get('redirectTo');

  protected readonly sessionError = this.auth.sessionError;
  protected retrySignOut(): void {
    this.auth.signOut();
  }
  protected readonly hidePassword = signal(true);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();

    this.auth.signIn(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.auth.nextRoute(this.returnTo)], {
          queryParams: this.auth.isAuthenticated() ? {} : { redirectTo: this.returnTo },
        });
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
