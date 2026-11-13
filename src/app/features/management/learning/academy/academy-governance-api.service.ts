import { AcademyResultsApi } from './academy-results-api.service';
import type {
  AcademyTrainingMessageRead,
  AcademyTrainingMessagePage,
} from './academy-messages.generated';
import { ACADEMY_LEARNER_ONLY } from './academy-learner-context';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import type {
  AcademyReviewRead,
  AcademyPendingReviewRead,
  AcademyReviewWrite,
  AcademyAdjustmentRead,
  AcademyAdjustmentWrite,
  AcademyObservationRead,
  AcademyObservationWrite,
  AcademyNotificationRead,
  AcademyNotificationWrite,
  AcademyAssignmentStaff,
  AcademyGovernanceSummaryRead,
  AcademyDisclosureWrite,
  AcademyRecordsRequestRead,
} from './academy.generated';
import {
  emptyGovernance,
  AcademyReview,
  AcademyAdjustment,
  AcademyAuthorisation,
} from './academy-governance.models';

type Versioned = { id: string; version?: number; etag?: string; company_id?: string };
interface Page<T> {
  results: T[];
  next: number | null;
  meta: { company_id: string };
}
interface ManagerData {
  reviews: AcademyReviewRead[];
  pending: AcademyPendingReviewRead[];
  adjustments: AcademyAdjustmentRead[];
  authorisations: AcademyObservationRead[];
  deliveries: AcademyNotificationRead[];
  people: AcademyAssignmentStaff[];
  courses: { id: string; title: string; version: number }[];
  summary: AcademyGovernanceSummaryRead | null;
}
@Injectable({ providedIn: 'root' })
export class AcademyGovernanceApi {
  readonly learnerOnly = inject(ACADEMY_LEARNER_ONLY, { optional: true }) === true;
  private readonly auth = inject(AuthService);
  private readonly results = inject(AcademyResultsApi);
  private readonly messagePermission = signal(false);
  private readonly access = inject(CompanyAccessService);
  private readonly store = inject(ManagementStore);
  readonly scope = inject(AcademyApi).scope;
  readonly available = computed(
    () => !this.learnerOnly && this.access.can('academy', 'governance', 'read'),
  );
  canRead(kind: string) {
    const sources: Record<string, string[]> = {
      reviews: ['assignments', 'courses', 'results'],
      adjustments: ['assignments', 'courses'],
      observations: ['courses'],
      notifications: ['assignments', 'courses'],
      people: [],
      courses: ['courses'],
      disclosures: ['certificates'],
      summary: ['assignments', 'courses', 'results', 'certificates'],
    };
    return (
      this.available() &&
      (sources[kind] ?? []).every((feature) => this.access.can('academy', feature, 'read'))
    );
  }
  readonly canAcknowledge = computed(
    () =>
      this.learnerAvailable() &&
      this.access.can('academy', 'learner', 'create') &&
      (!this.learnerOnly || this.messagePermission()),
  );
  readonly learnerAvailable = computed(() => this.access.can('academy', 'learner', 'read'));
  can(action: string) {
    return this.available() && this.access.can('academy', 'governance', action);
  }
  readonly error = signal('');
  readonly learnerError = signal('');
  readonly saving = signal(false);
  readonly loading = signal(false);
  private readonly manager = signal<{ scope: string; data: ManagerData } | null>(null);
  private readonly learner = signal<{ scope: string; data: AcademyNotificationRead[] } | null>(
    null,
  );
  readonly source = computed(() =>
    this.available() && this.manager()?.scope === this.scope() ? this.manager()!.data : null,
  );
  readonly data = computed(() => ({
    ...emptyGovernance(),
    reviews: [...(this.source()?.pending ?? []), ...(this.source()?.reviews ?? [])],
    adjustments: this.source()?.adjustments ?? [],
    authorisations: this.source()?.authorisations ?? [],
    deliveries: this.source()?.deliveries ?? [],
  }));
  readonly people = computed(() => this.source()?.people ?? []);
  readonly courses = computed(() => this.source()?.courses ?? []);
  readonly summary = computed(() => this.source()?.summary ?? null);
  readonly notifications = computed(() =>
    this.learnerAvailable() && this.learner()?.scope === this.scope() ? this.learner()!.data : [],
  );
  private deniedScopes: (string | undefined)[] = [undefined, undefined];
  private ticket = 0;
  private ownTicket = 0;
  private fingerprint = '';
  private retry?: { signature: string; key: string };
  private committed?: { scope: string; intent: string; learner: boolean };
  constructor() {
    this.fingerprint = this.identity();
    effect(() => {
      this.identity();
      untracked(() => this.syncScope());
    });
  }
  private identity() {
    return JSON.stringify([this.scope(), this.available(), this.learnerAvailable()]);
  }
  private syncScope() {
    const next = this.identity();
    if (next !== this.fingerprint) {
      this.fingerprint = next;
      this.ticket++;
      this.ownTicket++;
      this.manager.set(null);
      this.learner.set(null);
      this.messagePermission.set(false);
      this.retry = undefined;
      this.committed = undefined;
      this.error.set('');
      this.learnerError.set('');
      this.loading.set(false);
    }
  }
  private root() {
    return `/companies/${this.store.companyId()}/academy`;
  }
  private check(scope: string, learner = false) {
    if (scope !== this.scope() || !(learner ? this.learnerAvailable() : this.available()))
      throw Error('The workspace or academy policy access changed. Reopen this page.');
  }
  private deny(
    error: unknown,
    scope: string,
    learner: boolean,
    ticket: number,
    collection = false,
  ) {
    const status = (error as { status?: number }).status ?? 0;
    const companyUnavailable =
      (error as { response?: { detail?: string } }).response?.detail ===
      'Company is not available.';
    const denied =
      [401, 403].includes(status) || (status === 404 && (collection || companyUnavailable));
    if (scope !== this.scope() || (!denied && ticket !== (learner ? this.ownTicket : this.ticket)))
      return;
    if (denied) {
      this.ticket++;
      this.ownTicket++;
      this.manager.set(null);
      this.learner.set(null);
      this.messagePermission.set(false);
      this.loading.set(false);
      const mode = learner ? 1 : 0;
      if (status !== 401 && this.deniedScopes[mode] !== scope) {
        this.deniedScopes[mode] = scope;
        void this.access.invalidate().catch(() => {});
      }
    } else if (learner) this.learner.set(null);
    else this.manager.set(null);
    (learner ? this.learnerError : this.error).set((error as Error).message);
  }
  private async pages<T>(path: string, scope: string, learner = false): Promise<T[]> {
    const values: T[] = [];
    const seen = new Set<number>();
    let page: number | null = 1;
    while (page !== null) {
      if (seen.has(page)) throw Error('The API returned a repeated policy page.');
      seen.add(page);
      const response: Page<T> = await this.auth.api(
        this.root() + path + `?page=${page}&page_size=100`,
      );
      this.check(scope, learner);
      if (response.meta.company_id !== this.store.companyId())
        throw Error('Policy workspace mismatch.');
      values.push(...response.results);
      page = response.next;
    }
    return values;
  }
  readonly messages = computed(() =>
    this.learnerOnly ? (this.notifications() as AcademyTrainingMessageRead[]) : [],
  );
  private async staffMessages(scope: string) {
    const data: AcademyTrainingMessageRead[] = [],
      seen = new Set<number>(),
      ids = new Set<string>();
    let page: number | null = 1,
      permission: boolean | undefined,
      count: number | undefined;
    while (page !== null) {
      if (seen.has(page)) throw Error('The API returned a repeated message page.');
      seen.add(page);
      const response: AcademyTrainingMessagePage = await this.auth.api(
        this.root() + `/learning/messages?page=${page}&page_size=100`,
      );
      this.check(scope, true);
      if (
        response.meta.company_id !== this.store.companyId() ||
        String(response.meta.actor_id) !== String(this.auth.profile()?.id) ||
        response.meta.person_id !== this.results.me()?.id ||
        typeof response.meta.can_acknowledge !== 'boolean' ||
        (permission !== undefined && permission !== response.meta.can_acknowledge)
      )
        throw Error('These training messages do not belong to your current staff account.');
      if (
        !Number.isInteger(response.count) ||
        response.count < 0 ||
        (count !== undefined && count !== response.count)
      )
        throw Error('Your training messages changed while loading. Please try again.');
      count = response.count;
      permission = response.meta.can_acknowledge;
      for (const row of response.results) {
        const assignment = this.results.assignments().find((a) => a.id === row.assignmentId);
        if (
          ids.has(row.id) ||
          row.company_id !== this.store.companyId() ||
          row.personId !== response.meta.person_id ||
          !assignment ||
          assignment.personId !== row.personId ||
          (row.course_id !== null &&
            (assignment.archived || row.course_id !== assignment.courseId)) ||
          (!row.course_id && !row.course_reason)
        )
          throw Error('Your training messages changed while loading. Please try again.');
        ids.add(row.id);
        data.push(row);
      }
      page = response.next;
    }
    if (data.length !== count)
      throw Error('Your training messages changed while loading. Please try again.');
    return { data, permission: !!permission };
  }
  async load(learner = false) {
    this.syncScope();
    const scope = this.scope(),
      ticket = learner ? ++this.ownTicket : ++this.ticket;
    (learner ? this.learnerError : this.error).set('');
    if (learner) this.learner.set(null);
    else {
      this.manager.set(null);
      this.loading.set(true);
    }
    try {
      this.check(scope, learner);
      if (learner) {
        const staff = this.learnerOnly ? await this.staffMessages(scope) : null;
        const data =
          staff?.data ??
          (await this.pages<AcademyNotificationRead>('/learning/notifications', scope, true));
        if (ticket === this.ownTicket) {
          if (this.committed?.scope === scope && this.committed.learner) this.committed = undefined;
          this.deniedScopes[1] = undefined;
          this.learner.set({ scope, data });
          this.messagePermission.set(staff?.permission ?? false);
        }
      } else {
        const [
          reviews,
          adjustments,
          authorisations,
          deliveries,
          people,
          courses,
          summary,
          pending,
        ] = await Promise.all([
          this.canRead('reviews')
            ? this.pages<AcademyReviewRead>('/governance/reviews', scope)
            : Promise.resolve([]),
          this.canRead('adjustments')
            ? this.pages<AcademyAdjustmentRead>('/governance/adjustments', scope)
            : Promise.resolve([]),
          this.canRead('observations')
            ? this.pages<AcademyObservationRead>('/governance/task-observations', scope)
            : Promise.resolve([]),
          this.canRead('notifications')
            ? this.pages<AcademyNotificationRead>('/governance/notifications', scope)
            : Promise.resolve([]),
          this.canRead('people')
            ? this.pages<AcademyAssignmentStaff>('/governance/people', scope)
            : Promise.resolve([]),
          this.canRead('courses')
            ? this.pages<{ id: string; title: string; version: number }>(
                '/governance/courses',
                scope,
              )
            : Promise.resolve([]),
          this.canRead('summary')
            ? this.auth.api<AcademyGovernanceSummaryRead>(this.root() + '/governance/summary')
            : Promise.resolve(null),
          this.canRead('reviews')
            ? this.pages<AcademyPendingReviewRead>('/governance/pending-reviews', scope)
            : Promise.resolve([]),
        ]);
        this.check(scope);
        if (summary && summary.company_id !== this.store.companyId())
          throw Error('Policy workspace mismatch.');
        if (ticket === this.ticket) {
          if (this.committed?.scope === scope && !this.committed.learner)
            this.committed = undefined;
          this.deniedScopes[0] = undefined;
          this.manager.set({
            scope,
            data: {
              reviews,
              adjustments,
              authorisations,
              deliveries,
              people,
              courses,
              summary,
              pending,
            },
          });
        }
      }
    } catch (error) {
      this.deny(error, scope, learner, ticket, true);
      throw error;
    } finally {
      if (!learner && ticket === this.ticket) this.loading.set(false);
    }
  }
  private async send<T extends Versioned>(
    path: string,
    body: unknown,
    method: 'POST' | 'PATCH',
    scope: string,
    etag?: string,
    learner = false,
  ): Promise<T> {
    this.check(scope, learner);
    const frozen = structuredClone(body),
      signature = JSON.stringify([scope, path, method, etag, frozen]);
    if (this.retry?.signature !== signature) this.retry = { signature, key: crypto.randomUUID() };
    try {
      const response = await this.auth.api<T>(this.root() + path, frozen, method, {
        'Idempotency-Key': this.retry.key,
        ...(etag ? { 'If-Match': etag } : {}),
      });
      this.check(scope, learner);
      if (response.company_id !== this.store.companyId()) throw Error('Policy workspace mismatch.');
      this.retry = undefined;
      return response;
    } catch (error) {
      if ([400, 403, 404, 409, 412, 428].includes((error as { status?: number }).status ?? 0))
        this.retry = undefined;
      throw error;
    }
  }
  private formIntent(kind: string, value: Versioned, fields: object, status?: string) {
    const record = value as unknown as Record<string, unknown>;
    return JSON.stringify([
      kind,
      value.id,
      status,
      Object.keys(fields).map((key) => [key, record[key]]),
    ]);
  }
  private async mutate(
    action: string,
    run: (scope: string) => Promise<void>,
    learner = false,
    intent?: () => string,
  ) {
    this.syncScope();
    if (this.saving()) throw Error('A policy save is already in progress.');
    const scope = this.scope();
    this.check(scope, learner);
    const committed =
      !!intent && this.committed?.scope === scope && this.committed.intent === intent();
    if (!committed && !(learner ? this.access.can('academy', 'learner', action) : this.can(action)))
      throw Error('Permission is required for this policy action.');
    this.saving.set(true);
    (learner ? this.learnerError : this.error).set('');
    try {
      if (!committed) {
        this.committed = undefined;
        await run(scope);
        if (intent) this.committed = { scope, intent: intent(), learner };
      }
      await this.load(learner);
      this.committed = undefined;
      this.retry = undefined;
    } catch (error) {
      this.deny(error, scope, learner, learner ? this.ownTicket : this.ticket);
      throw error;
    } finally {
      this.saving.set(false);
    }
  }
  async saveReview(value: AcademyReview & Versioned) {
    const desired = value.status;
    const body: AcademyReviewWrite = {
      assignmentId: value.assignmentId,
      attemptId: value.attemptId || null,
      ownerId: value.ownerId,
      due: value.due,
      reason: value.reason,
      actions: value.actions,
      decision: value.decision,
      kind: value.kind,
    };
    const scope = this.scope();
    this.check(scope);
    let old = value.version ? this.data().reviews.find((r) => r.id === value.id) : undefined;
    if (value.version && !old) {
      old = await this.auth.api<AcademyReviewRead>(this.root() + '/governance/reviews/' + value.id);
      this.check(scope);
      if (old.company_id !== this.store.companyId()) throw Error('Policy workspace mismatch.');
    }
    const transition =
      desired === 'Resolved'
        ? 'resolve'
        : desired === 'In progress' && old?.status !== 'In progress'
          ? 'start'
          : desired === 'Open' && value.version && old?.status !== 'Open'
            ? 'reopen'
            : '';
    await this.mutate(
      transition ? 'approve' : value.version ? 'edit' : 'create',
      async (scope) => {
        if (!value.version) {
          const saved = await this.send<AcademyReviewRead>(
            '/governance/reviews',
            body,
            'POST',
            scope,
          );
          Object.assign(value, saved, { status: desired });
        } else if (!transition) {
          Object.assign(
            value,
            await this.send<AcademyReviewRead>(
              '/governance/reviews/' + value.id,
              body,
              'PATCH',
              scope,
              value.etag,
            ),
          );
          return;
        }
        if (transition)
          Object.assign(
            value,
            await this.send<AcademyReviewRead>(
              '/governance/reviews/' + value.id + '/' + transition,
              body,
              'POST',
              scope,
              value.etag,
            ),
          );
      },
      false,
      () => this.formIntent('review', value, body, desired),
    );
  }
  async approveAdjustment(value: AcademyAdjustment) {
    const body: AcademyAdjustmentWrite = {
      assignmentId: value.assignmentId,
      extraMinutes: value.extraMinutes,
      untimed: value.untimed,
      reason: value.reason,
      expires: value.expires,
    };
    await this.mutate(
      'approve',
      async (scope) => {
        Object.assign(
          value,
          await this.send<AcademyAdjustmentRead>('/governance/adjustments', body, 'POST', scope),
        );
      },
      false,
      () => this.formIntent('adjustment', value, body),
    );
  }
  async saveObservation(value: AcademyAuthorisation & Versioned) {
    const body: AcademyObservationWrite = {
      personId: value.personId,
      courseId: value.courseId,
      clientId: value.clientId || null,
      assessorId: value.assessorId,
      task: value.task,
      location: value.location,
      observedAt: value.observedAt,
      reviewDue: value.reviewDue,
      evidence: value.evidence,
      restrictions: value.restrictions,
    };
    const action =
      value.status === 'Approved' ? 'approve' : value.status === 'Revoked' ? 'revoke' : 'restrict';
    await this.mutate(
      'approve',
      async (scope) => {
        Object.assign(
          value,
          await this.send<AcademyObservationRead>(
            '/governance/task-observations/' + (value.version ? value.id + '/' : '') + action,
            body,
            'POST',
            scope,
            value.version ? value.etag : undefined,
          ),
        );
      },
      false,
      () => this.formIntent('observation', value, body, action),
    );
  }
  async queue(assignmentId: string, channel: string, text: string) {
    const body: AcademyNotificationWrite = {
      assignmentId,
      channel: channel as 'In-platform',
      text,
    };
    await this.mutate(
      'create',
      async (scope) => {
        await this.send<AcademyNotificationRead>('/governance/notifications', body, 'POST', scope);
      },
      false,
      () => JSON.stringify(['notification', body]),
    );
  }
  async disclose(
    row: Versioned,
    status: 'Approved' | 'Declined' | 'Provided',
    decision: string,
    reference: string,
  ) {
    const command = { Approved: 'approve', Declined: 'decline', Provided: 'provide' }[status];
    const body: AcademyDisclosureWrite = { decision, deliveryReference: reference };
    await this.mutate(
      'approve',
      async (scope) => {
        Object.assign(
          row,
          await this.send<AcademyRecordsRequestRead>(
            '/governance/disclosures/' + row.id + '/' + command,
            body,
            'POST',
            scope,
            row.etag,
          ),
        );
      },
      false,
      () => JSON.stringify(['disclosure', row.id, status, body]),
    );
  }
  async acknowledge(id: string) {
    const row = this.notifications().find((n) => n.id === id);
    if (!row) throw Error('Notification unavailable.');
    await this.mutate(
      'create',
      async (scope) => {
        await this.send<AcademyNotificationRead>(
          (this.learnerOnly ? '/learning/messages/' : '/learning/notifications/') +
            id +
            '/acknowledge',
          {},
          'POST',
          scope,
          row.etag,
          true,
        );
      },
      true,
    );
  }
}
