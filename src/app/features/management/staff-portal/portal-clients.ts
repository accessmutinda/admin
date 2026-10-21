import { Component, computed, inject, signal, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PortalService } from './portal.service';
@Component({
  selector: 'cv-portal-clients',
  imports: [FormsModule, RouterLink],
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-client.css'],
  template: `<div class="page-heading">
      <div>
        <p class="eyebrow">CARE & COMMUNICATIONS</p>
        <h1>Service Users</h1>
        <p>
          Open a profile to review care, communicate with professionals and follow up on visits.
        </p>
      </div>
      <a class="button" routerLink="/manage/clients">Manage care records</a>
    </div>
    <section class="portal-panel">
      <div class="portal-toolbar">
        <input
          aria-label="Search service users"
          placeholder="Search by name, reference or postcode…"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)"
        /><span class="portal-muted">{{ clients().length }} service users</span>
      </div>
      <div class="client-directory">
        @for (client of clients(); track client.id) {
          <a
            class="client-card"
            [routerLink]="['/staff-portal/service-users', client.id, 'overview']"
            ><span class="portal-avatar">{{ initials(client.name) }}</span>
            <div>
              <h2>{{ client.name }}</h2>
              <p>{{ client.reference }} · {{ client.postcode }}</p>
              <span class="portal-badge" [attr.data-tone]="client.active ? 'green' : 'amber'">{{
                client.active ? 'Active' : 'Inactive'
              }}</span>
              @for (flag of (client.riskFlags ?? []).slice(0, 2); track flag) {
                <span class="portal-badge" data-tone="amber">{{ flag }}</span>
              }
            </div>
            <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></a
          >
        } @empty {
          <div class="portal-empty">
            <span class="material-symbols-outlined" aria-hidden="true">groups</span>
            <h3>
              {{
                portal.care.rota.can('view')
                  ? 'No service users in this view'
                  : 'Care records are unavailable'
              }}
            </h3>
            <p>
              {{
                portal.care.rota.can('view')
                  ? 'Add a service user in care records or try another search.'
                  : 'Care delivery access is required to use this workspace.'
              }}
            </p>
          </div>
        }
      </div>
    </section>`,
})
export class PortalClients {
  protected readonly portal = inject(PortalService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly query = signal('');
  constructor() {
    effect(() => this.query.set(this.params().get('q') ?? ''));
  }
  protected readonly clients = computed(() =>
    this.portal
      .clients()
      .filter((c) =>
        [c.name, c.reference, c.postcode].some((v) =>
          v.toLowerCase().includes(this.query().toLowerCase()),
        ),
      ),
  );
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }
}
