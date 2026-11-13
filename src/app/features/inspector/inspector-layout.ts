import { InspectorClientsApi } from './inspector-clients-api.service';
import { InspectorProviderApi } from './inspector-provider-api.service';
import { NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { PageNavigation } from '../../core/navigation/page-navigation.service';
import { PageLoading } from '../../shared/layouts/page-loading';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { ROLES } from '../../core/auth/models/role';
import { AuthService } from '../../core/auth/auth.service';
import { INSPECTOR_PAGES } from './inspector.models';
import { InspectorService } from './inspector.service';

@Component({
  selector: 'cv-inspector-layout',
  imports: [PageLoading, RouterLink, RouterLinkActive, RouterOutlet, A11yModule],
  styleUrl: './inspector-layout.css',
  template: `
    <a class="skip" href="#inspector-content">Skip to content</a>
    @if (menuOpen()) {
      <button class="scrim" aria-label="Close navigation" (click)="menuOpen.set(false)"></button>
    }
    <aside
      [class.open]="menuOpen()"
      [attr.inert]="mobile()?.matches && !menuOpen() ? '' : null"
      [cdkTrapFocus]="!!mobile()?.matches && menuOpen()"
      [cdkTrapFocusAutoCapture]="!!mobile()?.matches && menuOpen()"
      (keydown.escape)="menuOpen.set(false)"
    >
      <a class="brand" routerLink="/inspector/dashboard"
        ><img src="/brand/logo-full-reversed.png" alt="CareVerity"
      /></a>
      <p class="nav-label">INSPECTOR PORTAL</p>
      <nav aria-label="Inspector navigation">
        @for (page of pages(); track page.path) {
          <a
            [routerLink]="['/inspector', page.path]"
            routerLinkActive="active"
            ariaCurrentWhenActive="page"
            (click)="menuOpen.set(false)"
            ><span class="material-symbols-outlined" aria-hidden="true">{{ page.icon }}</span
            >{{ page.label }}</a
          >
        }
      </nav>
      <div class="bottom">
        @if (canManage()) {
          <a routerLink="/manage/companies"
            ><span class="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span
            >Admin Console</a
          >
        }
        <button (click)="switchWorkspace()">
          <span class="material-symbols-outlined" aria-hidden="true">swap_horiz</span>Switch
          workspace
        </button>
        <a routerLink="/account/security"
          ><span class="material-symbols-outlined" aria-hidden="true">help_outline</span>Account
          &amp; Support</a
        >
        <button (click)="signOut()">
          <span class="material-symbols-outlined" aria-hidden="true">logout</span>Sign out
        </button>
      </div>
    </aside>
    <div class="body">
      <header>
        <button class="menu" aria-label="Open navigation" (click)="menuOpen.set(true)">
          <span class="material-symbols-outlined" aria-hidden="true">menu</span>
        </button>
        <div class="console">
          <strong>Inspector Portal</strong
          ><span>For inspectors and authorised regulatory reviewers</span>
        </div>
        <form (submit)="search($event, searchBox.value)" role="search">
          <span class="material-symbols-outlined" aria-hidden="true">search</span
          ><input
            #searchBox
            aria-label="Search inspection documents"
            placeholder="Search documents and evidence…"
            type="search"
          />
        </form>
        <a class="account" routerLink="/account/security"
          ><span class="avatar">{{ auth.currentUser()?.initials }}</span
          ><span
            ><strong>{{ auth.currentUser()?.name }}</strong
            ><small>{{ userRole() }}</small></span
          ></a
        >
      </header>
      <main id="inspector-content" tabindex="-1">
        @if (navigationState.localDestination('inspector'); as destination) {
          <cv-page-loading [url]="destination" />
        }
        <div
          class="inspector-route-content"
          [hidden]="!!navigationState.localDestination('inspector')"
          [attr.inert]="navigationState.localDestination('inspector') ? '' : null"
        >
          <router-outlet />
        </div>
      </main>
      <footer>
        <span
          >CareVerity ·
          {{
            providerMode()
              ? provider.company()?.name
              : clientsMode()
                ? clients.company()?.name
                : data.company()?.name
          }}</span
        ><span>{{
          providerMode()
            ? provider.ready()
              ? 'Provider records connected'
              : 'Provider records unavailable'
            : clientsMode()
              ? clients.ready()
                ? 'Service user records connected'
                : 'Service user records unavailable'
              : 'Local workspace · ' +
                (data.store.storageAvailable() ? 'Saved on this device' : 'Storage unavailable')
        }}</span>
      </footer>
    </div>
  `,
})
export class InspectorLayout {
  readonly navigationState = inject(PageNavigation);
  readonly auth = inject(AuthService);
  readonly data = inject(InspectorService);
  readonly router = inject(Router);
  readonly access = inject(CompanyAccessService);
  readonly provider = inject(InspectorProviderApi);
  readonly clients = inject(InspectorClientsApi);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.getCurrentNavigation()?.finalUrl?.toString() ?? this.router.url },
  );
  readonly providerMode = computed(() => /^\/inspector\/provider(?:[?#]|$)/.test(this.url()));
  readonly clientsMode = computed(() => /^\/inspector\/service-users(?:[?#]|$)/.test(this.url()));
  readonly pages = computed(() =>
    INSPECTOR_PAGES.filter((page) => this.access.canPath('/inspector/' + page.path)),
  );
  readonly menuOpen = signal(false);
  readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 1023px)'));
  readonly canManage = computed(() => this.auth.isAuthenticated());
  readonly userRole = computed(() => ROLES[this.auth.currentUser()?.roleCode ?? 'CW'].label);
  search(event: Event, term: string): void {
    event.preventDefault();
    this.router.navigate(
      [
        this.providerMode()
          ? '/inspector/provider'
          : this.clientsMode()
            ? '/inspector/service-users'
            : '/inspector/documents',
      ],
      {
        queryParams: { q: term },
      },
    );
  }
  switchWorkspace(): void {
    this.router.navigateByUrl('/select-workspace');
  }
  signOut(): void {
    this.auth.signOut();
    this.router.navigateByUrl('/auth/sign-in');
  }
}
