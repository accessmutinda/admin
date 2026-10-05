import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { AuthService } from '../../../core/auth/auth.service';

interface AccessDeniedState {
  requiredRoleLabels?: string[];
}

@Component({
  selector: 'cv-access-denied',
  imports: [MatButtonModule, AuthCenteredLayout],
  templateUrl: './access-denied.html',
})
export class AccessDenied {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly state = (history.state ?? {}) as AccessDeniedState;
  protected readonly requiredRoleLabels = this.state.requiredRoleLabels ?? [];
  protected readonly isSignedIn = this.auth.isAuthenticated();

  protected goToDashboard(): void {
    this.router.navigateByUrl(this.isSignedIn ? '/account/security' : '/auth/sign-in');
  }
}
