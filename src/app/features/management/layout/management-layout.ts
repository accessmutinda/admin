import { NgTemplateOutlet } from '@angular/common';
import { AcademyGovernanceService } from '../learning/academy/academy-governance.service';
import { AcademyService } from '../learning/academy/academy.service';
import { AcademyDemoWorkflow } from '../learning/academy/academy-demo-workflow';
import { WorkspaceTools } from '../care/workspace-tools';
import { A11yModule } from '@angular/cdk/a11y';
import { MAT_SELECT_CONFIG } from '@angular/material/select';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { Component, ViewEncapsulation, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ROLES } from '../../../core/auth/models/role';
import { ManagementRole } from '../shared/role-pill';
import { AuthService } from '../../../core/auth/auth.service';
import { Logo } from '../../../shared/ui/logo';
import { ManagementStore } from '../shared/management.store';
import { WallboardLauncher } from '../ecm/wallboard-launcher';
import { FINANCE_AREAS } from '../payroll/finance/finance-navigation';
@Component({
  selector: 'cv-management-layout',
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../people/hr-shell.css',
    '../companies/company-directory.css',
    './quality-submenu.css',
    './management-layout.css',
  ],
  providers: [{ provide: MAT_SELECT_CONFIG, useValue: { overlayPanelClass: 'cv-select-overlay' } }],
  imports: [
    NgTemplateOutlet,
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
      <a
        [routerLink]="auth.hasRole('CA') ? '/manage/rota/overview' : '/manage/companies'"
        class="sidebar-logo"
        aria-label="CareVerity home"
        ><cv-logo tone="light"
      /></a>
      @if (auth.hasRole('PO')) {
        <button
          type="button"
          class="workspace-control"
          [attr.aria-label]="
            'Switch workspace. Current workspace: ' + (store.company()?.name ?? '')
          "
          [title]="store.company()?.name ?? 'Select workspace'"
          (click)="switchWorkspace()"
        >
          <span class="workspace-mark">{{ store.company()?.code ?? 'CV' }}</span
          ><span class="workspace-text"
            ><strong>{{ store.company()?.name ?? 'Select workspace' }}</strong
            ><small>Switch workspace</small></span
          ><span class="material-symbols-outlined" aria-hidden="true">unfold_more</span>
        </button>
      }
      <ng-template #careDelivery>
        @if (
          auth.isSuperAdmin() ||
          auth.hasRole('CA') ||
          store.company()?.modules.includes('Care delivery')
        ) {
          <p class="nav-label">CARE DELIVERY</p>
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
          <a routerLink="/manage/clients" routerLinkActive="active" (click)="menuOpen.set(false)"
            ><span class="material-symbols-outlined" aria-hidden="true">folder_shared</span>Service
            users</a
          >

          <a
            routerLink="/manage/care-plans"
            routerLinkActive="active"
            ariaCurrentWhenActive="page"
            (click)="menuOpen.set(false)"
            ><span class="material-symbols-outlined" aria-hidden="true">assignment</span>Care
            Plans</a
          >
          <a
            routerLink="/manage/ecm"
            routerLinkActive="active"
            ariaCurrentWhenActive="page"
            (click)="menuOpen.set(false)"
            ><span class="material-symbols-outlined" aria-hidden="true">monitor_heart</span>Live
            Visits / ECM</a
          >
        }
      </ng-template>
      @if (auth.hasRole('CA')) {
        <ng-container *ngTemplateOutlet="careDelivery" />
      }
      <p class="nav-label">ORGANISATION</p>
      @for (item of organisation(); track item.path) {
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
      <button
        type="button"
        class="academy-submenu-toggle"
        #academyMenu
        [class.active]="routerUrl().startsWith('/manage/learning')"
        [attr.aria-expanded]="academyExpanded()"
        aria-controls="academy-submenu"
        (click)="academyExpanded.set(!academyExpanded())"
      >
        <span class="material-symbols-outlined" aria-hidden="true">school</span>
        <span class="academy-menu-label">CareVerity Academy</span>
        <span class="material-symbols-outlined" aria-hidden="true">{{
          academyExpanded() ? 'expand_less' : 'expand_more'
        }}</span>
      </button>
      @if (academyExpanded()) {
        <nav
          class="academy-submenu"
          id="academy-submenu"
          aria-label="CareVerity Academy pages"
          (keydown.escape)="
            academyExpanded.set(false); academyMenu.focus(); $event.stopPropagation()
          "
        >
          @for (item of academyVisibleLinks(); track item.path) {
            <a
              [routerLink]="item.path"
              [class.selected]="isAcademySection(item.path)"
              [attr.aria-current]="isAcademySection(item.path) ? 'page' : null"
              (click)="menuOpen.set(false)"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span
              ><span>{{ item.label }}</span>
            </a>
          }
        </nav>
      }
      @if (!auth.hasRole('CA')) {
        <ng-container *ngTemplateOutlet="careDelivery" />
      }
      @if (
        auth.isSuperAdmin() ||
        auth.hasRole('CA') ||
        store.company()?.modules.includes('Quality & compliance')
      ) {
        <p class="nav-label">SUPERVISION & QUALITY</p>
        <a routerLink="/manage/supervisor" routerLinkActive="active" (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">supervisor_account</span
          >Supervisor dashboard</a
        >
        <a
          routerLink="/manage/quality"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          (click)="menuOpen.set(false)"
          ><span class="material-symbols-outlined" aria-hidden="true">monitoring</span>Rich KPI</a
        >
      }
      @if (
        auth.isSuperAdmin() || auth.hasRole('CA') || store.company()?.modules.includes('Finance')
      ) {
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
      @if (
        auth.isSuperAdmin() ||
        auth.hasRole('CA') ||
        store.company()?.modules.includes('Care delivery')
      ) {
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
        <a
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
    () => ROLES[this.auth.currentUser()?.roleCode ?? 'UN'].label,
  );
  protected readonly store = inject(ManagementStore);
  private readonly router = inject(Router);
  protected routerUrl(): string {
    return this.router.url;
  }
  protected readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 1023px)'));
  protected readonly menuOpen = signal(false);
  protected readonly finance = FINANCE_AREAS;
  protected readonly academyLinks: {
    path: string;
    label: string;
    icon: string;
  }[] = [
    { path: '/manage/learning', label: 'Dashboard', icon: 'dashboard' },
    { path: '/manage/learning/courses', label: 'Courses & modules', icon: 'menu_book' },
    { path: '/manage/learning/manage', label: 'Staff assignments', icon: 'groups' },
    { path: '/manage/learning/results', label: 'Results & retakes', icon: 'bar_chart' },
    {
      path: '/manage/learning/certificates',
      label: 'Certificates & compliance',
      icon: 'workspace_premium',
    },
    { path: '/manage/learning/reports', label: 'Training matrix & reports', icon: 'grid_view' },
    { path: '/manage/learning/governance', label: 'Policies & reviews', icon: 'policy' },
    { path: '/manage/learning/settings', label: 'Settings', icon: 'settings' },
  ];

  private readonly academy = inject(AcademyService);
  protected academyVisibleLinks() {
    if (this.academy.canManage())
      return this.academyLinks
        .filter((l) => l.path !== '/manage/learning/courses' || this.academy.can('author'))
        .filter((l) => l.path !== '/manage/learning/settings' || this.academy.can('configure'));
    if (this.academy.canViewEvidence())
      return this.academyLinks.filter((l) =>
        [
          '/manage/learning',
          '/manage/learning/results',
          '/manage/learning/certificates',
          '/manage/learning/reports',
          '/manage/learning/governance',
        ].includes(l.path),
      );
    if (this.academy.can('diagnostics'))
      return [
        {
          path: '/manage/learning/diagnostics',
          label: 'Restricted diagnostics',
          icon: 'troubleshoot',
        },
      ];
    return [{ path: '/staff-portal/training', label: 'My learning', icon: 'school' }];
  }
  protected readonly academyExpanded = signal(this.router.url.startsWith('/manage/learning'));
  private readonly navigation = toSignal(this.router.events);
  private readonly academyWorkflow = inject(AcademyDemoWorkflow);
  private readonly academyGovernance = inject(AcademyGovernanceService);
  constructor() {
    effect(() => {
      this.navigation();
      if (
        this.router.url.startsWith('/manage/learning') &&
        this.academy.can('configure') &&
        !this.academy.state().governance
      )
        this.academyGovernance.seed();
    });
    effect(() => {
      if (
        this.navigation() instanceof NavigationEnd &&
        this.router.url.startsWith('/manage/learning')
      )
        this.academyExpanded.set(true);
    });
  }

  protected isAcademySection(path: string): boolean {
    const current = this.router.url.split(/[?#]/)[0];
    return path === '/manage/learning'
      ? current === path
      : current === path ||
          current.startsWith(path + '/') ||
          (path.endsWith('/courses') &&
            (current.startsWith('/manage/learning/content/') ||
              current.startsWith('/manage/learning/structure/') ||
              current === '/manage/learning/questions' ||
              current.startsWith('/manage/learning/questions/') ||
              current === '/manage/learning/rules' ||
              current.startsWith('/manage/learning/rules/') ||
              current === '/manage/learning/publish' ||
              current.startsWith('/manage/learning/publish/')));
  }

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
  protected readonly organisation = computed(() => [
    ...(this.auth.isSuperAdmin()
      ? [{ path: '/manage/companies', label: 'Companies', icon: 'domain' }]
      : this.auth.profile()?.company_id
        ? [
            {
              path: '/manage/companies/' + this.auth.profile()!.company_id,
              label: 'Company',
              icon: 'domain',
            },
          ]
        : []),
    { path: '/manage/workflows', label: 'Approval workflows', icon: 'account_tree' },
  ]);
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
    if (!this.auth.canSwitchWorkspace()) return;
    this.menuOpen.set(false);
    this.router.navigateByUrl('/select-workspace');
  }
  protected signOut(): void {
    this.auth.signOut();
    this.router.navigateByUrl('/auth/sign-in');
  }
}
