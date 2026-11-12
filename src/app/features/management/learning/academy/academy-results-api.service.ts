import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import {
  AcademyAssignment,
  AcademyAttempt,
  AcademyRetakePlan,
  AcademyAsset,
} from './academy.models';
import type {
  AcademyAvailabilityRead,
  AcademyAssignmentStaff,
  AcademyResponseWrite,
  AcademyRetakeWrite,
  AcademyLearningWrite,
  AcademyResultAttemptRead,
  AcademyResultAssignmentRead,
} from './academy.generated';

export type ResultAttempt = AcademyAttempt &
  Pick<
    AcademyResultAttemptRead,
    'company_id' | 'etag' | 'version' | 'feedbackPermitted' | 'availability'
  >;
export type ResultAssignment = AcademyAssignment &
  Pick<AcademyResultAssignmentRead, 'company_id' | 'etag' | 'version'> & {
    availability: Record<string, AcademyAvailabilityRead>;
  };
export interface ResultRecord {
  assets: AcademyAsset[];
  attempt: ResultAttempt;
  assignment: ResultAssignment;
  history: ResultAttempt[];
  retakePlans: AcademyRetakePlan[];
  person: AcademyAssignmentStaff;
  integrations: { available: boolean; reason: string };
}
export interface LearningRecord {
  assets: AcademyAsset[];
  assignment: ResultAssignment;
  attempts: ResultAttempt[];
  retakePlans: AcademyRetakePlan[];
  person: AcademyAssignmentStaff;
}
interface Page<T> {
  results: T[];
  next: number | null;
  meta: { company_id: string; person?: AcademyAssignmentStaff; dueSoonDays?: number | null };
}

function unique<T extends { id: string; version?: number }>(rows: T[]): T[] {
  const values = new Map<string, T>();
  for (const row of rows)
    if ((row.version ?? 0) >= (values.get(row.id)?.version ?? -1)) values.set(row.id, row);
  return [...values.values()];
}

