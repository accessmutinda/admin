import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth/auth.service';

import type {
  CompanyAccessContext,
  ModuleConfiguration as ConfigurationDto,
  CompanyRole as RoleDto,
} from './company-access.generated';
export type AccessContext = CompanyAccessContext;
export type ModuleConfiguration = ConfigurationDto;
export type CompanyRole = RoleDto;
export type ProductModule = ModuleConfiguration['modules'][number];
export type ProductSubmodule = ProductModule['submodules'][number];
export type ProductPermission = ProductSubmodule['permissions'][number];

export const MODULE_CODES: Record<string, string> = {
  'Care delivery': 'care',
  'People & HR': 'people',
  'Training academy': 'academy',
  'Quality & compliance': 'quality',
  Finance: 'finance',
  'Reports & insights': 'reports',
  'Staff Portal': 'staff_portal',
  'Family Portal': 'family_portal',
  'Inspector Portal': 'inspector_portal',
};
const ACTION_CODES: Record<string, string> = {
  view: 'read',
  manage: 'edit',
  delete: 'archive',
  author: 'edit',
  assign: 'edit',
  review: 'approve',
  correct: 'edit',
  configure: 'edit',
  evidence: 'read',
  diagnostics: 'read',
};

export function routeAccess(url: string): [string, string][] {
  const parsed = new URL(url, 'https://local.invalid');
  const path = parsed.pathname;
  if (path.startsWith('/manage/care-plans')) return [['care', 'planning']];
  if (path.startsWith('/manage/clients')) {
    if (parsed.searchParams.get('section') === 'plan') return [['care', 'planning']];
    const area = path.split('/')[4] ?? '';
    const map: Record<string, string> = {
      risks: 'risks',
      medication: 'medication',
      visits: 'rostering',
      'visit-notes': 'recording',
      journal: 'recording',
      communications: 'communications',
      documents: 'documents',
      family: 'family',
      incidents: 'incidents',
      feedback: 'incidents',
    };
    return [['care', map[area] ?? 'records']];
  }
  if (path.startsWith('/manage/ecm')) return [['care', 'ecm']];
  if (path.startsWith('/manage/rota')) return [['care', 'rostering']];
  if (path.startsWith('/manage/recruitment')) return [['people', 'recruitment']];
  if (path.startsWith('/manage/leave')) return [['people', 'leave']];
  if (path.startsWith('/manage/reviews')) return [['people', 'performance']];
  if (path.startsWith('/manage/people')) {
    const area = path.split('/').at(-1) ?? '';
    const map: Record<string, string> = {
      onboarding: 'onboarding',
      compliance: 'compliance',
      availability: 'leave',
      documents: 'documents',
      reviews: 'performance',
      performance: 'performance',
      training: 'academy',
    };
    if (map[area] === 'academy') return [['academy', 'assignments']];
    return [['people', map[area] ?? 'records']];
  }
  if (path.startsWith('/manage/learning')) {
    const area = path.split('/')[3] ?? '';
    const map: Record<string, string> = {
      courses: 'courses',
      content: 'courses',
      structure: 'courses',
      questions: 'assessments',
      rules: 'assignments',
      manage: 'assignments',
      results: 'results',
      certificates: 'certificates',
      governance: 'governance',
      settings: 'governance',
      publish: 'governance',
      diagnostics: 'governance',
      reports: 'reports',
    };
    return [['academy', map[area] ?? '*']];
  }
  if (path.startsWith('/manage/supervisor')) return [['quality', 'supervision']];
  if (path.startsWith('/manage/quality')) {
    const area = path.split('/')[3] ?? '';
    const map: Record<string, string> = {
      'cqc-scorecard': 'scorecards',
      'inspection-readiness': 'inspection',
      'workforce-quality': 'workforce',
      'predictive-insights': 'reports',
      workspace:
        parsed.searchParams.get('tab') === 'Corrective actions'
          ? 'actions'
          : parsed.searchParams.get('tab') === 'Reports'
            ? 'reports'
            : 'assessments',
      new: 'assessments',
      assessments: 'assessments',
    };
    return [['quality', map[area] ?? (area ? 'dashboards' : '*')]];
  }
  if (path.startsWith('/manage/finance') || path.startsWith('/manage/payroll')) {
    const area = path.split('/')[3] ?? 'payroll';
    const view = parsed.searchParams.get('view');
    return [
      [
        'finance',
        view === 'Overtime' || parsed.searchParams.get('payrollView') === 'Timesheets'
          ? 'timesheets'
          : view === 'Settings'
            ? 'settings'
            : area === 'billing'
              ? parsed.searchParams.get('invoiceView') === 'Clients'
                ? 'clients'
                : 'suppliers'
              : area === 'overview'
                ? 'overview'
                : 'payroll',
      ],
    ];
  }
  if (
    path.startsWith('/staff-portal') ||
    path.startsWith('/manage/staff-portal') ||
    path === '/manage/staff-journal'
  ) {
    if (path.includes('/training'))
      return [
        ['staff_portal', '*'],
        ['academy', 'learner'],
      ];
    const area = path.split('/')[2] ?? 'dashboard';
    return [
      [
        'staff_portal',
        (
          {
            journal: 'journal',
            tasks: 'tasks',
            concerns: 'concerns',
            'service-users': 'clients',
            oversight: 'oversight',
          } as Record<string, string>
        )[area] ?? 'dashboard',
      ],
    ];
  }
  if (path.startsWith('/family')) {
    const area = path.startsWith('/family-portal') ? path.split('/')[2] : path.split('/')[4];
    const map: Record<string, string> = {
      visits: 'visits',
      medication: 'medication',
      documents: 'documents',
      messages: 'messages',
      invoices: 'invoices',
    };
    return [['family_portal', map[area ?? ''] ?? 'care']];
  }
  if (path.startsWith('/inspector')) {
    const area = path.split('/')[2] ?? '';
    const map: Record<string, string> = {
      clients: 'clients',
      staff: 'staff',
      medication: 'medication',
      incidents: 'incidents',
      quality: 'quality',
      visits: 'visits',
      reports: 'reports',
    };
    return [['inspector_portal', map[area] ?? 'provider']];
  }
  return [];
}

