import { PeopleApiService, DirectoryStaff } from './people-api.service';
import { Skeleton } from '../../../shared/ui/skeleton';
import { CompanyUnavailable } from '../shared/company-unavailable';
import { CardTonePipe } from '../../../shared/ui/card-tone.pipe';
import { QuickActions } from '../shared/quick-actions';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { CvSelect } from '../../../shared/ui/select';
import { Component, computed, inject, signal, effect, untracked, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HrService } from './hr.service';

@Component({
  selector: 'cv-hr-workspace',
  host: { class: 'module-page people-page hr-workspace-page' },
  imports: [
    Skeleton,
    CompanyUnavailable,
    CardTonePipe,
    QuickActions,
    MatSelectModule,
    MatMenuModule,
    CvSelect,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './hr-workspace.html',
  styleUrls: ['./hr.css', './hr-directory.css', './hr-tables.css'],
})
export class HrWorkspace {
  protected readonly hr = inject(HrService);
  protected readonly api = inject(PeopleApiService);
  protected readonly company = computed(() => {
    const value = this.api.summary()?.company;
    return value
      ? {
          ...value,
          logo:
            this.hr.store.company()?.id === value.id
              ? (this.hr.store.company()?.logo ?? null)
              : null,
          headOfficeAddress: value.head_office_address,
        }
      : null;
  });
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly driver = computed(() => this.params().get('driver') ?? '');
  protected readonly mode = this.route.snapshot.data['hrMode'] as string;
  protected readonly headings: Record<string, string> = {
    overview: 'People & HR',
    directory: 'Staff Directory',
  };
  protected readonly q = computed(() => this.params().get('q') ?? '');
  protected readonly branch = computed(() => this.params().get('branch') ?? '');
  protected readonly role = computed(() => this.params().get('role') ?? '');
  protected readonly status = computed(() => this.params().get('status') ?? '');
  protected readonly view = computed(() => this.params().get('view') ?? 'table');
  protected readonly sort = computed(() => this.params().get('sort') ?? 'az');
  protected readonly page = computed(() => Math.max(1, Number(this.params().get('page')) || 1));
  protected readonly branches = computed(() => this.api.directory()?.meta.branches ?? []);
  protected readonly roles = computed(() => this.api.directory()?.meta.roles ?? []);
  protected readonly filtered = computed(() => this.api.directory()?.results ?? []);
  protected readonly count = computed(() => this.api.directory()?.count ?? 0);
  protected readonly total = computed(() => this.api.summary()?.totals.staff ?? 0);
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.count() / 10)));
  protected readonly currentPage = computed(() => this.api.directory()?.meta.page ?? 1);
  protected readonly pageNumbers = computed(() => {
    const start = Math.max(1, Math.min(this.currentPage() - 2, this.pages() - 4));
    return Array.from({ length: Math.min(5, this.pages()) }, (_, i) => start + i);
  });
  protected readonly visible = this.filtered;
  protected readonly apiQuery = computed(() => {
    const query = new URLSearchParams({
      page: String(this.page()),
      page_size: this.mode === 'overview' ? '5' : '10',
      ordering: this.sort() === 'za' ? '-name' : 'name',
    });
    for (const [key, value] of Object.entries({
      q: this.q(),
      branch: this.branch(),
      role: this.role(),
      status: this.status(),
      driver: this.driver(),
    }))
      if (value) query.set(key, value);
    return query.toString();
  });
  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastFilters = '';
    effect(() => {
      const company = this.api.companyId();
      const query = this.apiQuery();
      const allowed = this.api.allowed();
      const filters = new URLSearchParams(query);
      filters.delete('page');
      untracked(() => {
        const filterKey = company + ':' + filters.toString();
        if (filterKey !== lastFilters) this.selectedIds.set([]);
        lastFilters = filterKey;
        clearTimeout(timer);
        this.api.reset();
        if (allowed && company) timer = setTimeout(() => void this.api.load(query), 150);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(timer);
      this.api.reset();
    });
  }
  protected reload(): void {
    void this.api.load(this.apiQuery());
  }
  protected exportAll(): void {
    void this.api.export(this.apiQuery());
  }
  protected readonly directoryStats = computed(() => [
    {
      label: 'Staff Records',
      value: this.total(),
      caption: 'Saved employee records',
      icon: 'groups',
      color: '#008afa',
      link: '/manage/people/staff',
      query: {},
    },
    {
      label: 'Active Staff',
      value: this.api.summary()?.totals.active ?? 0,
      caption: 'Currently employed',
      icon: 'person_check',
      color: '#00a34e',
      link: '/manage/people/staff',
      query: { status: 'Active' },
    },
    {
      label: 'Inactive / Left',
      value: (this.api.summary()?.totals.inactive ?? 0) + (this.api.summary()?.totals.left ?? 0),
      caption: 'Archived employment records',
      icon: 'person_off',
      color: '#677488',
      link: '/manage/people/staff',
      query: { status: 'archived' },
    },
  ]);
  protected complianceRate(): string {
    const value = this.api.summary()?.totals.compliance_percent;
    return value == null ? 'Not available' : value + '%';
  }
  protected availabilityLabel(person: DirectoryStaff): string {
    return person.availability ?? 'Not recorded';
  }
  protected toggleSelected(id: string, checked: boolean): void {
    this.selectedIds.update((ids) =>
      checked ? [...new Set([...ids, id])] : ids.filter((v) => v !== id),
    );
  }
  protected allSelected(): boolean {
    return (
      !!this.visible().length && this.visible().every((p) => this.selectedIds().includes(p.id))
    );
  }
  protected someSelected(): boolean {
    return !this.allSelected() && this.visible().some((p) => this.selectedIds().includes(p.id));
  }
  protected selectPage(checked: boolean): void {
    for (const p of this.visible()) this.toggleSelected(p.id, checked);
  }
  protected selectedCount(): number {
    return this.selectedIds().length;
  }
  protected exportSelected(): void {
    void this.api.export(this.apiQuery(), this.selectedIds());
  }
  protected readonly stats = computed(() => [
    {
      label: 'Staff Records',
      value: this.total(),
      icon: 'groups',
      link: '/manage/people/staff',
      query: {},
      caption: 'Employee register',
    },
    {
      label: 'Onboarding',
      value: this.api.summary()?.totals.onboarding ?? 0,
      icon: 'assignment_ind',
      link: '/manage/people/onboarding',
      query: {},
      caption: 'Staff in onboarding',
    },
    {
      label: 'Compliance Actions',
      value: this.api.summary()?.totals.compliance_actions ?? '—',
      icon: 'verified_user',
      link: '/manage/people/compliance',
      query: {},
      caption: 'Not available',
    },
  ]);
  protected set(key: string, value: string | number | boolean): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value || null, ...(key === 'page' ? {} : { page: null }) },
      queryParamsHandling: 'merge',
    });
  }
  protected clear(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
  private readonly allOverviewLinks = [
    {
      title: 'User Management',
      description: 'Staff login accounts, password resets and MFA security.',
      icon: 'manage_accounts',
      path: '/manage/people/users',
    },
    {
      title: 'Staff Directory',
      description: 'Find employees, manage records and view readiness.',
      icon: 'groups',
      path: '/manage/people/staff',
    },
    {
      title: 'Recruitment',
      description: 'Vacancies, applications and accepted offers.',
      icon: 'person_search',
      path: '/manage/recruitment',
    },
    {
      title: 'Onboarding',
      description: 'Resume staff setup and complete starter tasks.',
      icon: 'assignment_ind',
      path: '/manage/people/onboarding',
    },
    {
      title: 'Workforce Compliance',
      description: 'Review evidence, renewals and missing checks.',
      icon: 'verified_user',
      path: '/manage/people/compliance',
    },
    {
      title: 'Availability & Leave',
      description: 'Review absences and keep working patterns current.',
      icon: 'calendar_month',
      path: '/manage/leave',
    },
    {
      title: 'Supervision & Appraisals',
      description: 'Manage conversations and follow-up actions.',
      icon: 'forum',
      path: '/manage/reviews',
    },
    {
      title: 'CareVerity Academy',
      description: 'Courses, certificates and workforce learning.',
      icon: 'school',
      path: '/manage/learning',
    },
  ];
  protected readonly overviewLinks = computed(() =>
    this.allOverviewLinks.filter((item) => this.api.access.canPath(item.path)),
  );
}
