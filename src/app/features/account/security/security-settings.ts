import { A11yModule } from '@angular/cdk/a11y';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TRUSTED_DEVICES } from '../../../core/auth/fixtures';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/models/role';
import { ManagementRole } from '../../management/shared/role-pill';

@Component({
  selector: 'cv-security-settings',
  imports: [A11yModule, DatePipe, RouterLink, ManagementRole],
  host: { '(document:keydown.escape)': 'details.set(null)' },
  templateUrl: './security-settings.html',
})
export class SecuritySettings {
  protected readonly auth = inject(AuthService);
  protected readonly user = this.auth.currentUser();
  protected readonly role = this.user ? ROLES[this.user.roleCode].label : '';
  protected readonly trustedDeviceCount = TRUSTED_DEVICES.length;
  protected readonly details = signal<'mfa' | 'connections' | null>(null);
}
