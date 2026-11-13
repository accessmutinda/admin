import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AcademyApi } from './academy-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyCertificatesApi } from './academy-certificates-api.service';
import type { AcademyRefreshersRead } from './academy-refreshers.generated';

@Injectable({ providedIn: 'root' })
export class AcademyRefreshersApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly results = inject(AcademyResultsApi);
  private readonly certificates = inject(AcademyCertificatesApi);
  private readonly scope = inject(AcademyApi).scope;
  private readonly raw = signal<{ scope: string; data: AcademyRefreshersRead } | null>(null);
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
    const data = await this.auth.api<AcademyRefreshersRead>(
      `/companies/${this.access.companyId()}/academy/learning/refreshers`,
    );
    if (scope !== this.scope() || generation !== this.generation) return;
    if (
      data.company_id !== this.access.companyId() ||
      String(data.actor_id) !== String(this.auth.profile()?.id) ||
      data.person_id !== this.results.me()?.id
    )
      throw Error('The refresher record does not belong to your current staff account.');
    const assignments = this.results.assignments(),
      certificates = this.certificates.certificates();
    if (
      data.assignment_ids.length !== assignments.length ||
      new Set(data.assignment_ids).size !== assignments.length ||
      data.assignment_ids.some(
        (id) => !assignments.some((a) => a.id === id && a.personId === data.person_id),
      ) ||
      data.certificate_ids.length !== certificates.length ||
      new Set(data.certificate_ids).size !== certificates.length ||
      data.certificate_ids.some(
        (id) => !certificates.some((c) => c.id === id && c.personId === data.person_id),
      ) ||
      new Set(data.assignments.map((r) => r.id)).size !== data.assignments.length ||
      data.assignments.some(
        (row) =>
          !assignments.some(
            (a) =>
              a.id === row.id &&
              a.courseId === row.course_id &&
              a.courseVersion === row.course_version &&
              !a.archived &&
              !a.completedAt &&
              a.due === row.due &&
              (a.type ?? 'Initial') === row.cycle,
          ),
      ) ||
      new Set(data.reviews.map((r) => r.course_id)).size !== data.reviews.length ||
      data.reviews.some(
        (row) =>
          !certificates.some(
            (c) =>
              c.id === row.certificate_id &&
              c.courseId === row.course_id &&
              c.courseVersion === row.course_version &&
              c.state === row.state,
          ),
      )
    )
      throw Error('Your refresher records changed while loading. Please try again.');
    this.raw.set({ scope, data });
  }
}
