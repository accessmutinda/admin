import { CardTonePipe } from '../../../shared/ui/card-tone.pipe';
import { QuickActions } from '../shared/quick-actions';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { CvSelect } from '../../../shared/ui/select';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HrService } from './hr.service';
import { complianceRows } from './hr-queues.models';
import { checkState, staffRecord, today, DAYS } from './hr.models';

@Component({
  selector: 'cv-hr-workspace',
  host: { class: 'module-page people-page hr-workspace-page' },
  imports: [
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
  protected readonly branches = computed(() =>
    [...new Set(this.hr.staff().map((p) => p.location))].sort(),
  );
  protected readonly roles = computed(() =>
    [...new Set(this.hr.staff().map((p) => p.role))].sort(),
  );
  protected readonly filtered = computed(() =>
    this.hr
      .staff()
      .filter((p) => {
        const text = `${p.name} ${p.hr.reference} ${p.email} ${p.hr.personal.phone}`.toLowerCase();
        return (
          text.includes(this.q().trim().toLowerCase()) &&
          (!this.branch() || p.location === this.branch()) &&
          (!this.role() || p.role === this.role()) &&
          (!this.driver() ||
            (this.driver() === 'yes' ? p.hr.personal.driver : !p.hr.personal.driver)) &&
          (!this.status() ||
            (this.status() === 'archived'
              ? ['Inactive', 'Left'].includes(p.hr.status)
              : p.hr.status === this.status()))
        );
      })
      .sort((a, b) =>
        this.sort() === 'za' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name),
      ),
  );
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 10)));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pages()));
  protected readonly pageNumbers = computed(() => {
    const start = Math.max(1, Math.min(this.currentPage() - 2, this.pages() - 4));
    return Array.from({ length: Math.min(5, this.pages()) }, (_, i) => start + i);
  });
  protected readonly visible = computed(() =>
    this.filtered().slice((this.currentPage() - 1) * 10, this.currentPage() * 10),
  );
  protected readonly directoryStats = computed(() => [
    {
      label: 'Staff Records',
      value: this.hr.staff().length,
      caption: 'Saved employee records',
      icon: 'groups',
      color: '#008afa',
      link: '/manage/people/staff',
      query: {},
    },
    {
      label: 'Active Staff',
      value: this.hr.staff().filter((person) => person.hr.status === 'Active').length,
      caption: 'Currently employed',
      icon: 'person_check',
      color: '#00a34e',
      link: '/manage/people/staff',
      query: { status: 'Active' },
    },
    {
      label: 'Inactive / Left',
      value: this.hr.staff().filter((person) => ['Inactive', 'Left'].includes(person.hr.status))
        .length,
      caption: 'Archived employment records',
      icon: 'person_off',
      color: '#677488',
      link: '/manage/people/staff',
      query: { status: 'archived' },
    },
  ]);
  protected complianceRate(): string {
    const checks = this.hr
      .staff()
      .flatMap((p) => p.hr.checks)
      .filter((c) => c.status !== 'Not required');
    return checks.length
      ? Math.round(
          (checks.filter((c) => c.status === 'Verified' && checkState(c) !== 'Expired').length /
            checks.length) *
            100,
        ) + '%'
      : this.hr.staff().length
        ? 'N/A'
        : '—';
  }
  protected availabilityLabel(p: import('../shared/management.store').Person): string {
    if (
      this.hr.store
        .data()
        .leaves.some(
          (l) =>
            (l.personId === p.id || (!l.personId && l.person === p.name)) &&
            (!l.status || l.status === 'Approved') &&
            l.start <= today() &&
            l.end >= today(),
        )
    )
      return 'On leave';
    if (!this.hr.store.data().people.find((v) => v.id === p.id)?.hr) return 'Not recorded';
    const day = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      timeZone: 'Africa/Nairobi',
    }).format(new Date());
    const record = staffRecord(p);
    if (record.weeklySlots && record.availabilityMode !== 'Custom times') {
      const index = DAYS.indexOf(day);
      const states = record.weeklySlots.map((slot) => slot.days[index]);
      return states.includes('Preferred')
        ? 'Preferred'
        : states.includes('Available')
          ? 'Available'
          : 'Unavailable';
    }
    return record.availability.find((a) => a.day === day)?.preference || 'Not recorded';
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
    return this.filtered().filter((p) => this.selectedIds().includes(p.id)).length;
  }
  protected exportSelected(): void {
    this.hr.export(this.filtered().filter((p) => this.selectedIds().includes(p.id)));
  }
  protected readonly stats = computed(() => [
    {
      label: 'Staff Records',
      value: this.hr.staff().length,
      icon: 'groups',
      link: '/manage/people/staff',
      query: {},
      caption: 'Employee register',
    },
    {
      label: 'Onboarding',
      value:
        this.hr.staff().filter((person) => person.hr.status === 'Onboarding').length +
        this.hr.drafts().length,
      icon: 'assignment_ind',
      link: '/manage/people/onboarding',
      query: {},
      caption: 'Starters and saved drafts',
    },
    {
      label: 'Compliance Actions',
      value: complianceRows(this.hr.staff()).filter((row) => row.state !== 'Verified').length,
      icon: 'verified_user',
      link: '/manage/people/compliance',
      query: {},
      caption: 'Outstanding check records',
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
  protected readonly overviewLinks = [
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
      title: 'Training academy',
      description: 'Courses, certificates and workforce learning.',
      icon: 'school',
      path: '/manage/learning',
    },
  ];
}
