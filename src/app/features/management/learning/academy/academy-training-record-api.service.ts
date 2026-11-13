import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AcademyApi } from './academy-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyCertificatesApi } from './academy-certificates-api.service';
import type { AcademyTrainingRecordRead } from './academy-training-record.generated';

@Injectable({ providedIn: 'root' })
export class AcademyTrainingRecordApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly results = inject(AcademyResultsApi);
  private readonly certificates = inject(AcademyCertificatesApi);
  private readonly scope = inject(AcademyApi).scope;
  private readonly raw = signal<{ scope: string; data: AcademyTrainingRecordRead } | null>(null);
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
  row(id: string) {
    return this.snapshot()?.rows.find((row) => row.id === id);
  }
  async load() {
    const scope = this.scope(),
      generation = ++this.generation;
    this.raw.set(null);
    const data = await this.auth.api<AcademyTrainingRecordRead>(
      `/companies/${this.access.companyId()}/academy/learning/training-record`,
    );
    if (scope !== this.scope() || generation !== this.generation) return;
    if (
      data.company_id !== this.access.companyId() ||
      String(data.actor_id) !== String(this.auth.profile()?.id) ||
      data.person_id !== this.results.me()?.id
    )
      throw Error('The training record does not belong to your current staff account.');
    const assignments = this.results.assignments(),
      attempts = this.results.attempts(),
      certificates = this.certificates.certificates(),
      requests = this.certificates.requests();
    if (
      data.rows.length !== assignments.length ||
      new Set(data.rows.map((r) => r.id)).size !== assignments.length ||
      data.rows.some(
        (row) =>
          !assignments.some(
            (a) =>
              a.id === row.id &&
              a.personId === data.person_id &&
              a.courseId === row.course_id &&
              a.courseVersion === row.course_version &&
              a.archived === row.archived &&
              !!a.completedAt === !!row.completed_at &&
              (!row.completed_at || Date.parse(a.completedAt) === Date.parse(row.completed_at)),
          ),
      ) ||
      data.rows.some(
        (row) =>
          row.attempt_id &&
          !attempts.some(
            (a) =>
              a.id === row.attempt_id &&
              a.assignmentId === row.id &&
              a.personId === data.person_id &&
              (row.result_action !== 'result' || !!a.submittedAt) &&
              (row.result_action !== 'resume' || !a.submittedAt),
          ),
      ) ||
      data.certificate_ids.length !== certificates.length ||
      new Set(data.certificate_ids).size !== certificates.length ||
      data.certificate_ids.some(
        (id) => !certificates.some((c) => c.id === id && c.personId === data.person_id),
      ) ||
      data.rows.some(
        (row) =>
          row.certificate_id &&
          !certificates.some(
            (c) =>
              c.id === row.certificate_id &&
              c.assignmentId === row.id &&
              c.state === row.certificate_state,
          ),
      ) ||
      data.requests.length !== requests.length ||
      new Set(data.requests.map((r) => r.id)).size !== requests.length ||
      data.requests.some(
        (row) =>
          !requests.some(
            (r) =>
              r.id === row.id &&
              r.personId === data.person_id &&
              r.status === row.status &&
              r.etag === row.etag,
          ),
      )
    )
      throw Error('Your training records changed while loading. Please try again.');
    this.raw.set({ scope, data });
  }
}
