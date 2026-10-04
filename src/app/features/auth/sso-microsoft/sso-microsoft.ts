import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Logo } from '../../../shared/ui/logo';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'cv-sso-microsoft',
  imports: [RouterLink, MatButtonModule, Logo],
  templateUrl: './sso-microsoft.html',
})
export class SsoMicrosoft {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly benefits = [
    'Secure single sign-on (SSO)',
    'No additional passwords',
    "Works with your organisation's account",
  ];

  protected continueWithMicrosoft(): void {
    this.loading.set(true);
    this.auth.signInWithMicrosoft().subscribe(() => {
      this.loading.set(false);
      this.router.navigateByUrl('/select-workspace');
    });
  }
}
