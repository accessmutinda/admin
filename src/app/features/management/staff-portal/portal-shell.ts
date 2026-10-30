import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_SELECT_CONFIG } from '@angular/material/select';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/models/role';
import { PortalDemo } from './portal-demo.service';
import { Logo } from '../../../shared/ui/logo';
import { ManagementStore } from '../shared/management.store';
import { ModuleDesign } from '../shared/module-design';
@Component({
  selector: 'cv-staff-portal',
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ModuleDesign, A11yModule, Logo],
  providers: [{ provide: MAT_SELECT_CONFIG, useValue: { overlayPanelClass: 'cv-select-overlay' } }],
  styleUrl: './portal-shell.css',
  template: `<cv-module-design />
    <div class="cv-management staff-portal-shell">
      <a class="skip-link" href="#staff-content">Skip to content</a>
      @if (menuOpen()) {
        <button
          class="nav-scrim"
          aria-label="Close staff navigation"
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
          routerLink="/staff-portal/dashboard"
          class="sidebar-logo"
          aria-label="CareVerity staff portal home"
          ><cv-logo tone="light"
        /></a>
        <p class="nav-label">STAFF PORTAL</p>
        <nav
          id="staff-navigation-menu"
          class="staff-navigation"
          aria-label="Staff portal navigation"
        >
          @for (item of visibleLinks(); track item.path) {
            <a
              [routerLink]="portalLink(item.path)"
              routerLinkActive="active"
              ariaCurrentWhenActive="page"
              (click)="menuOpen.set(false)"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span
              >{{ item.label }}
            </a>
          }
        </nav>
        <div class="sidebar-bottom">
          <a routerLink="/manage/companies" (click)="menuOpen.set(false)"
            ><span class="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span
            >Admin Console</a
          >
          <a routerLink="/inspector/dashboard" (click)="menuOpen.set(false)"
            ><span class="material-symbols-outlined" aria-hidden="true">policy</span>Inspector
            portal</a
          >
          <button (click)="switchWorkspace()">
            <span class="material-symbols-outlined" aria-hidden="true">swap_horiz</span>Switch
            workspace
          </button>
          <a routerLink="/account/security" (click)="menuOpen.set(false)"
            ><span class="material-symbols-outlined" aria-hidden="true">help_outline</span>Account &
            support</a
          >
          <button (click)="signOut()">
            <span class="material-symbols-outlined" aria-hidden="true">logout</span>Sign out
          </button>
        </div>
      </aside>
      <div class="app-body">
        <header class="app-header staff-header">
          <div class="staff-header-leading">
            <button
              type="button"
              class="icon-button mobile-menu"
              aria-label="Open staff navigation"
              aria-controls="staff-navigation-menu"
              [attr.aria-expanded]="menuOpen()"
              (click)="menuOpen.set(true)"
            >
              <span class="material-symbols-outlined" aria-hidden="true">menu</span>
            </button>
            <div class="staff-console">
              <strong>Staff Portal</strong><span>Team, care and communications</span>
            </div>
          </div>
          <button
            type="button"
            class="workspace-control"
            (click)="switchWorkspace()"
            [attr.aria-label]="
              'Switch workspace. Current workspace: ' + (store.company()?.name ?? '')
            "
          >
            <span class="workspace-mark">{{ store.company()?.code }}</span>
            <span class="workspace-text"
              ><strong>{{ store.company()?.name }}</strong
              ><small>Switch workspace</small></span
            >
            <span class="material-symbols-outlined" aria-hidden="true">unfold_more</span>
          </button>
          <form class="staff-search" role="search" (submit)="search($event, searchBox.value)">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              #searchBox
              (keydown.escape)="searchBox.blur()"
              type="search"
              aria-label="Search service users"
              placeholder="Search service users…"
            />
          </form>
          <a class="user-control" routerLink="/account/security" aria-label="Account settings">
            <span class="avatar small">{{ auth.currentUser()?.initials }}</span>
            <span
              >{{ auth.currentUser()?.name }}<small>{{ userRole() }}</small></span
            >
          </a>
        </header>
        <main id="staff-content" class="page-content" tabindex="-1">
          <section class="module-page operations-page portal-content">
            @if (demo.error()) {
              <p role="alert">{{ demo.error() }}</p>
            }
            <router-outlet />
          </section>
        </main>
        <footer class="app-footer">
          <span>CareVerity · {{ store.company()?.name }}</span
          ><span role="status">{{
            store.storageAvailable() ? 'Changes saved on this device' : 'Storage unavailable'
          }}</span>
        </footer>
      </div>
    </div>`,
})
export class PortalShell {
  protected readonly demo = inject(PortalDemo);
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(ManagementStore);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 1023px)'));
  protected readonly userRole = computed(
    () => ROLES[this.auth.currentUser()?.roleCode ?? 'CW'].label,
  );
  protected readonly links = [
    { path: 'dashboard', label: 'My dashboard', icon: 'space_dashboard' },
    { path: 'training/dashboard', label: 'My training', icon: 'school' },
    { path: 'training/courses', label: 'Course library', icon: 'menu_book' },
    { path: 'training/assessments', label: 'Assessments', icon: 'assignment' },
    { path: 'training/certificates', label: 'Certificates', icon: 'workspace_premium' },
    { path: 'journal', label: 'Journal & messages', icon: 'forum' },
    { path: 'tasks', label: 'Staff & tasks', icon: 'assignment' },
    { path: 'concerns', label: 'Concerns', icon: 'health_and_safety' },
    { path: 'service-users', label: 'Service users', icon: 'groups' },
    { path: 'oversight', label: 'Manager oversight', icon: 'monitoring' },
  ];
  protected portalLink(path: string): string[] {
    return ['/staff-portal', ...path.split('/')];
  }
  protected visibleLinks() {
    return this.links.filter(
      (item) =>
        !item.path.startsWith('training/') ||
        this.store.company()?.modules.includes('Training academy'),
    );
  }
  protected search(event: Event, term: string): void {
    event.preventDefault();
    void this.router.navigate(['/staff-portal/service-users'], {
      queryParams: { q: term.trim() || null },
    });
  }
  protected switchWorkspace(): void {
    this.menuOpen.set(false);
    void this.router.navigateByUrl('/select-workspace');
  }
  protected signOut(): void {
    this.menuOpen.set(false);
    this.auth.signOut();
    void this.router.navigateByUrl('/auth/sign-in');
  }
}
