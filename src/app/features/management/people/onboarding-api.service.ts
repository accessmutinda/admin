import { OnboardingStaffApi } from './onboarding-staff-api.service';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { API_BASE } from '../../../core/auth/auth-api';
import type {
  RecruitmentOnboardingItem,
  RecruitmentOnboardingPage,
} from '../recruitment/recruitment.generated';
export type OnboardingItem = RecruitmentOnboardingItem;
type QueuePage = RecruitmentOnboardingPage;
@Injectable({ providedIn: 'root' })
export class OnboardingApi {
  private readonly auth = inject(AuthService);
  private readonly staff = inject(OnboardingStaffApi);
  readonly access = inject(CompanyAccessService);
  readonly companyId = this.access.companyId;
  readonly rows = signal<OnboardingItem[]>([]);
  readonly meta = signal<QueuePage['meta'] | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly activationBusy = signal(false);
  async activate(id: string, etag: string): Promise<string> {
    if (this.activationBusy()) throw Error('Activation is already in progress.');
    this.activationBusy.set(true);
    try {
      const staff = this.staff;
      await staff.load(id);
      if (staff.error() || !staff.value())
        throw Error(staff.error() || 'Reload this staff record.');
      const name = staff.person()!.name;
      await staff.activate(id, etag);
      return name;
    } finally {
      this.activationBusy.set(false);
    }
  }
  readonly allowed = computed(() => this.access.can('people', 'onboarding', 'read'));
  readonly scope = computed(
    () =>
      `${this.auth.profile()?.id ?? ''}:${this.companyId()}:${this.allowed()}:${this.access.can('people', 'recruitment', 'read') && this.access.can('people', 'records', 'create') && this.access.can('people', 'onboarding', 'create')}`,
  );
  private generation = 0;
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => {
        this.generation++;
        this.rows.set([]);
        this.meta.set(null);
        this.error.set('');
        this.loading.set(true);
      });
    });
  }
  async load(lane: string, q: string, branch: string): Promise<void> {
    const company = this.companyId(),
      scope = this.scope(),
      generation = ++this.generation;
    this.rows.set([]);
    this.loading.set(true);
    this.error.set('');
    if (!company || !this.allowed()) {
      this.loading.set(false);
      return;
    }
    try {
      const values = new URLSearchParams({
        lane,
        q,
        page_size: '100',
        ...(branch ? { branch } : {}),
      });
      let path: string | null = `/companies/${company}/hr/onboarding?${values}`,
        meta: QueuePage['meta'] | null = null;
      const rows: OnboardingItem[] = [];
      const visited = new Set<string>();
      while (path) {
        if (visited.has(path) || visited.size >= 100)
          throw Error('Narrow the onboarding search before continuing.');
        visited.add(path);
        const response: QueuePage = await this.auth.api(path);
        if (response.meta.company_id !== company)
          throw Error('The onboarding queue does not match this company.');
        rows.push(...response.results);
        meta = response.meta;
        if (response.next) {
          const next = new URL(response.next, API_BASE),
            base = new URL(API_BASE);
          if (
            next.origin !== base.origin ||
            !next.pathname.startsWith(base.pathname + `/companies/${company}/`)
          )
            throw Error('The onboarding page link is invalid.');
          path = next.pathname.slice(base.pathname.length) + next.search;
        } else path = null;
      }
      if (
        generation !== this.generation ||
        scope !== this.scope() ||
        company !== this.companyId() ||
        !this.allowed()
      )
        return;
      this.rows.set(rows);
      this.meta.set(meta);
    } catch (error) {
      if (generation === this.generation && scope === this.scope()) {
        this.rows.set([]);
        this.meta.set(null);
        this.error.set(error instanceof Error ? error.message : 'Onboarding is unavailable.');
      }
    } finally {
      if (generation === this.generation && scope === this.scope()) this.loading.set(false);
    }
  }
}
