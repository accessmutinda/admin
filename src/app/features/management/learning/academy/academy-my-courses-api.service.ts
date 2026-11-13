import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AcademyApi } from './academy-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyAsset, AcademyCourse } from './academy.models';
import type {
  AcademyMyCoursesRead,
  AcademyMyCoursesEnrolled,
} from './academy-my-courses.generated';

@Injectable({ providedIn: 'root' })
export class AcademyMyCoursesApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly results = inject(AcademyResultsApi);
  private readonly scope = inject(AcademyApi).scope;
  private readonly raw = signal<{ scope: string; data: AcademyMyCoursesRead } | null>(null);
  readonly snapshot = computed(() =>
    this.raw()?.scope === this.scope() && this.access.can('academy', 'learner', 'read')
      ? this.raw()!.data
      : null,
  );
  readonly courses = computed(() =>
    (this.snapshot()?.results ?? []).map((r) => r.course as unknown as AcademyCourse),
  );
  readonly assets = computed(() =>
    (this.snapshot()?.results ?? []).flatMap((r) => r.assets as unknown as AcademyAsset[]),
  );
  readonly saving = signal(false);
  private generation = 0;
  private retry?: { course: string; etag: string; scope: string; key: string };
  private root() {
    return `/companies/${this.access.companyId()}/academy/learning/courses`;
  }
  clear() {
    this.generation++;
    this.raw.set(null);
  }
  async load() {
    const scope = this.scope(),
      generation = ++this.generation;
    this.raw.set(null);
    const value = await this.auth.api<AcademyMyCoursesRead>(this.root());
    if (scope !== this.scope() || generation !== this.generation) return;
    if (
      value.company_id !== this.access.companyId() ||
      String(value.actor_id) !== String(this.auth.profile()?.id) ||
      value.person_id !== this.results.me()?.id
    )
      throw Error('The course catalogue does not belong to your current staff account.');
    const active = this.results.assignments().filter((a) => !a.archived);
    const assignedIds = value.results.flatMap((r) => (r.assignment_id ? [r.assignment_id] : []));
    if (
      new Set(value.results.map((r) => r.course.id)).size !== value.results.length ||
      new Set(assignedIds).size !== assignedIds.length ||
      active.some((a) => !assignedIds.includes(a.id)) ||
      value.results.some(
        (r) =>
          r.course['company_id'] !== value.company_id ||
          (r.assignment_id &&
            !this.results
              .assignments()
              .some(
                (a) =>
                  a.id === r.assignment_id &&
                  a.personId === value.person_id &&
                  a.courseId === r.course.id &&
                  a.courseVersion === r.course.version &&
                  !a.archived,
              )),
      )
    )
      throw Error('Your course assignments changed. Reopen My courses.');
    this.raw.set({ scope, data: value });
  }
  canEnrol(id: string) {
    return (
      !!this.snapshot()?.results.some((r) => r.course['id'] === id && r.can_enrol) &&
      this.access.can('academy', 'learner', 'create')
    );
  }
  async enrol(id: string) {
    const scope = this.scope(),
      generation = this.generation,
      course = this.snapshot()?.results.find((r) => r.course.id === id)?.course;
    if (!course || !this.canEnrol(id)) throw Error('This course is unavailable for enrolment.');
    if (this.saving()) throw Error('An enrolment is already being saved.');
    if (this.retry?.course !== id || this.retry.scope !== scope || this.retry.etag !== course.etag)
      this.retry = { course: id, etag: course.etag!, scope, key: crypto.randomUUID() };
    this.saving.set(true);
    try {
      await this.auth.api<AcademyMyCoursesEnrolled>(`${this.root()}/${id}/enrol`, {}, 'POST', {
        'Idempotency-Key': this.retry.key,
        'If-Match': this.retry.etag,
      });
      if (scope !== this.scope()) throw Error('Your staff account changed. Reopen My courses.');
      this.retry = undefined;
    } catch (error) {
      if ((error as any)?.status && (error as any).status < 500) this.retry = undefined;
      if (scope === this.scope() && generation === this.generation) this.raw.set(null);
      throw error;
    } finally {
      this.saving.set(false);
    }
  }
  async blob(id: string) {
    const scope = this.scope(),
      record = this.snapshot()?.results.find((r) => r.assets.some((a) => a['id'] === id));
    if (!record) throw Error('Course media is unavailable.');
    const blob = await this.auth.api<Blob>(
      `${this.root()}/${record.course['id']}/media/${id}/content`,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (scope !== this.scope()) throw Error('Your staff account changed. Reopen My courses.');
    return blob;
  }
}
