import { CardTonePipe } from '../../../shared/ui/card-tone.pipe';
import { Component, computed, effect, untracked, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { WorkforceComplianceApi } from './workforce-compliance-api.service';
import { CompanyUnavailable } from '../shared/company-unavailable';
import { PageLoading } from '../../../shared/layouts/page-loading';

@Component({
  selector: 'cv-hr-compliance',
  host: { class: 'module-page people-page hr-workspace-page' },
  imports: [
    CompanyUnavailable,
    PageLoading,
    CardTonePipe,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
  ],
  templateUrl: './hr-compliance.html',
  styleUrls: ['./hr.css', './hr-directory.css', './hr-tables.css', './hr-queues.css'],
})
export class HrCompliance {
  protected readonly api = inject(WorkforceComplianceApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly q = computed(() => this.params().get('q') ?? '');
  protected readonly status = computed(() => this.params().get('check') ?? 'outstanding');
  protected readonly type = computed(() => this.params().get('checkType') ?? '');
  protected readonly branch = computed(() => this.params().get('branch') ?? '');
  protected readonly query = computed(() =>
    new URLSearchParams({
      q: this.q(),
      check: this.status(),
      checkType: this.type(),
      branch: this.branch(),
      page: String(this.page()),
      page_size: String(this.pageSize),
    }).toString(),
  );
  constructor() {
    effect(() => {
      const query = this.query();
      this.api.scope();
      untracked(() => {
        void this.api.load(query);
      });
    });
  }
  protected readonly types = computed(() => this.api.page()?.meta.types ?? []);
  protected readonly branches = computed(() => this.api.page()?.meta.branches ?? []);
  protected readonly total = computed(() => this.api.page()?.count ?? 0);
  protected readonly visible = computed(() => this.api.page()?.results ?? []);
  protected readonly pageSize = 10;
  protected readonly page = computed(() => Math.max(1, Number(this.params().get('page')) || 1));
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  protected readonly currentPage = computed(() => this.api.page()?.meta.page ?? 1);
  protected readonly stats = computed(() => [
    {
      label: 'Checks Not Started',
      value: this.api.page()?.meta.counts.not_started ?? '—',
      caption: 'Checks still to be completed',
      status: 'Not started',
      icon: 'fact_check',
      color: '#008afa',
    },
    {
      label: 'Awaiting Review',
      value: this.api.page()?.meta.counts.awaiting_review ?? '—',
      caption: 'Evidence or verification needed',
      status: 'Awaiting review',
      icon: 'pending_actions',
      color: '#03a6c1',
    },
    {
      label: 'Expiring Soon',
      value: this.api.page()?.meta.counts.due_soon ?? '—',
      caption: 'Renew within 60 days',
      status: 'Due soon',
      icon: 'event_upcoming',
      color: '#ff8a00',
    },
    {
      label: 'Expired Checks',
      value: this.api.page()?.meta.counts.expired ?? '—',
      caption: 'Renewal overdue',
      status: 'Expired',
      icon: 'warning',
      color: '#ff3047',
    },
  ]);
  protected set(key: string, value: string | number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value || null, ...(key === 'page' ? {} : { page: null }) },
      queryParamsHandling: 'merge',
    });
  }
  protected clear(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
  protected export(): void {
    void this.api.export(this.query());
  }
}
