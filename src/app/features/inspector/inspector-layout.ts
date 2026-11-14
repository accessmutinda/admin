import { InspectorReportsApi } from './inspector-reports-api.service';
import { InspectorVisitsApi } from './inspector-visits-api.service';
import { InspectorDocumentsApi } from './inspector-documents-api.service';
import { InspectorQualityApi } from './inspector-quality-api.service';
import { InspectorIncidentsApi } from './inspector-incidents-api.service';
import { InspectorMedicationApi } from './inspector-medication-api.service';
import { inspectorEntryPath, isConnectedInspectorPage } from '../../core/access/inspector-routes';
import { InspectorStaffApi } from './inspector-staff-api.service';
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
      <a class="brand" [routerLink]="entryPath() || '/access-denied'"
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
        @if (auth.canSwitchWorkspace()) {
          <button (click)="switchWorkspace()">
            <span class="material-symbols-outlined" aria-hidden="true">swap_horiz</span>Switch
            workspace
          </button>
        }
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
            aria-label="Search inspector records"
            placeholder="Search records and evidence…"
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
          >CareVerity
          @if (companyName()) {
            · {{ companyName() }}
          }
        </span>
        <span>{{
          providerMode()
            ? provider.ready()
              ? 'Provider records connected'
              : 'Provider records unavailable'
            : clientsMode()
              ? clients.ready()
                ? 'Service user records connected'
                : 'Service user records unavailable'
              : staffMode()
                ? staff.ready()
                  ? 'Staffing records connected'
                  : 'Staffing records unavailable'
                : this.medicationMode()
                  ? this.medication.ready()
                    ? 'Medication records connected'
                    : 'Medication records unavailable'
                  : this.incidentsMode()
                    ? this.incidents.ready()
                      ? 'Incident records connected'
                      : 'Incident records unavailable'
                    : this.qualityMode()
                      ? this.quality.ready()
                        ? 'Quality records connected'
                        : 'Quality records unavailable'
                      : this.documentsMode()
                        ? this.documents.ready()
                          ? 'Evidence records connected'
                          : 'Evidence records unavailable'
                        : this.visitsMode()
                          ? this.visits.ready()
                            ? 'Visit records connected'
                            : 'Visit records unavailable'
                          : this.reportsMode()
                            ? this.reports.ready()
                              ? 'Report records connected'
                              : 'Report records unavailable'
                            : 'Live workflow unavailable'
        }}</span>
      </footer>
    </div>
  `,
})
export class InspectorLayout {
  readonly navigationState = inject(PageNavigation);
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly access = inject(CompanyAccessService);
  readonly provider = inject(InspectorProviderApi);
  readonly clients = inject(InspectorClientsApi);
  readonly staff = inject(InspectorStaffApi);
  readonly medication = inject(InspectorMedicationApi);
  readonly incidents = inject(InspectorIncidentsApi);
  readonly quality = inject(InspectorQualityApi);
  readonly documents = inject(InspectorDocumentsApi);
  readonly reports = inject(InspectorReportsApi);
  readonly reportsMode = computed(() => /^\/inspector\/(reports|notes)(?:[?#]|$)/.test(this.url()));
  readonly visits = inject(InspectorVisitsApi);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.getCurrentNavigation()?.finalUrl?.toString() ?? this.router.url },
  );
  readonly providerMode = computed(() => /^\/inspector\/provider(?:[?#]|$)/.test(this.url()));
  readonly clientsMode = computed(() => /^\/inspector\/service-users(?:[?#]|$)/.test(this.url()));
  readonly staffMode = computed(() => /^\/inspector\/staffing(?:[?#]|$)/.test(this.url()));
  readonly medicationMode = computed(() => /^\/inspector\/medication(?:[?#]|$)/.test(this.url()));
  readonly incidentsMode = computed(() => /^\/inspector\/incidents(?:[?#]|$)/.test(this.url()));
  readonly qualityMode = computed(() => /^\/inspector\/quality(?:[?#]|$)/.test(this.url()));
  readonly documentsMode = computed(() => /^\/inspector\/documents(?:[?#]|$)/.test(this.url()));
  readonly visitsMode = computed(() => /^\/inspector\/visits(?:[?#]|$)/.test(this.url()));
  readonly companyName = computed(() =>
    this.providerMode()
      ? this.provider.company()?.name
      : this.clientsMode()
        ? this.clients.company()?.name
        : this.staffMode()
          ? this.staff.company()?.name
          : this.medicationMode()
            ? this.medication.company()?.name
            : this.incidentsMode()
              ? this.incidents.company()?.name
              : this.qualityMode()
                ? this.quality.company()?.name
                : this.documentsMode()
                  ? this.documents.company()?.name
                  : this.visitsMode()
                    ? this.visits.company()?.name
                    : this.reportsMode()
                      ? this.reports.company()?.name
                      : null,
  );
  readonly pages = computed(() =>
    INSPECTOR_PAGES.filter(
      (page) =>
        isConnectedInspectorPage(page.path) && this.access.canPath('/inspector/' + page.path),
    ),
  );
  readonly menuOpen = signal(false);
  readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 1023px)'));
  readonly entryPath = computed(() => inspectorEntryPath((path) => this.access.canPath(path)));
  readonly canManage = computed(
    () => this.auth.isSuperAdmin() || this.access.core('company.profile.read'),
  );
  readonly userRole = computed(() => {
    const context = this.access.context();
    const names =
      context?.company_id === this.access.companyId()
        ? context.roles.map((role) => role.name).filter(Boolean)
        : [];
    return this.auth.isSuperAdmin()
      ? ROLES.PO.label
      : names.join(', ') || ROLES[this.auth.currentUser()?.roleCode ?? 'IN'].label;
  });
  search(event: Event, term: string): void {
    event.preventDefault();
    this.router.navigate(
      [
        this.providerMode()
          ? '/inspector/provider'
          : this.clientsMode()
            ? '/inspector/service-users'
            : this.staffMode()
              ? '/inspector/staffing'
              : this.medicationMode()
                ? '/inspector/medication'
                : this.incidentsMode()
                  ? '/inspector/incidents'
                  : this.qualityMode()
                    ? '/inspector/quality'
                    : this.documentsMode()
                      ? '/inspector/documents'
                      : this.visitsMode()
                        ? '/inspector/visits'
                        : this.reportsMode()
                          ? this.url().split(/[?#]/)[0]
                          : this.entryPath() || '/access-denied',
      ],
      {
        queryParams: { q: term },
      },
    );
  }
  switchWorkspace(): void {
    if (this.auth.canSwitchWorkspace()) this.router.navigateByUrl('/select-workspace');
  }
  signOut(): void {
    this.auth.signOut();
    this.router.navigateByUrl('/auth/sign-in');
  }
}
