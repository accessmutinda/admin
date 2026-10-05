import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Alert } from '../../../shared/ui/alert';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/models/role';

@Component({
  selector: 'cv-invite-accept',
  imports: [RouterLink, MatButtonModule, AuthCenteredLayout, Alert],
  templateUrl: './invite-accept.html',
})
export class InviteAccept {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';
  protected readonly invite = this.auth.getInvite(this.token);
  protected readonly roleLabel = computed(() =>
    this.invite ? ROLES[this.invite.roleCode].label : '',
  );
  protected readonly isExpired = this.invite ? new Date(this.invite.expiresAt) < new Date() : true;
  protected readonly daysLeft = this.invite
    ? Math.max(
        0,
        Math.ceil((new Date(this.invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : 0;

  protected readonly loading = signal(false);
  protected readonly declined = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly companyInitials = computed(
    () =>
      this.invite?.workspaceName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('') ?? '',
  );

  protected accept(): void {
    if (!this.invite || this.isExpired || this.loading()) {
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    this.auth.acceptInvite(this.token).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/select-workspace');
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(
          'We couldn’t accept this invitation. Please try again or contact your organisation’s admin.',
        );
      },
    });
  }

  protected decline(): void {
    if (!this.invite || this.isExpired || this.loading()) {
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    this.auth.declineInvite(this.token).subscribe({
      next: () => {
        this.loading.set(false);
        this.declined.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('We couldn’t decline this invitation. Please try again.');
      },
    });
  }
}
