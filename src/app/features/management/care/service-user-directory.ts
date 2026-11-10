import { Component, computed, effect, untracked, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ServiceUsersApi, DirectoryUser } from '../clients/service-users-api.service';
import { PageLoading } from '../../../shared/layouts/page-loading';
import { CompanyUnavailable } from '../shared/company-unavailable';
import { age } from './care.models';
import { RotaClient } from '../rota/rota.models';
@Component({
  selector: 'cv-service-user-directory',
  imports: [
    PageLoading,
    CompanyUnavailable,
    DatePipe,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
  ],
  styleUrls: ['./care-shared.css', './care-controls.css', './service-user-directory.css'],
  styles: [
    `
      .directory-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 8px;
      }
      .directory-avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        object-fit: cover;
        background: #eaf5fc;
        color: #0066ac;
        display: inline-grid;
        place-items: center;
        flex-shrink: 0;
      }
      .directory-identity {
        display: flex;
        gap: 8px;
        align-items: center;
        min-width: 180px;
      }
    `,
  ],
  templateUrl: './service-user-directory.html',
})
export class ServiceUserDirectory {
  protected readonly api = inject(ServiceUsersApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly openingRisks = computed(() => this.queryParams().get('open') === 'risks');
  protected recordLink(id: string): string[] {
    return this.openingRisks() ? ['/manage/clients', id, 'risks'] : ['/manage/clients', id];
  }
  protected readonly query = signal('');
  protected readonly status = signal('Active');
  protected readonly funding = signal('');
  protected readonly need = signal('');
  protected readonly packageFilter = signal('');
  protected readonly view = signal('Table');
  protected readonly page = signal(1);
  protected readonly pageSize = 8;
  protected readonly sort = signal('name');
  protected readonly needs = computed(() => this.api.facets()?.needs ?? []);
  protected readonly packages = computed(() => this.api.facets()?.packages ?? []);
  protected readonly count = computed(() => this.api.directory()?.count ?? 0);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.count() / this.pageSize)),
  );
  protected readonly currentPage = computed(() => this.page());
  protected readonly rows = this.api.rows;
  protected readonly requestQuery = computed(() =>
    new URLSearchParams({
      q: this.query(),
      status: this.status(),
      funding: this.funding(),
      need: this.need(),
      package: this.packageFilter(),
      sort: this.sort(),
      page: String(this.page()),
      page_size: String(this.pageSize),
    }).toString(),
  );
  constructor() {
    effect(() => {
      const query = this.requestQuery();
      this.api.scope();
      untracked(() => void this.api.load(query));
    });
  }
  protected reload(): void {
    void this.api.load(this.requestQuery());
  }
  protected age = (dob: string) => age(dob, this.api.directory()?.meta.local_date);
  protected calls(c: RotaClient) {
    return (c as DirectoryUser).packages ?? [];
  }
  protected primaryNeeds(c: RotaClient): string[] {
    return (c as DirectoryUser).primary_needs ?? [];
  }
  protected nextVisit(c: RotaClient) {
    return (c as DirectoryUser).next_visit;
  }
  protected kin(c: RotaClient) {
    return c.representative;
  }
  protected alerts(c: RotaClient): string[] {
    return [...(c.riskFlags ?? []), ...(c.priority === 'High' ? ['High priority'] : [])];
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
  }
  protected openRecord(event: Event, id: string): void {
    if (
      event.defaultPrevented ||
      (event.target instanceof Element &&
        event.target.closest('a, button, input, select, textarea'))
    )
      return;
    event.preventDefault();
    void this.router.navigate(this.recordLink(id));
  }
  protected clear(): void {
    this.query.set('');
    this.status.set('Active');
    this.funding.set('');
    this.need.set('');
    this.packageFilter.set('');
    this.page.set(1);
  }
  protected export(): void {
    void this.api.export(this.requestQuery());
  }
}
