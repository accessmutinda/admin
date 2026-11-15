import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyDatePipe } from '../../../shared/pipes/company-date.pipe';
import { ServiceUsersApi } from './service-users-api.service';
import { CareHeader } from '../care/care-header';
import { ServiceUserState } from '../shared/service-user-state';
import { ModuleDesign } from '../shared/module-design';
import type { ServiceUserAuditRead as AuditPage } from './service-users.generated';

@Component({
  selector: 'cv-client-audit',
  imports: [FormsModule, CompanyDatePipe, CareHeader, ServiceUserState, ModuleDesign],
  providers: [ServiceUsersApi],
  host: { class: 'module-page operations-page' },
  styleUrls: [
    '../care/service-user-spacing.css',
    '../care/care-shared.css',
    '../care/care-controls.css',
  ],
  template: `<cv-module-design />
    @if (api.selected(); as client) {
      <cv-care-header [client]="client" active="audit" />
      <div class="care-heading">
        <div>
          <h1>Audit Trail</h1>
          <p>Recorded changes to this service user from the modules you can access.</p>
        </div>
        @if (api.access.can('care', 'records', 'export')) {
          <button class="care-button" [disabled]="loading() || exporting()" (click)="download()">
            Export audit
          </button>
        }
      </div>
      <section class="care-panel">
        <form (ngSubmit)="search()" class="care-fields">
          <label
            >Search audit<input
              name="query"
              aria-label="Search service-user audit"
              [(ngModel)]="query" /></label
          ><button class="care-button" [disabled]="loading()">Search</button
          ><button
            class="care-button"
            type="button"
            [disabled]="loading()"
            (click)="query = ''; search()"
          >
            Clear
          </button>
        </form>
        @if (error()) {
          <p class="care-error" role="alert">{{ error() }}</p>
        }
        @if (loading()) {
          <p role="status">Loading recorded changes…</p>
        }
        <div class="care-scroll" role="region" aria-label="Service-user audit">
          <table class="care-table">
            <thead>
              <tr>
                <th>Date / time</th>
                <th>Action</th>
                <th>User</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              @for (row of data()?.results ?? []; track row.id) {
                <tr>
                  <td>{{ row.at | companyDate: data()?.timezone }}</td>
                  <td>{{ label(row.action) }}</td>
                  <td>{{ row.actor }}</td>
                  <td>{{ row.version ?? '—' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4">
                    {{ loading() ? 'Loading…' : 'No matching recorded changes.' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <nav aria-label="Audit pages">
          <button class="care-button" [disabled]="loading() || page() === 1" (click)="move(-1)">
            Previous</button
          ><span>Page {{ page() }} · {{ data()?.count ?? 0 }} recorded changes</span
          ><button class="care-button" [disabled]="loading() || !data()?.next" (click)="move(1)">
            Next
          </button>
        </nav>
      </section>
    } @else {
      <cv-service-user-state
        [loading]="api.detailLoading()"
        [message]="api.error()"
        (retry)="reload()"
      />
    }`,
})
export class ClientAudit {
  readonly api = inject(ServiceUsersApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly data = signal<AuditPage | null>(null);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal('');
  query = '';
  private generation = 0;
  private destroyed = false;
  constructor() {
    effect(() => {
      const id = this.id();
      this.api.scope();
      untracked(() => {
        this.page.set(1);
        this.query = '';
        this.data.set(null);
        if (id) this.reload();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
    });
  }
  label(action: string) {
    return action.replace(/^care\./, '').replace(/[._]+/g, ' ');
  }
  canLeave() {
    return true;
  }
  reload() {
    void this.api.detail(this.id());
    void this.load();
  }
  search() {
    this.page.set(1);
    void this.load();
  }
  move(direction: number) {
    this.page.update((page) => Math.max(1, page + direction));
    void this.load();
  }
  private path(exporting = false) {
    return `/companies/${this.api.companyId()}/service-users/${this.id()}/audit${exporting ? '/export' : ''}?page=${this.page()}&search=${encodeURIComponent(this.query.trim())}`;
  }
  async load() {
    const scope = this.api.scope(),
      id = this.id(),
      generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    this.data.set(null);
    try {
      const data = await this.auth.api<AuditPage>(this.path());
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        id !== this.id() ||
        generation !== this.generation
      )
        return;
      if (data.company_id !== this.api.companyId() || data.service_user_id !== id)
        throw Error('The audit does not match this service user.');
      this.data.set(data);
    } catch (error) {
      if (scope === this.api.scope() && generation === this.generation)
        this.error.set(error instanceof Error ? error.message : 'Audit Trail is unavailable.');
    } finally {
      if (scope === this.api.scope() && generation === this.generation) this.loading.set(false);
    }
  }
  async download() {
    if (this.exporting() || !this.api.access.can('care', 'records', 'export')) return;
    const scope = this.api.scope(),
      id = this.id();
    this.exporting.set(true);
    this.error.set('');
    try {
      const blob = await this.auth.api<Blob>(
        this.path(true),
        undefined,
        undefined,
        undefined,
        'blob',
      );
      if (this.destroyed || scope !== this.api.scope() || id !== this.id()) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = 'service-user-audit.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (scope === this.api.scope())
        this.error.set(error instanceof Error ? error.message : 'Audit export failed.');
    } finally {
      this.exporting.set(false);
    }
  }
}
