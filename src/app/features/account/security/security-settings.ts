import { ModuleDesign } from '../../management/shared/module-design';
import { A11yModule } from '@angular/cdk/a11y';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/models/role';
import { ManagementRole } from '../../management/shared/role-pill';
import { SecurityPageHeader } from './security-page-header';

@Component({
  selector: 'cv-security-settings',
  imports: [ModuleDesign, A11yModule, DatePipe, RouterLink, ManagementRole, SecurityPageHeader],
  host: {
    class: 'module-page operations-page security-page',
    '(document:keydown.escape)': 'details.set(null)',
  },
  templateUrl: './security-settings.html',
  styleUrl: './security-settings.css',
})
export class SecuritySettings {
  protected readonly auth = inject(AuthService);
  protected readonly user = this.auth.currentUser();
  protected readonly role = this.user ? ROLES[this.user.roleCode].label : '';
  protected verificationStatus(): string {
    return this.user?.mfaEnabled == null
      ? 'Verification unavailable'
      : this.user.mfaEnabled
        ? 'Verified'
        : 'Not verified';
  }
  protected verificationMethod(): string {
    if (this.user?.mfaMethod === 'authenticator') return 'Authenticator app';
    if (this.user?.mfaMethod === 'sms') return 'SMS verification';
    return 'Method unavailable';
  }
  protected readonly details = signal<'mfa' | 'connections' | null>(null);
}