@Injectable({ providedIn: 'root' })
export class CompanyAccessService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly context = signal<AccessContext | null>(null);
  readonly error = signal('');
  readonly companyId = computed(() =>
    this.auth.isAuthenticated()
      ? ((this.auth.isSuperAdmin()
          ? this.auth.session()?.workspaceId
          : this.auth.profile()?.company_id) ?? '')
      : '',
  );
  private inFlight?: { id: string; generation: number; promise: Promise<void> };
  private generation = 0;
  constructor() {
    effect(() => {
      const id = this.companyId();
      this.auth.profile()?.id;
      untracked(() => {
        this.generation++;
        this.context.set(null);
        this.error.set('');
        if (id) void this.refresh();
      });
    });
    const focus = () => {
      if (this.companyId()) void this.refresh();
    };
    window.addEventListener('focus', focus);
    const timer = setInterval(() => {
      if (!document.hidden) focus();
    }, 10000);
    this.destroy.onDestroy(() => {
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(() => {
        if (this.companyId()) void this.refresh();
      });
  }
  refresh(): Promise<void> {
    const id = this.companyId();
    if (!id) {
      this.context.set(null);
      return Promise.resolve();
    }
    if (this.inFlight?.id === id && this.inFlight.generation === this.generation)
      return this.inFlight.promise;
    const generation = this.generation;
    const promise = this.auth
      .api<AccessContext>(`/companies/${id}/access-context`)
      .then((value) => {
        if (id !== this.companyId() || generation !== this.generation) return;
        this.context.set(value);
        this.error.set('');
        if (!this.canPath(this.router.url)) void this.router.navigateByUrl('/access-denied');
      })
      .catch((error) => {
        if (id === this.companyId() && generation === this.generation) {
          this.context.set(null);
          if (routeAccess(this.router.url).length) void this.router.navigateByUrl('/access-denied');
          this.error.set(
            error instanceof Error ? error.message : 'Access information unavailable.',
          );
        }
      })
      .finally(() => {
        if (this.inFlight?.promise === promise) this.inFlight = undefined;
      });
    this.inFlight = { id, generation, promise };
    return promise;
  }
  can(module: string, submodule = '*', action = 'read'): boolean {
    if (this.auth.isSuperAdmin()) return true;
    const context = this.context();
    if (!context || context.company_id !== this.companyId()) return false;
    if (context.platform) return true;
    if (!context.company_active) return false;
    const code = MODULE_CODES[module] ?? module;
    const act = ACTION_CODES[action] ?? action;
    return submodule === '*'
      ? context.permissions.some((p) => p.startsWith(code + '.') && p.endsWith('.' + act))
      : context.permissions.includes(`${code}.${submodule}.${act}`);
  }
  canPath(url: string, action = 'read'): boolean {
    const path = url.split(/[?#]/)[0];
    if (path.startsWith('/manage/companies') || path.startsWith('/manage/locations')) {
      if (this.auth.isSuperAdmin()) return true;
      const permission = path.includes('/access')
        ? 'company.roles.read'
        : path.includes('/modules')
          ? 'company.modules.read'
          : path.includes('/branding')
            ? 'company.branding.read'
            : path.includes('/contacts')
              ? 'company.contacts.read'
              : path.includes('/compliance')
                ? 'company.compliance.read'
                : path.includes('/settings') || path.includes('/integrations')
                  ? 'company.settings.read'
                  : path.startsWith('/manage/locations')
                    ? 'company.locations.read'
                    : 'company.profile.read';
      return this.core(permission);
    }
    if (path.startsWith('/manage/workflows'))
      return this.auth.isSuperAdmin() || this.core('company.workflows.read');
    return routeAccess(url).every(([module, submodule]) => this.can(module, submodule, action));
  }
  core(permission: string): boolean {
    return (
      !!this.context() &&
      this.context()!.company_id === this.companyId() &&
      (this.context()!.platform || this.context()!.core_permissions.includes(permission))
    );
  }
  configuration(id: string): Promise<ModuleConfiguration> {
    return this.auth.api(`/companies/${id}/module-configuration`);
  }
  change(
    id: string,
    etag: string,
    module: string,
    enabled: boolean,
    submodule?: string,
  ): Promise<ModuleConfiguration> {
    return this.auth.api(
      `/companies/${id}/module-configuration`,
      { module, enabled, ...(submodule ? { submodule } : {}) },
      'PATCH',
      { 'If-Match': etag },
    );
  }
  roles(id: string): Promise<{ results: CompanyRole[] }> {
    return this.auth.api(`/companies/${id}/roles`);
  }
  createRole(
    id: string,
    value: { code: string; name: string; description: string },
    key: string,
  ): Promise<CompanyRole> {
    return this.auth.api(`/companies/${id}/roles`, value, 'POST', { 'Idempotency-Key': key });
  }
  saveRole(
    id: string,
    role: CompanyRole,
    permissions: string[],
    core_permissions: string[],
    mfa_required: boolean,
  ): Promise<CompanyRole> {
    return this.auth.api(
      `/companies/${id}/roles/${role.id}/permissions`,
      { permissions, core_permissions, mfa_required },
      'PATCH',
      { 'If-Match': role.etag },
    );
  }
}
