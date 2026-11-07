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
  protected readonly entryState = this.auth.profile()?.company_entry_state;
  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/auth/sign-in');
  }
  protected readonly isSignedIn = this.auth.isAuthenticated();

  protected goToDashboard(): void {
    this.router.navigateByUrl(this.isSignedIn ? '/account/security' : '/auth/sign-in');
  }
}
