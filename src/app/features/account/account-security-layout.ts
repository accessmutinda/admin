import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Logo } from '../../shared/ui/logo';
import { RoleBadge } from '../../shared/ui/role-badge';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceService } from '../../core/auth/workspace.service';

interface SubNavItem {
  label: string;
  icon: string;
  link: string | null;
}

@Component({
  selector: 'cv-account-security-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Logo, RoleBadge],
  templateUrl: './account-security-layout.html',
})
export class AccountSecurityLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly workspaceSvc = inject(WorkspaceService);

  protected readonly user = this.auth.currentUser();

  protected readonly navItems: SubNavItem[] = [
    { label: 'Profile', icon: 'person', link: null },
    { label: 'Security', icon: 'lock', link: '.' },
    { label: 'Devices', icon: 'devices', link: null },
    { label: 'Connected accounts', icon: 'link', link: null },
    { label: 'Notifications', icon: 'notifications', link: null },
    { label: 'Preferences', icon: 'tune', link: null },
  ];

  protected switchWorkspace(): void {
    this.router.navigateByUrl('/select-workspace');
  }

  protected signOut(): void {
    this.auth.signOut();
    this.router.navigateByUrl('/auth/sign-in');
  }
}
