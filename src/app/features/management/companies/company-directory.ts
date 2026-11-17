import { CompanyLoading } from './company-loading';
import { CompanySetupBanner } from './company-setup-banner';
import { Skeleton } from '../../../shared/ui/skeleton';
import { CompaniesApiService } from './companies-api.service';
import { CardTonePipe } from '../../../shared/ui/card-tone.pipe';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { companyInitials } from '../../../core/auth/models/workspace';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CvSelect } from '../../../shared/ui/select';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { Company, ManagementStore } from '../shared/management.store';
import { companyCompletion, companyModifiedAt } from './company-profile.models';

type SortColumn =
  'name' | 'code' | 'sector' | 'region' | 'status' | 'completion' | 'admin' | 'plan' | 'modifiedAt';
type FilterKey = 'status' | 'region' | 'service' | 'plan' | 'completion' | 'updated';

@Component({
  selector: 'cv-company-directory',
  host: { class: 'module-page companies-page company-directory-page' },
  imports: [
    CompanySetupBanner,
    Skeleton,
    CompanyLoading,
    CardTonePipe,
    FormsModule,
    RouterLink,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    CvSelect,
  ],
  templateUrl: './company-directory.html',
})
export class CompanyDirectory {
  protected readonly canManage = computed(() => this.auth.isSuperAdmin());
  protected readonly api = inject(CompaniesApiService);
  protected readonly companyInitials = companyInitials;
  protected readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly search = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.get('search') ?? '',
  );
  protected readonly filters = signal<Record<FilterKey, string>>({
    status: 'all',
    region: 'all',
    service: 'all',
    plan: 'all',
    completion: 'all',
    updated: 'all',
  });
  protected readonly page = signal(1);
  protected readonly pageSize = 10;
  protected readonly sortColumn = signal<SortColumn>('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly completion = companyCompletion;
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly canCompleteProfiles = computed(() => this.auth.isSuperAdmin());
  protected readonly nextIncompleteCompany = computed(() =>
    this.canCompleteProfiles()
      ? this.rows().find((company) => {
          const completion = this.completion(company);
          return completion != null && completion < 100;
        })
      : undefined,
  );
  protected readonly columns: { key: SortColumn; label: string }[] = [
    { key: 'name', label: 'Company Name' },
    { key: 'code', label: 'Company Code' },
    { key: 'sector', label: 'Service Type' },
    { key: 'region', label: 'Region / County' },
    { key: 'status', label: 'Status' },
    { key: 'completion', label: 'Profile Completion' },
    { key: 'admin', label: 'Primary Admin' },
    { key: 'plan', label: 'Subscription Plan' },
    { key: 'modifiedAt', label: 'Last Updated' },
  ];
  protected isActive(company: Company): boolean {
    return company.active ?? company.modules.length > 0;
  }
  protected region(company: Company): string {
    return (
      company.region ||
      company.contacts?.addresses.registered.county ||
      company.contacts?.addresses.headOffice.county ||
      ''
    ).trim();
  }
  protected plan(company: Company): string {
    const plan = company.subscription?.plan;
    return plan && plan !== 'Not recorded' ? plan : '';
  }
  protected admin(company: Company): string {
    const data =
      this.store.records()[company.id] ??
      (company.id === this.store.companyId() ? this.store.data() : undefined);
    const member = data?.members.find((m) => m.role === 'Company Admin' && m.status === 'Active');
    const summary = this.api.companies?.().find((c) => c.id === company.id)?.primary_administrator;
    return member ? member.name || member.email : summary?.name || summary?.email || '';
  }
  protected readonly regions = computed(() =>
    [
      ...new Set(
        this.store
          .companies()
          .map((c) => this.region(c))
          .filter(Boolean),
      ),
    ].sort(),
  );
  protected readonly services = computed(() =>
    [
      ...new Set(
        this.store
          .companies()
          .map((c) => c.sector)
          .filter(Boolean),
      ),
    ].sort(),
  );
  protected readonly plans = computed(() =>
    [
      ...new Set(
        this.store
          .companies()
          .map((c) => this.plan(c))
          .filter(Boolean),
      ),
    ].sort(),
  );
  protected readonly stats = computed(() => {
    const all = this.store.companies();
    const total = all.length;
    const active = all.filter((c) => this.isActive(c)).length;
    const pending = all.some((c) => this.completion(c) == null)
      ? null
      : all.filter((c) => this.completion(c)! < 75).length;
    return [
      {
        label: 'Total Companies',
        value: total,
        hint: 'Across your companies',
        shortLabel: '',
        tooltip: '',
        progress: false,
        icon: 'domain',
        color: '#008afa',
      },
      {
        label: 'Active Companies',
        value: active,
        shortLabel: 'active',
        tooltip: '',
        hint: 'Of all companies',
        progress: true,
        icon: 'domain',
        color: '#00a34e',
      },
      {
        label: 'Pending Setup',
        value: pending,
        hint: 'Of all companies',
        shortLabel: 'pending',
        tooltip:
          'Companies with profile completion below 75%. Pending setup can overlap with active status.',
        progress: true,
        icon: 'schedule',
        color: '#ffb000',
      },
      {
        label: 'Inactive Companies',
        value: total - active,
        shortLabel: 'inactive',
        tooltip:
          'Companies marked inactive. For older records without a saved status, no enabled modules means inactive.',
        hint: 'Of all companies',
        progress: true,
        icon: 'block',
        color: '#ff3047',
      },
    ];
  });
  protected readonly filtered = computed(() => {
    const now = Date.now();
    const q = this.search().trim().toLowerCase();
    const f = this.filters();
    return this.store.companies().filter((c) => {
      const region = this.region(c),
        plan = this.plan(c),
        completion = this.completion(c);
      const addresses = c.contacts
        ? Object.values(c.contacts.addresses)
            .flatMap((a) => [a.line1, a.line2, a.city, a.county, a.postcode, a.country])
            .join(' ')
        : '';
      const matchesSearch =
        `${c.name} ${c.code} ${c.sector} ${this.admin(c)} ${c.postcode} ${c.headOfficeAddress ?? ''} ${addresses}`
          .toLowerCase()
          .includes(q);
      const modified = Date.parse(c.modifiedAt ?? '');
      const updated =
        f.updated === 'all' ||
        (f.updated === 'missing'
          ? !Number.isFinite(modified)
          : Number.isFinite(modified) &&
            modified <= now &&
            modified >= now - Number(f.updated) * 86400000);
      return (
        matchesSearch &&
        (f.status === 'all' || this.isActive(c) === (f.status === 'active')) &&
        (f.region === 'all' || (f.region === 'missing' ? !region : region === f.region)) &&
        (f.service === 'all' || (f.service === 'missing' ? !c.sector : c.sector === f.service)) &&
        (f.plan === 'all' || (f.plan === 'missing' ? !plan : plan === f.plan)) &&
        updated &&
        (f.completion === 'all' ||
          (completion != null &&
            (f.completion === 'complete'
              ? completion === 100
              : f.completion === 'pending'
                ? completion < 75
                : completion >= 75 && completion < 100)))
      );
    });
  });
  private sortValue(company: Company, column: SortColumn): string | number {
    switch (column) {
      case 'region':
        return this.region(company);
      case 'admin':
        return this.admin(company);
      case 'plan':
        return this.plan(company);
      case 'status':
        return this.isActive(company) ? 'Active' : 'Inactive';
      case 'completion':
        return this.completion(company) ?? '';
      case 'modifiedAt':
        return Number.isFinite(Date.parse(company.modifiedAt ?? ''))
          ? Date.parse(company.modifiedAt!)
          : '';
      default:
        return company[column];
    }
  }
  protected readonly sorted = computed(() =>
    [...this.filtered()].sort((a, b) => {
      const av = this.sortValue(a, this.sortColumn()),
        bv = this.sortValue(b, this.sortColumn());
      if (av === '' && bv !== '') return 1;
      if (bv === '' && av !== '') return -1;
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'en', { numeric: true, sensitivity: 'base' });
      return (this.sortDirection() === 'asc' ? cmp : -cmp) || a.id.localeCompare(b.id);
    }),
  );
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );
  protected readonly currentPage = computed(() =>
    Math.min(this.pageCount(), Math.max(1, this.page())),
  );
  protected readonly rows = computed(() =>
    this.sorted().slice(
      (this.currentPage() - 1) * this.pageSize,
      this.currentPage() * this.pageSize,
    ),
  );
  constructor() {
    effect(() => {
      for (const company of this.rows()) void this.api.ensureBrandLogo?.(company.id);
    });
  }
  protected readonly pageNumbers = computed(() => {
    const start = Math.max(1, Math.min(this.currentPage() - 2, this.pageCount() - 4));
    return Array.from({ length: Math.min(5, this.pageCount()) }, (_, i) => start + i);
  });
  protected readonly selectedIds = computed(() =>
    this.store
      .companies()
      .filter((c) => this.selected().has(c.id))
      .map((c) => c.id),
  );
  protected readonly allPageSelected = computed(
    () => this.rows().length > 0 && this.rows().every((c) => this.selected().has(c.id)),
  );
  protected readonly somePageSelected = computed(
    () => !this.allPageSelected() && this.rows().some((c) => this.selected().has(c.id)),
  );
  protected readonly start = computed(() =>
    this.filtered().length ? (this.currentPage() - 1) * this.pageSize + 1 : 0,
  );
  protected readonly end = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filtered().length),
  );
  protected readonly hasFilters = computed(
    () => !!this.search() || Object.values(this.filters()).some((value) => value !== 'all'),
  );
  protected setSearch(value: string): void {
    this.search.set(value);
    this.resetResults();
  }
  protected setFilter(key: FilterKey, value: string): void {
    this.filters.update((filters) => ({ ...filters, [key]: value }));
    this.resetResults();
  }
  private resetResults(): void {
    this.page.set(1);
    this.selected.set(new Set());
    this.error.set('');
  }
  protected clearFilters(): void {
    this.search.set('');
    this.filters.set({
      status: 'all',
      region: 'all',
      service: 'all',
      plan: 'all',
      completion: 'all',
      updated: 'all',
    });
    this.resetResults();
  }
  protected sort(column: SortColumn): void {
    this.sortDirection.set(
      this.sortColumn() === column && this.sortDirection() === 'asc' ? 'desc' : 'asc',
    );
    this.sortColumn.set(column);
    this.page.set(1);
  }
  protected clearSelection(): void {
    this.selected.set(new Set());
  }
  protected toggle(id: string): void {
    this.selected.update((ids) => {
      const next = new Set(ids);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  protected togglePage(): void {
    const all = this.allPageSelected();
    this.selected.update((ids) => {
      const next = new Set(ids);
      for (const row of this.rows()) all ? next.delete(row.id) : next.add(row.id);
      return next;
    });
  }
  protected async changeStatus(active: boolean, ids = this.selectedIds()): Promise<void> {
    if (this.busy() || !ids.length || !this.auth.isSuperAdmin()) return;
    const changed = ids.filter((id) => {
      const company = this.store.companies().find((c) => c.id === id);
      return company && this.isActive(company) !== active;
    });
    if (!changed.length) {
      this.toast.success('Selected companies already have this status.');
      return;
    }
    if (
      !window.confirm(
        `Mark ${changed.length} ${changed.length === 1 ? 'company' : 'companies'} as ${active ? 'active' : 'inactive'}? This changes platform access; saved records stay intact.`,
      )
    )
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.bulkLifecycle(changed, active ? 'active' : 'suspended');
      const failed = result.filter((r) => !r.ok);
      this.selected.set(new Set(failed.map((r) => r.id)));
      if (failed.length)
        this.error.set(
          failed
            .map(
              (r) =>
                `${this.store.companies().find((c) => c.id === r.id)?.name ?? r.id}: ${r.detail}`,
            )
            .join(' '),
        );
      else this.toast.success('Company status updated.');
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  protected async exportList(selectedOnly = false): Promise<void> {
    if (this.busy()) return;
    const ids = selectedOnly ? this.selectedIds() : this.sorted().map((c) => c.id);
    if (!ids.length) return;
    this.error.set('');
    this.busy.set(true);
    try {
      const blob = await this.api.exportDirectory(ids);
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'companies.csv';
        link.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
