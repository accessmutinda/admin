import { AcademyRefreshersApi } from './academy-refreshers-api.service';
import { AcademyTrainingRecordApi } from './academy-training-record-api.service';
import { AcademyMyAssessmentsApi } from './academy-my-assessments-api.service';
import { AcademyMyCoursesApi } from './academy-my-courses-api.service';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { StaffDashboardApi } from '../../staff-portal/staff-dashboard-api.service';
import { AcademyApi } from './academy-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyCertificatesApi } from './academy-certificates-api.service';
import { AcademyGovernanceApi } from './academy-governance-api.service';
import type { AcademyMyLearningRead } from './academy-my-learning.generated';

@Injectable()
export class AcademyMyLearningApi {
  private readonly courses = inject(AcademyMyCoursesApi);
  private withCourses = false;
  private withAssessments = false;
  private withTrainingRecord = false;
  private withRefreshers = false;
  private readonly refreshers = inject(AcademyRefreshersApi);
  private readonly training = inject(AcademyTrainingRecordApi);
  private readonly assessments = inject(AcademyMyAssessmentsApi);
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly staff = inject(StaffDashboardApi);
  private readonly results = inject(AcademyResultsApi);
  private readonly certificates = inject(AcademyCertificatesApi);
  private readonly governance = inject(AcademyGovernanceApi);
  readonly scope = inject(AcademyApi).scope;
  private readonly raw = signal<{ scope: string; data: AcademyMyLearningRead } | null>(null);
  readonly snapshot = computed(() =>
    this.raw()?.scope === this.scope() && this.access.can('academy', 'learner', 'read')
      ? this.raw()!.data
      : null,
  );
  readonly loading = signal(false);
  readonly error = signal('');
  readonly code = signal('');
  private generation = 0;
  private active = false;
  private pending?: { scope: string; promise: Promise<void> };
  constructor() {
    let previous = this.scope();
    effect(() => {
      const scope = this.scope();
      untracked(() => {
        if (scope === previous) return;
        previous = scope;
        this.generation++;
        this.raw.set(null);
        this.error.set('');
        this.code.set('');
        if (this.active) void this.load();
      });
    });
  }
  activate() {
    this.active = true;
  }
  stop() {
    this.active = false;
    this.generation++;
    this.pending = undefined;
    this.raw.set(null);
    this.courses.clear();
    this.assessments.clear();
    this.training.clear();
    this.refreshers.clear();
    this.loading.set(false);
  }
  fail(error: unknown) {
    this.raw.set(null);
    this.courses.clear();
    this.assessments.clear();
    this.training.clear();
    this.refreshers.clear();
    this.code.set((error as any)?.code || 'unavailable');
    this.error.set(
      error instanceof Error
        ? error.message
        : 'Your learning record could not be loaded. Please try again.',
    );
  }
  async load(
    withCourses = this.withCourses,
    withAssessments = this.withAssessments,
    withTrainingRecord = this.withTrainingRecord,
    withRefreshers = this.withRefreshers,
  ): Promise<void> {
    this.withCourses = withCourses;
    this.withAssessments = withAssessments;
    this.withTrainingRecord = withTrainingRecord;
    this.withRefreshers = withRefreshers;
    const scope = this.scope();
    if (this.pending?.scope === scope) return this.pending.promise;
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    this.code.set('');
    const promise = (async () => {
      try {
        const path = `/companies/${this.access.companyId()}/academy/learning/dashboard`;
        const first = await this.auth.api<AcademyMyLearningRead>(path);
        if (scope !== this.scope() || generation !== this.generation) return;
        if (
          first.company_id !== this.access.companyId() ||
          String(first.actor_id) !== String(this.auth.profile()?.id)
        )
          throw Error('This learning record does not belong to your current staff account.');
        this.raw.set(null);
        await this.results.load(true, true);
        await Promise.all([this.certificates.load(true), this.governance.load(true)]);
        if (scope !== this.scope() || generation !== this.generation) return;
        const latest = await this.auth.api<AcademyMyLearningRead>(path);
        if (scope !== this.scope() || generation !== this.generation) return;
        if (
          latest.company_id !== first.company_id ||
          latest.actor_id !== first.actor_id ||
          latest.staff.id !== first.staff.id ||
          latest.staff.employment_id !== first.staff.employment_id ||
          latest.staff.id !== this.results.me()?.id
        )
          throw Error('The staff learning context changed. Reopen My learning.');
        if (
          this.results.assignments().some((a) => a.personId !== latest.staff.id) ||
          this.results.attempts().some((a) => a.personId !== latest.staff.id) ||
          this.certificates.certificates().some((c) => c.personId !== latest.staff.id)
        )
          throw Error('The learning response contains another staff member’s records.');
        const active = this.results.assignments().filter((a) => !a.archived);
        const ids = new Set(active.map((a) => a.id));
        const attempts = new Set(this.results.attempts().map((a) => a.id));
        const certificates = new Set(this.certificates.certificates().map((c) => c.id));
        if (
          ids.size !== latest.stats.assigned ||
          Object.keys(latest.statuses).length !== ids.size ||
          Object.keys(latest.statuses).some((id) => !ids.has(id)) ||
          active.filter((a) => !!a.completedAt).length !== latest.stats.completed ||
          latest.deadline_ids.some((id) => !ids.has(id)) ||
          latest.recent_attempt_ids.some((id) => !attempts.has(id)) ||
          (latest.latest_certificate_id && !certificates.has(latest.latest_certificate_id))
        )
          throw Error('Your learning records changed while loading. Please try again.');
        if (withCourses) await this.courses.load();
        if (withAssessments) await this.assessments.load();
        if (withTrainingRecord) await this.training.load();
        if (withRefreshers) await this.refreshers.load();
        if (scope !== this.scope() || generation !== this.generation) return;
        this.raw.set({ scope, data: latest });
        this.staff.rememberCompany(latest.company, latest.actor_id);
      } catch (error) {
        if (scope === this.scope() && generation === this.generation) this.fail(error);
      } finally {
        if (generation === this.generation) {
          this.loading.set(false);
          this.pending = undefined;
        }
      }
    })();
    this.pending = { scope, promise };
    return promise;
  }
}
