import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthSplitLayout } from '../../../shared/layouts/auth-split-layout';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'cv-sso-google',
  imports: [RouterLink, MatButtonModule, AuthSplitLayout],
  templateUrl: './sso-google.html',
})
export class SsoGoogle {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly benefits = ['Secure single sign-on (SSO)', 'No separate CareVerity password'];

  protected continueWithGoogle(): void {
    this.loading.set(true);
    this.error.set('');
    this.auth.signInWithGoogle().subscribe({
      next: ({ requiresMfa }) => {
        this.loading.set(false);
        this.router.navigateByUrl(requiresMfa ? '/auth/mfa' : '/select-workspace');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not complete sign-in. Please try again.');
      },
    });
  }
}
