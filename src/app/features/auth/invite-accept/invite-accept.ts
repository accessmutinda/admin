import { Skeleton } from '../../../shared/ui/skeleton';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Alert } from '../../../shared/ui/alert';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'cv-invite-accept',
  imports: [Skeleton, RouterLink, MatButtonModule, AuthCenteredLayout, Alert],
  templateUrl: './invite-accept.html',
})
export class InviteAccept {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';
  protected readonly returnTo = '/auth/invite/' + encodeURIComponent(this.token);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected accept(): void {
    if (!this.auth.isAuthenticated() || this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.auth.acceptInvite(this.token).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(this.auth.nextRoute());
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.errorMessage.set(error.message);
      },
    });
  }
}
