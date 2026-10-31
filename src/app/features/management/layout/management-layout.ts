import { WorkspaceTools } from '../care/workspace-tools';
import { A11yModule } from '@angular/cdk/a11y';
import { MAT_SELECT_CONFIG } from '@angular/material/select';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ROLES } from '../../../core/auth/models/role';
import { ManagementRole } from '../shared/role-pill';
import { AuthService } from '../../../core/auth/auth.service';
import { Logo } from '../../../shared/ui/logo';
import { ManagementStore } from '../shared/management.store';
import { WallboardLauncher } from '../ecm/wallboard-launcher';
import { QUALITY_LINKS } from '../quality/quality-navigation';
import { FINANCE_AREAS } from '../payroll/finance/finance-navigation';
@Component({
  selector: 'cv-management-layout',
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../people/hr-shell.css',
    '../companies/company-directory.css',
    './quality-submenu.css',
  ],
  providers: [{ provide: MAT_SELECT_CONFIG, useValue: { overlayPanelClass: 'cv-select-overlay' } }],
  imports: [
    ManagementRole,
    A11yModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Logo,
    WorkspaceTools,
  ],
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
      <p class="nav-label">ORGANISATION</p>
      @for (item of organisation; track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span
          >{{ item.label }}</a
        >
      }
      <a
        routerLink="/manage/people"
        [class.active]="isPeopleArea()"
        [attr.aria-current]="isPeopleArea() ? 'page' : null"
        (click)="menuOpen.set(false)"
        ><span class="material-symbols-outlined" aria-hidden="true">groups</span>People & HR</a
      >
      <a
        routerLink="/manage/learning"
        routerLinkActive="active"
        ariaCurrentWhenActive="page"
        (click)="menuOpen.set(false)"
        ><span class="material-symbols-outlined" aria-hidden="true">school</span>Training Academy</a
      >
      @if (store.company()?.modules.includes('Care delivery')) {
        <p class="nav-label">CARE DELIVERY</p>
        <a routerLink="/manage/clients" routerLinkActive="active" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">folder_shared</span>Service
          users</a
        >

        <button
          type="button"
          class="visits-submenu-toggle"
          #visitsMenu
          [class.active]="routerUrl().startsWith('/manage/rota')"
          [attr.aria-expanded]="visitsExpanded()"
          aria-controls="visits-submenu"
          (click)="visitsExpanded.set(!visitsExpanded())"
        >
          <span class="material-symbols-outlined" aria-hidden="true">calendar_month</span>
          <span class="visits-menu-label">Visits &amp; Rostering</span>
          <span class="material-symbols-outlined visits-menu-chevron" aria-hidden="true">{{
            visitsExpanded() ? 'expand_less' : 'expand_more'
          }}</span>
        </button>
        @if (visitsExpanded()) {
          <nav
            class="visits-submenu"
            id="visits-submenu"
            aria-label="Visits & Rostering pages"
            (keydown.escape)="
              visitsExpanded.set(false); visitsMenu.focus(); $event.stopPropagation()
            "
          >
            @for (item of visitsLinks; track item.path) {
              <a
                [routerLink]="item.path"
                [class.selected]="isVisitSection(item.path)"
                [attr.aria-current]="isVisitSection(item.path) ? 'page' : null"
                (click)="menuOpen.set(false)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </a>
            }
          </nav>
        }
        <a
          routerLink="/manage/ecm"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">monitor_heart</span>Live
          Visits / ECM</a
        >
      }
      @if (store.company()?.modules.includes('Quality & compliance')) {
        <p class="nav-label">SUPERVISION & QUALITY</p>
        <a routerLink="/manage/supervisor" routerLinkActive="active" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">supervisor_account</span
          >Supervisor dashboard</a
        >
        <button
          type="button"
          class="quality-submenu-toggle"
          #richKpiMenu
          [class.active]="routerUrl().startsWith('/manage/quality')"
          (click)="qualityExpanded.set(!qualityExpanded())"
          [attr.aria-expanded]="qualityExpanded()"
          aria-controls="quality-submenu"
        >
          <span class="material-symbols-outlined" aria-hidden="true">monitoring</span>
          <span class="quality-menu-label">Rich KPI</span>
          <span class="material-symbols-outlined quality-menu-chevron" aria-hidden="true">{{
            qualityExpanded() ? 'expand_less' : 'expand_more'
          }}</span>
        </button>
        @if (qualityExpanded()) {
          <nav
            class="quality-submenu"
            id="quality-submenu"
            aria-label="Rich KPI pages"
            (keydown.escape)="
              qualityExpanded.set(false); richKpiMenu.focus(); $event.stopPropagation()
            "
          >
            @for (item of qualityLinks; track item.slug) {
              <a
                [routerLink]="item.slug ? ['/manage/quality', item.slug] : ['/manage/quality']"
                routerLinkActive="selected"
                [routerLinkActiveOptions]="{ exact: true }"
                ariaCurrentWhenActive="page"
                (click)="menuOpen.set(false)"
                [title]="item.slug ? item.label : 'Executive KPI Command Centre'"
              >
                <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span
                ><span>{{ item.slug ? item.label : 'Executive KPI Command Centre' }}</span>
              </a>
            }
            <a
              routerLink="/manage/quality/workspace"
              routerLinkActive="selected"
              ariaCurrentWhenActive="page"
              (click)="menuOpen.set(false)"
              ><span class="material-symbols-outlined" aria-hidden="true">assignment</span
              ><span>Assessment & action workspace</span></a
            >
          </nav>
        }
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
      @if (store.company()?.modules.includes('Care delivery')) {
        <button class="sidebar-tv" (click)="menuOpen.set(false); tv.open()">
          <span class="material-symbols-outlined" aria-hidden="true">connected_tv</span>
          <span>ECM TV wallboard<small>Open full screen</small></span>
          <span class="material-symbols-outlined" aria-hidden="true">north_east</span>
        </button>
      }
      <div class="sidebar-bottom">
        <a
          routerLink="/staff-portal"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          (click)="menuOpen.set(false)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">forum</span>Staff portal
        </a>
        <a routerLink="/inspector/dashboard" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">policy</span>Inspector
          Portal</a
        >
        <a routerLink="/family-portal" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">diversity_1</span>Family
          Portal</a
        >
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
            <span class="material-symbols-outlined" aria-hidden="true">menu</span>
          </button>
          @if (!routerUrl().startsWith('/manage/ecm/wallboard')) {
            <div class="co-console-heading">
              <strong>Admin Console</strong
              ><span>{{
                isPeopleArea()
                  ? 'Manage staff, employment and workforce readiness'
                  : isCompaniesOverview()
                    ? 'Manage companies, users, and system configuration'
                    : 'Manage your company workspace'
              }}</span>
            </div>
          }
          <button
            type="button"
            class="workspace-control"
            [attr.aria-label]="
              'Switch workspace. Current workspace: ' + (store.company()?.name ?? '')
            "
            [title]="store.company()?.name ?? 'Switch workspace'"
            (click)="switchWorkspace()"
          >
            <span class="workspace-mark">{{ store.company()?.code }}</span
            ><span class="workspace-text"
              ><strong>{{ store.company()?.name }}</strong
              ><small>Switch workspace</small></span
            ><span class="material-symbols-outlined" aria-hidden="true">unfold_more</span>
          </button>
        </div>
        @defer (on idle) {
          <cv-workspace-tools />
        }
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
  protected readonly tv = inject(WallboardLauncher);
  protected readonly auth = inject(AuthService);
  protected readonly userRole = computed(
    () => ROLES[this.auth.currentUser()?.roleCode ?? 'CW'].label,
  );
  protected readonly store = inject(ManagementStore);
  private readonly router = inject(Router);
  protected routerUrl(): string {
    return this.router.url;
  }
  protected readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 1023px)'));
  protected readonly menuOpen = signal(false);
  protected readonly finance = FINANCE_AREAS;
  protected readonly visitsExpanded = signal(this.router.url.startsWith('/manage/rota'));
  protected readonly visitsLinks = [
    { path: '/manage/rota/overview', label: 'Overview', icon: 'dashboard' },
    { path: '/manage/rota/call-packages', label: 'Call packages', icon: 'event_repeat' },
    { path: '/manage/rota/publishing', label: 'Publishing', icon: 'publish' },
    { path: '/manage/rota/history', label: 'History & audit', icon: 'history' },
  ];
  protected isVisitSection(path: string): boolean {
    const current = this.router.url.split(/[?#]/)[0];
    return current === path || (path.endsWith('/overview') && current === '/manage/rota/planner');
  }
  protected readonly qualityLinks = QUALITY_LINKS;
  protected readonly qualityExpanded = signal(this.router.url.startsWith('/manage/quality'));
  protected readonly organisation = [
    { path: '/manage/companies', label: 'Companies', icon: 'domain' },
    { path: '/manage/workflows', label: 'Approval workflows', icon: 'account_tree' },
  ];
  protected isCompaniesOverview(): boolean {
    const path = this.router.url.split(/[?#]/)[0];
    return path.startsWith('/manage/companies') || path === '/manage/locations';
  }
  protected isPeopleArea(): boolean {
    const path = this.router.url.split(/[?#]/)[0];
    return ['/manage/people', '/manage/recruitment', '/manage/leave', '/manage/reviews'].some(
      (area) => path === area || path.startsWith(area + '/'),
    );
  }
  protected switchWorkspace(): void {
    this.router.navigateByUrl('/select-workspace');
  }
  protected signOut(): void {
    this.auth.signOut();
    this.router.navigateByUrl('/auth/sign-in');
  }
}
