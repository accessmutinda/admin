import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TRUSTED_DEVICES } from '../../../core/auth/fixtures';
import { AuthService } from '../../../core/auth/auth.service';
import { Skeleton } from '../../../shared/ui/skeleton';

interface SecurityRow {
  label: string;
  icon: string;
  value: string;
  action: string;
  onAction?: () => void;
}

@Component({
  selector: 'cv-security-settings',
  imports: [Skeleton],
  templateUrl: './security-settings.html',
})
export class SecuritySettings implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly skeletonRows = Array.from({ length: 5 });
  protected readonly user = this.auth.currentUser();
  protected readonly trustedDeviceCount = TRUSTED_DEVICES.length;

  ngOnInit(): void {
    setTimeout(() => this.loading.set(false), 400);
  }

  protected readonly rows: SecurityRow[] = [
    {
      label: 'Password',
      icon: 'key',
      value: 'Last changed 12 Mar 2025',
      action: 'Change',
      onAction: () => this.router.navigateByUrl('/account/change-password'),
    },
    {
      label: 'Multi-factor authentication',
      icon: 'verified_user',
      value: `Enabled (${this.user?.mfaMethod === 'authenticator' ? 'Authenticator app' : 'SMS'})`,
      action: 'Manage',
      onAction: () => this.router.navigateByUrl('/auth/mfa'),
    },
    {
      label: 'Trusted devices',
      icon: 'devices',
      value: `${this.trustedDeviceCount} trusted devices`,
      action: 'View devices',
      onAction: () => this.router.navigateByUrl('/account/security/login-history'),
    },
    {
      label: 'Active sessions',
      icon: 'history',
      value: '1 active session',
      action: 'Manage',
      onAction: () => this.router.navigateByUrl('/account/security/login-history'),
    },
    {
      label: 'Connected accounts',
      icon: 'link',
      value: 'Microsoft (work account)',
      action: 'Manage',
    },
  ];
}
