import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AcademyApi } from './academy-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import type { AcademyMyAssessmentsRead } from './academy-my-assessments.generated';

@Injectable({ providedIn: 'root' })
export class AcademyMyAssessmentsApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly results = inject(AcademyResultsApi);
  private readonly scope = inject(AcademyApi).scope;
  private readonly raw = signal<{ scope: string; data: AcademyMyAssessmentsRead } | null>(null);
  private generation = 0;
  readonly snapshot = computed(() =>
    this.raw()?.scope === this.scope() &&
    this.access.can('academy', 'learner', 'read') &&
    this.raw()?.data.person_id === this.results.me()?.id
      ? this.raw()!.data
      : null,
  );
  clear() {
    this.generation++;
    this.raw.set(null);
  }
  async load() {
    const scope = this.scope(),
      generation = ++this.generation;
    this.raw.set(null);
    const data = await this.auth.api<AcademyMyAssessmentsRead>(
      `/companies/${this.access.companyId()}/academy/learning/assessments`,
    );
    if (scope !== this.scope() || generation !== this.generation) return;
    if (
      data.company_id !== this.access.companyId() ||
      String(data.actor_id) !== String(this.auth.profile()?.id) ||
      data.person_id !== this.results.me()?.id
    )
      throw Error('The assessment record does not belong to your current staff account.');
    const active = this.results.assignments().filter((a) => !a.archived);
    const attempts = this.results.attempts();
    if (
      new Set(data.assignment_ids).size !== active.length ||
      data.assignment_ids.length !== active.length ||
      data.assignment_ids.some(
        (id) => !active.some((a) => a.id === id && a.personId === data.person_id),
      ) ||
      data.attempts.length !== attempts.length ||
      new Set(data.attempts.map((a) => a.id)).size !== attempts.length ||
      data.attempts.some(
        (row) =>
          !attempts.some(
            (a) =>
              a.id === row.id &&
              a.assignmentId === row.assignment_id &&
              a.personId === data.person_id &&
              (row.action !== 'result' || !!a.submittedAt) &&
              (row.action !== 'resume' || !a.submittedAt) &&
              (row.status === 'Invalidated') === !!a.invalidatedAt,
          ),
      )
    )
      throw Error('Your assessments changed while loading. Please try again.');
    this.raw.set({ scope, data });
  }
  attempt(id: string) {
    return this.snapshot()?.attempts.find((row) => row.id === id);
  }
}