@Injectable({ providedIn: 'root' })
export class AcademyResultsApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly store = inject(ManagementStore);
  private readonly academy = inject(AcademyApi);
  readonly scope = this.academy.scope;
  readonly available = computed(() => this.access.can('academy', 'results', 'read'));
  readonly learnerAvailable = computed(() => this.access.can('academy', 'learner', 'read'));
  readonly canEdit = computed(
    () => this.available() && this.access.can('academy', 'results', 'edit'),
  );
  readonly canApprove = computed(
    () => this.available() && this.access.can('academy', 'results', 'approve'),
  );
  private readonly resultScope = signal('');
  private readonly learnerScope = signal('');
  private readonly ownPerson = signal<AcademyAssignmentStaff | undefined>(undefined);
  private readonly records = signal<ResultRecord[]>([]);
  private readonly learning = signal<LearningRecord[]>([]);
  readonly error = signal('');
  readonly learnerError = signal('');
  private readonly reminderWindow = signal<{ scope: string; value: number | null } | null>(null);
  readonly dueSoonDays = computed(() =>
    ((this.available() && this.resultScope() === this.scope()) ||
      (this.learnerAvailable() && this.learnerScope() === this.scope())) &&
    this.reminderWindow()?.scope === this.scope()
      ? this.reminderWindow()!.value
      : null,
  );
  readonly saving = signal(false);
  readonly loading = signal(false);
  private pending?: { scope: string; learner: boolean; promise: Promise<void> };
  private retry?: { scope: string; signature: string; key: string };
  private readonly activeResults = computed(() =>
    this.available() && this.resultScope() === this.scope() ? this.records() : [],
  );
  private readonly activeLearning = computed(() =>
    this.learnerAvailable() && this.learnerScope() === this.scope() ? this.learning() : [],
  );
  readonly attempts = computed(() =>
    unique([
      ...this.activeResults().flatMap((r) => r.history),
      ...this.activeLearning().flatMap((r) => r.attempts),
    ]),
  );
  readonly assignments = computed(() =>
    unique([
      ...this.activeResults().map((r) => r.assignment),
      ...this.activeLearning().map((r) => r.assignment),
    ]),
  );
  readonly assets = computed(() =>
    unique([
      ...this.activeResults().flatMap((r) => r.assets),
      ...this.activeLearning().flatMap((r) => r.assets),
    ]),
  );
  readonly people = computed(() =>
    unique([
      ...this.activeResults().map((r) => r.person),
      ...this.activeLearning().map((r) => r.person),
    ]),
  );
  readonly me = computed(() =>
    this.learnerAvailable() && this.learnerScope() === this.scope() ? this.ownPerson() : undefined,
  );
  readonly retakes = computed(() =>
    unique([
      ...this.activeResults().flatMap((r) => r.retakePlans),
      ...this.activeLearning().flatMap((r) => r.retakePlans),
    ]),
  );
  constructor() {
    let previous = this.scope();
    effect(() => {
      const scope = this.scope();
      if (scope !== previous) {
        previous = scope;
        untracked(() => {
          this.clear();
          this.error.set('');
          this.learnerError.set('');
          this.retry = undefined;
        });
      }
    });
  }
  clear() {
    this.ownPerson.set(undefined);
    this.records.set([]);
    this.learning.set([]);
    this.resultScope.set('');
    this.learnerScope.set('');
  }
  private root() {
    return `/companies/${this.store.companyId()}/academy`;
  }
  private check(scope: string, learner: boolean) {
    if (scope !== this.scope() || !(learner ? this.learnerAvailable() : this.available()))
      throw Error('The workspace or assessment access changed. Reopen this page.');
  }
  private checkRecord(record: ResultRecord | LearningRecord, scope: string, learner: boolean) {
    this.check(scope, learner);
    if (
      record.assignment.company_id !== this.store.companyId() ||
      ('attempt' in record && record.attempt.company_id !== this.store.companyId())
    )
      throw Error('Assessment workspace mismatch.');
  }
  private accept(record: ResultRecord, scope: string, learner: boolean) {
    this.checkRecord(record, scope, learner);
    if (learner)
      this.acceptLearning(
        {
          assets: record.assets,
          assignment: record.assignment,
          attempts: record.history,
          retakePlans: record.retakePlans,
          person: record.person,
        },
        scope,
      );
    else {
      this.records.update((rows) => [
        ...rows
          .filter((r) => r.attempt.id !== record.attempt.id)
          .map((r) =>
            r.assignment.id === record.assignment.id
              ? {
                  ...r,
                  assignment: record.assignment,
                  history: record.history,
                  retakePlans: record.retakePlans,
                }
              : r,
          ),
        record,
      ]);
      this.resultScope.set(scope);
    }
  }
  private acceptLearning(record: LearningRecord, scope: string) {
    this.checkRecord(record, scope, true);
    this.ownPerson.set(record.person);
    this.learning.update((rows) => [
      ...rows.filter((r) => r.assignment.id !== record.assignment.id),
      record,
    ]);
    this.learnerScope.set(scope);
  }
  async load(learner = false, force = false): Promise<void> {
    const scope = this.scope();
    this.check(scope, learner);
    if (!force && (learner ? this.learnerScope() : this.resultScope()) === scope) return;
    if (this.pending?.scope === scope && this.pending.learner === learner)
      return this.pending.promise;
    (learner ? this.learnerError : this.error).set('');
    this.loading.set(true);
    if (learner) {
      this.learning.set([]);
      this.learnerScope.set('');
    } else {
      this.records.set([]);
      this.resultScope.set('');
    }
    const promise = (async () => {
      try {
        let page: number | null = 1;
        const results: Array<ResultRecord | LearningRecord> = [];
        let reminderWindow: number | null = null;
        while (page !== null) {
          const result: Page<ResultRecord | LearningRecord> = await this.auth.api(
            `${this.root()}/${learner ? 'learning' : 'results'}?page=${page}&page_size=100`,
          );
          this.check(scope, learner);
          if (result.meta.company_id !== this.store.companyId())
            throw Error('Assessment workspace mismatch.');
          for (const row of result.results) this.checkRecord(row, scope, learner);
          reminderWindow = result.meta.dueSoonDays ?? null;
          if (learner) this.ownPerson.set(result.meta.person);
          results.push(...result.results);
          page = result.next;
        }
        this.reminderWindow.set({ scope, value: reminderWindow });
        if (learner) {
          this.learning.set(results as LearningRecord[]);
          this.learnerScope.set(scope);
        } else {
          this.records.set(results as ResultRecord[]);
          this.resultScope.set(scope);
        }
      } catch (e) {
        this.failed(e, scope, learner);
        throw e;
      } finally {
        if (this.pending?.scope === scope && this.pending.learner === learner) {
          this.pending = undefined;
          this.loading.set(false);
        }
      }
    })();
    this.pending = { scope, learner, promise };
    return promise;
  }
  async detail(id: string, learner = false): Promise<void> {
    const scope = this.scope();
    this.check(scope, learner);
    try {
      this.accept(
        await this.auth.api<ResultRecord>(
          `${this.root()}/${learner ? 'learning/attempts' : 'results'}/${id}`,
        ),
        scope,
        learner,
      );
    } catch (e) {
      this.failed(e, scope, learner);
      throw e;
    }
  }
  private failed(e: unknown, scope: string, learner: boolean) {
    if (scope !== this.scope()) return;
    if (learner) {
      this.ownPerson.set(undefined);
      this.learning.set([]);
      this.learnerScope.set('');
      this.learnerError.set((e as Error).message);
    } else {
      this.records.set([]);
      this.resultScope.set('');
      this.error.set((e as Error).message);
    }
  }
  private async write(
    path: string,
    body: unknown,
    learner: boolean,
    method = 'POST',
    etag?: string,
  ): Promise<ResultRecord | LearningRecord> {
    const scope = this.scope();
    this.check(scope, learner);
    if (this.saving()) throw Error('An assessment request is already saving.');
    this.saving.set(true);
    const snapshot = structuredClone(body),
      signature = JSON.stringify({ path, body: snapshot, method, etag });
    if (this.retry?.scope !== scope || this.retry.signature !== signature)
      this.retry = { scope, signature, key: crypto.randomUUID() };
    try {
      const result = await this.auth.api<ResultRecord | LearningRecord>(
        this.root() + path,
        snapshot,
        method as 'POST' | 'PATCH',
        { 'Idempotency-Key': this.retry.key, ...(etag ? { 'If-Match': etag } : {}) },
      );
      if ('attempt' in result) this.accept(result, scope, learner);
      else this.acceptLearning(result, scope);
      this.retry = undefined;
      return result;
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (![400, 409, 412, 428].includes(status ?? 0)) this.failed(e, scope, learner);
      if ([409, 412].includes(status ?? 0) && scope === this.scope()) {
        try {
          await this.load(learner, true);
        } catch {}
      }
      throw e;
    } finally {
      this.saving.set(false);
    }
  }
  async blob(id: string): Promise<Blob> {
    const scope = this.scope();
    const learning = this.activeLearning().find((r) => r.assets.some((a) => a.id === id));
    const result = this.activeResults().find((r) => r.assets.some((a) => a.id === id));
    if (!learning && !result) throw Error('Assigned media is unavailable.');
    const path = learning
      ? `/learning/assignments/${learning.assignment.id}/media/${id}/content`
      : `/results/${result!.attempt.id}/media/${id}/content`;
    try {
      const blob = await this.auth.api<Blob>(
        this.root() + path,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      this.check(scope, !!learning);
      return blob;
    } catch (e) {
      this.failed(e, scope, !!learning);
      throw e;
    }
  }

  private reviewed(id: string) {
    const attempt = this.attempts().find((a) => a.id === id);
    if (!attempt) throw Error('Reload the assessment before changing it.');
    return attempt;
  }
  async invalidate(id: string, reason: string) {
    return this.write(
      `/results/${id}/invalidate`,
      { reason },
      false,
      'POST',
      this.reviewed(id).etag,
    );
  }
  async releaseFeedback(id: string) {
    return this.write(`/results/${id}/release-feedback`, {}, false, 'POST', this.reviewed(id).etag);
  }
  async requestSupport(id: string) {
    return this.write(
      `/learning/attempts/${id}/request-support`,
      {},
      true,
      'POST',
      this.reviewed(id).etag,
    );
  }
  async schedule(id: string, scheduledFor: string) {
    return this.write(
      `/results/${id}/schedule-retake`,
      { scheduledFor } satisfies AcademyRetakeWrite,
      false,
      'POST',
      this.reviewed(id).etag,
    );
  }
  async notify(id: string) {
    return this.write(`/results/${id}/notify-retake`, {}, false, 'POST', this.reviewed(id).etag);
  }
  async start(assignmentId: string, groupId = '') {
    return (await this.write(
      '/learning/attempts',
      { assignmentId, groupId },
      true,
    )) as ResultRecord;
  }
  async answer(id: string, questionId: string, answers: string[], flagged: boolean | null) {
    const body: AcademyResponseWrite = {
      questionId,
      answers,
      ...(flagged === null ? {} : { flagged }),
    };
    return this.write(`/learning/attempts/${id}`, body, true, 'PATCH', this.reviewed(id).etag);
  }
  async submit(id: string) {
    return this.write(`/learning/attempts/${id}/submit`, {}, true, 'POST', this.reviewed(id).etag);
  }
  async event(assignmentId: string, body: AcademyLearningWrite) {
    return this.write(`/learning/assignments/${assignmentId}/events`, body, true);
  }
}
