import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthCenteredLayout } from '../../shared/layouts/auth-centered-layout';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'cv-not-found',
  imports: [MatButtonModule, AuthCenteredLayout],
  templateUrl: './not-found.html',
})
export class NotFound {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected goHome(): void {
    this.router.navigateByUrl(this.auth.isAuthenticated() ? '/account/security' : '/auth/sign-in');
  }
}
