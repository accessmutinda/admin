import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import { AcademyAssignment, AcademyAssignmentOptions, AcademyCourse } from './academy.models';
import type {
  AcademyAssignmentStaff,
  AcademyAssignmentCourse,
  AcademyAssignmentWrite,
  AcademyAssignmentCommand,
  AcademyPublishAssignment,
} from './academy.generated';

export type AssignmentStaff = AcademyAssignmentStaff;
type Assignment = AcademyAssignment & { company_id: string; etag: string; version: number };
type Page<T> = { results: T[]; next: number | null; meta: { company_id: string } };

@Injectable({ providedIn: 'root' })
export class AcademyAssignmentsApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly store = inject(ManagementStore);
  private readonly academy = inject(AcademyApi);
  readonly scope = this.academy.scope;
  readonly available = computed(
    () =>
      this.access.can('academy', 'assignments', 'read') &&
      this.access.can('academy', 'courses', 'read'),
  );
  readonly canCreate = computed(
    () => this.available() && this.access.can('academy', 'assignments', 'create'),
  );
  readonly canEdit = computed(
    () => this.available() && this.access.can('academy', 'assignments', 'edit'),
  );
  private readonly loaded = signal('');
  private readonly people = signal<AssignmentStaff[]>([]);
  private readonly catalogue = signal<AcademyAssignmentCourse[]>([]);
  private readonly records = signal<Assignment[]>([]);
  readonly staff = computed(() => (this.current() ? this.people() : []));
  readonly courses = computed(() => (this.current() ? this.catalogue() : []));
  readonly assignments = computed(() => (this.current() ? this.records() : []));
  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  private inFlight?: { scope: string; promise: Promise<void> };
  private retry?: { scope: string; signature: string; key: string };
  constructor() {
    let previous = this.scope();
    effect(() => {
      const scope = this.scope();
      if (scope !== previous) {
        previous = scope;
        untracked(() => {
          this.clear();
          this.error.set('');
          this.retry = undefined;
        });
      }
    });
  }
  private current() {
    return this.available() && this.loaded() === this.scope();
  }
  private root() {
    return `/companies/${this.store.companyId()}/academy/assignments`;
  }
  private check(scope: string) {
    if (!this.available() || scope !== this.scope())
      throw Error('The workspace or assignment access changed. Reopen this page.');
  }
  clear() {
    this.loaded.set('');
    this.people.set([]);
    this.catalogue.set([]);
    this.records.set([]);
  }
  async load(force = false): Promise<void> {
    const scope = this.scope();
    this.check(scope);
    if (!force && this.current()) return;
    if (this.inFlight?.scope === scope) return this.inFlight.promise;
    this.clear();
    this.error.set('');
    this.loading.set(true);
    const root = this.root();
    const all = async <T>(suffix: string): Promise<T[]> => {
      const rows: T[] = [];
      let page: number | null = 1;
      while (page !== null) {
        const result: Page<T> = await this.auth.api(`${root}${suffix}?page=${page}&page_size=100`);
        this.check(scope);
        if (result.meta.company_id !== this.store.companyId())
          throw Error('Assignment workspace mismatch.');
        rows.push(...result.results);
        page = result.next;
      }
      return rows;
    };
    const promise = (async () => {
      try {
        const [people, catalogue, assignments] = await Promise.all([
          all<AssignmentStaff>('/staff'),
          all<AcademyAssignmentCourse>('/courses'),
          all<Assignment>(''),
        ]);
        this.check(scope);
        if (assignments.some((a) => a.company_id !== this.store.companyId()))
          throw Error('Assignment workspace mismatch.');
        this.people.set(people);
        this.catalogue.set(catalogue);
        this.records.set(assignments);
        this.loaded.set(scope);
      } catch (e) {
        if (scope === this.scope()) {
          this.clear();
          this.error.set((e as Error).message);
        }
        throw e;
      } finally {
        if (this.inFlight?.scope === scope) {
          this.loading.set(false);
          this.inFlight = undefined;
        }
      }
    })();
    this.inFlight = { scope, promise };
    return promise;
  }
  private async write(
    action: string,
    body: AcademyAssignmentWrite | AcademyAssignmentCommand | AcademyPublishAssignment,
  ): Promise<string | null> {
    const scope = this.scope();
    if (this.saving()) return 'An assignment request is already saving.';
    this.saving.set(true);
    try {
      this.check(scope);
      const snapshot = structuredClone(body);
      const signature = JSON.stringify({ action, body: snapshot });
      if (this.retry?.scope !== scope || this.retry.signature !== signature)
        this.retry = { scope, signature, key: crypto.randomUUID() };
      await this.auth.api(
        this.root() + (action === 'assign' ? '' : '/' + action),
        snapshot,
        'POST',
        { 'Idempotency-Key': this.retry.key },
      );
      this.check(scope);
      await this.load(true);
      this.retry = undefined;
      return null;
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (scope === this.scope() && ![400, 409, 412, 428].includes(status ?? 0)) {
        this.clear();
        this.error.set((e as Error).message);
      }
      if (scope === this.scope() && [409, 412].includes(status ?? 0)) {
        try {
          await this.load(true);
        } catch {
          /* The loader exposes an unavailable state. */
        }
      }
      const failure = e as Error & { fieldErrors?: Record<string, string[]> };
      return (
        Object.entries(failure.fieldErrors ?? {})
          .map(([key, values]) => `${key}: ${values.join(' ')}`)
          .join(' ') || failure.message
      );
    } finally {
      this.saving.set(false);
    }
  }
  async assign(
    personIds: string[],
    courseIds: string[],
    due: string,
    recurrenceMonths: number,
    message: string,
    notify: boolean,
    renew: boolean,
    workspace: string,
    options: AcademyAssignmentOptions = {},
  ): Promise<string | null> {
    if (workspace !== this.store.companyId()) return 'The workspace changed. Reopen assignments.';
    if (!this.access.can('academy', 'assignments', 'create'))
      return 'Creating assignments is unavailable.';
    const courses = courseIds.map((id) => ({
      id,
      version: this.courses().find((c) => c.id === id)?.version ?? 0,
    }));
    const assignments = renew
      ? this.assignments()
          .filter(
            (a) => !a.archived && personIds.includes(a.personId) && courseIds.includes(a.courseId),
          )
          .map((a) => ({ id: a.id, etag: a.etag }))
      : [];
    return this.write(renew ? 'renew' : 'assign', {
      ...(options.supervisorId ? { supervisorId: options.supervisorId } : {}),
      roles: options.roles ?? [],
      team: options.team ?? 'All',
      personIds,
      courses,
      due,
      recurrenceMonths,
      message,
      method: options.source ?? 'Individual Worker',
      priority: options.priority ?? 'Normal',
      channels: notify ? (options.notificationChannels ?? ['In-platform']) : [],
      assignments,
    });
  }
  async publishAndAssign(
    course: AcademyCourse,
    personIds: string[],
    expected: string,
    workspace: string,
    supervisorId = '',
  ): Promise<string | null> {
    if (workspace !== this.store.companyId()) return 'The workspace changed. Reopen assignments.';
    const record = this.academy.courses().find((r) => r.course.id === course.id);
    if (!record || record.course.updatedAt !== expected)
      return 'The course changed. Reload and review before assigning.';
    const plan = course.assignmentPlan;
    if (!plan) return 'Configure the assignment plan first.';
    const error = await this.write('publish-and-assign', {
      courseId: course.id,
      etag: record.course.etag,
      course: this.academy.body(course),
      refresher: plan.refresher,
      assignment: {
        roles: plan.roles,
        team: plan.team,
        personIds,
        courses: [{ id: course.id, version: record.course.version! }],
        due: plan.due,
        recurrenceMonths: plan.recurrenceMonths,
        priority: plan.priority,
        method: plan.method,
        message: plan.message,
        channels: plan.channels,
        assignments: plan.refresher
          ? this.assignments()
              .filter(
                (a) => !a.archived && a.courseId === course.id && personIds.includes(a.personId),
              )
              .map((a) => ({ id: a.id, etag: a.etag }))
          : [],
        ...(supervisorId ? { supervisorId } : {}),
      },
    });
    if (!error) {
      try {
        await this.academy.detail(course.id);
      } catch (e) {
        return (e as Error).message;
      }
    }
    return error;
  }
  async bulk(
    personIds: string[],
    action: 'extend' | 'remind',
    due: string,
    workspace: string,
  ): Promise<string | null> {
    if (workspace !== this.store.companyId()) return 'The workspace changed. Reopen assignments.';
    if (!this.access.can('academy', 'assignments', 'edit'))
      return 'Editing assignments is unavailable.';
    const assignments = this.assignments()
      .filter((a) => personIds.includes(a.personId) && !a.archived && !a.completedAt)
      .map((a) => ({ id: a.id, etag: a.etag }));
    return this.write(action, {
      assignments,
      ...(action === 'extend' ? { due } : {}),
      channels: action === 'remind' ? ['In-platform'] : [],
      message: '',
    });
  }
}
