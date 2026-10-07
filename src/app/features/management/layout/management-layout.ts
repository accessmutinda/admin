import { A11yModule } from '@angular/cdk/a11y';
import { MAT_SELECT_CONFIG } from '@angular/material/select';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ROLES } from '../../../core/auth/models/role';
import { ManagementRole } from '../shared/role-pill';
import { AuthService } from '../../../core/auth/auth.service';
import { Logo } from '../../../shared/ui/logo';
import { ManagementStore } from '../shared/management.store';
import { FINANCE_AREAS } from '../payroll/finance/finance-navigation';
@Component({
  selector: 'cv-management-layout',
  providers: [{ provide: MAT_SELECT_CONFIG, useValue: { overlayPanelClass: 'cv-select-overlay' } }],
  imports: [ManagementRole, A11yModule, RouterOutlet, RouterLink, RouterLinkActive, Logo],
  template: ` <div class="cv-management">
    <a class="skip-link" href="#main-content">Skip to content</a>
    @if (menuOpen()) {
      <button
        class="nav-scrim"
        aria-label="Close navigation"
        (click)="menuOpen.set(false)"
      ></button>
    }
    <aside
      class="app-sidebar"
      [class.is-open]="menuOpen()"
      [attr.inert]="mobile()?.matches && !menuOpen() ? '' : null"
      [cdkTrapFocus]="!!mobile()?.matches && menuOpen()"
      [cdkTrapFocusAutoCapture]="!!mobile()?.matches && menuOpen()"
      (keydown.escape)="menuOpen.set(false)"
    >
      <a routerLink="/manage/companies" class="sidebar-logo" aria-label="CareVerity home"
        ><cv-logo tone="light"
      /></a>
      <button class="workspace-control" (click)="switchWorkspace()">
        <span class="workspace-mark">{{ store.company()?.code }}</span
        ><span class="workspace-text"
          ><strong>{{ store.company()?.name }}</strong
          ><small>Switch workspace</small></span
        ><span class="material-symbols-outlined" aria-hidden="true">unfold_more</span>
      </button>
      <p class="nav-label">ORGANISATION</p>
      @for (item of organisation; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span
          >{{ item.label }}</a
        >
      }
      <p class="nav-label">PEOPLE & DEVELOPMENT</p>
      @for (item of people; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span
          >{{ item.label }}</a
        >
      }
      @if (store.company()?.modules.includes('Care delivery')) {
        <p class="nav-label">CARE DELIVERY</p>
        <a routerLink="/manage/clients" routerLinkActive="active" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">folder_shared</span>Client
          files</a
        >

        <a routerLink="/manage/rota" routerLinkActive="active" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">calendar_month</span>Rota &
          shifts</a
        >
      }
      @if (store.company()?.modules.includes('Care delivery')) {
        <a routerLink="/manage/ecm" routerLinkActive="active" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">monitor_heart</span>Live ECM
          board</a
        >
      }
      @if (store.company()?.modules.includes('Quality & compliance')) {
        <p class="nav-label">SUPERVISION & QUALITY</p>
        <a routerLink="/manage/supervisor" routerLinkActive="active" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">supervisor_account</span
          >Supervisor dashboard</a
        >
        <a routerLink="/manage/quality" routerLinkActive="active" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">verified</span>Quality & QA</a
        >
      }
      @if (store.company()?.modules.includes('Finance')) {
        <p class="nav-label">FINANCE</p>
        @for (item of finance; track item.key) {
          <a
            [routerLink]="['/manage/finance', item.key]"
            [attr.data-finance-area]="item.key"
            routerLinkActive="active"
            ariaCurrentWhenActive="page"
            (click)="menuOpen.set(false)"
            ><span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span
            >{{ item.label }}</a
          >
        }
      }
      <div class="sidebar-bottom">
        <span class="demo-label"><span></span> Demo workspace</span
        ><a
          routerLink="/account/security"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">lock</span>Account security</a
        ><button (click)="signOut()">
          <span class="material-symbols-outlined" aria-hidden="true">logout</span>Sign out
        </button>
      </div>
    </aside>
    <div class="app-body">
      <header class="app-header">
        <div class="header-left">
          <button
            class="icon-button mobile-menu"
            aria-label="Open navigation"
            (click)="menuOpen.set(true)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">menu</span></button
          ><span class="header-breadcrumb"
            >Workspace <span>/</span> <strong>{{ store.company()?.name }}</strong></span
          >
        </div>
        <a routerLink="/account/security" class="user-control" aria-label="Account settings"
          ><span class="avatar small">{{ auth.currentUser()?.initials }}</span
          ><span
            >{{ auth.currentUser()?.name
            }}<small><cv-management-role [label]="userRole()" /></small></span
          ><span class="material-symbols-outlined" aria-hidden="true">expand_more</span></a
        >
      </header>
      <main id="main-content" tabindex="-1" class="page-content"><router-outlet /></main>
      <footer class="app-footer">
        <span>CareVerity <span class="footer-dot">·</span> People. Purpose. Progress.</span
        ><span role="status">{{
          store.storageAvailable()
            ? 'Changes saved on this device'
            : 'Storage is full · changes are held for this session'
        }}</span>
      </footer>
    </div>
  </div>`,
})
export class ManagementLayout {
  protected readonly auth = inject(AuthService);
  protected readonly userRole = computed(
    () => ROLES[this.auth.currentUser()?.roleCode ?? 'CW'].label,
  );
  protected readonly store = inject(ManagementStore);
  private readonly router = inject(Router);
  protected readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 1023px)'));
  protected readonly menuOpen = signal(false);
  protected readonly finance = FINANCE_AREAS;
  protected readonly organisation = [
    { path: '/manage/companies', label: 'Companies', icon: 'domain' },
    { path: '/manage/access', label: 'Users & access', icon: 'admin_panel_settings' },
    { path: '/manage/workflows', label: 'Approval workflows', icon: 'account_tree' },
    { path: '/manage/settings', label: 'Integrations & data', icon: 'settings' },
  ];
  protected readonly people = [
    { path: '/manage/recruitment', label: 'Recruitment', icon: 'person_search' },
    { path: '/manage/onboarding', label: 'Onboarding', icon: 'assignment_ind' },
    { path: '/manage/staff', label: 'Staff directory', icon: 'groups' },
    { path: '/manage/compliance', label: 'Compliance', icon: 'verified_user' },
    { path: '/manage/leave', label: 'Availability & leave', icon: 'event' },
    { path: '/manage/reviews', label: 'Supervision & appraisals', icon: 'forum' },
    { path: '/manage/learning', label: 'Training academy', icon: 'school' },
  ];
  protected switchWorkspace(): void {
    this.router.navigateByUrl('/select-workspace');
  }
  protected signOut(): void {
    this.auth.signOut();
    this.router.navigateByUrl('/auth/sign-in');
  }
}
