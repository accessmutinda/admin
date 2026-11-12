import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import {
  AcademyCertificate,
  AcademyCompletion,
  AcademyAccessRequest,
  AcademyRefresherSchedule,
  AcademyEvent,
} from './academy.models';
import { AcademyRequirement } from './academy-governance.models';
import type {
  AcademyAssignmentStaff,
  AcademyCertificateIssue,
  AcademyCertificateReason,
  AcademyCertificateRead,
  AcademyRequirementRead,
  AcademyRecordsRequestRead,
} from './academy.generated';

export type SourceCertificate = AcademyCertificate &
  Pick<AcademyCertificateRead, 'company_id' | 'version' | 'etag' | 'state'>;
export type SourceRequirement = AcademyRequirement &
  Pick<AcademyRequirementRead, 'company_id' | 'version' | 'etag'>;
export type SourceRequest = AcademyAccessRequest &
  Pick<AcademyRecordsRequestRead, 'company_id' | 'version' | 'etag'>;
export interface CertificateRecord {
  certificate: SourceCertificate;
  person: AcademyAssignmentStaff;
  completion: AcademyCompletion;
  document: { id: string; name: string; category: string; content: string; uploadedAt: string };
  training: {
    courseId: string;
    certificateId: string;
    sourceCompletionId: string;
    title: string;
    completed: string;
    expiry: string;
    evidenceStatus: string;
    assessor: string;
    competency: string;
    cpdHours: number;
  };
  currentTraining: CertificateRecord['training'] | null;
  refresher: AcademyRefresherSchedule | null;
  matrix: { id: string; courseId: string; title: string; missing: boolean; reason: string }[];
  events: AcademyEvent[];
  integration: { rotaAvailable: boolean; detail: string };
}
interface PendingCertificate extends AcademyCompletion {
  person: AcademyAssignmentStaff;
}
interface Page<T> {
  results: T[];
  next: number | null;
  meta: { company_id: string; pending?: PendingCertificate[] };
}
interface ReadCertificate {
  value: CertificateRecord;
  ticket: number;
}
function latestCertificates(entries: ReadCertificate[]): ReadCertificate[] {
  const values = new Map<string, ReadCertificate>();
  for (const entry of entries) {
    const old = values.get(entry.value.certificate.id);
    if (
      !old ||
      entry.value.certificate.version > old.value.certificate.version ||
      (entry.value.certificate.version === old.value.certificate.version &&
        entry.ticket >= old.ticket)
    )
      values.set(entry.value.certificate.id, entry);
  }
  return [...values.values()];
}
@Injectable({ providedIn: 'root' })
export class AcademyCertificatesApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly store = inject(ManagementStore);
  private readonly academy = inject(AcademyApi);
  readonly scope = this.academy.scope;
  readonly available = computed(() => this.access.can('academy', 'certificates', 'read'));
  readonly learnerAvailable = computed(() => this.access.can('academy', 'learner', 'read'));
  readonly canIssue = computed(
    () => this.available() && this.access.can('academy', 'certificates', 'create'),
  );
  readonly canRevoke = computed(
    () => this.available() && this.access.can('academy', 'certificates', 'approve'),
  );
  readonly canLearnerExport = computed(
    () => this.learnerAvailable() && this.access.can('academy', 'learner', 'export'),
  );
  readonly canExport = computed(
    () => this.available() && this.access.can('academy', 'certificates', 'export'),
  );
  readonly error = signal('');
  readonly saving = signal(false);
  readonly loading = signal(false);
  private readonly complianceSource = signal<
    {
      person: AcademyAssignmentStaff;
      requirements: { id: string; courseId: string; title: string; missing: boolean }[];
      compliant: boolean | null;
      percentage: number | null;
    }[]
  >([]);
  readonly compliance = computed(() =>
    this.available() && this.loadedManager() === this.scope() ? this.complianceSource() : [],
  );
  private readonly manager = signal<ReadCertificate[]>([]);
  private readonly own = signal<ReadCertificate[]>([]);
  private readonly loadedManager = signal('');
  private readonly loadedOwn = signal('');
  private readonly pending = signal<PendingCertificate[]>([]);
  private readonly choiceRows = signal<{ id: string; title: string; version: number }[]>([]);
  readonly requirementCourses = computed(() =>
    this.access.can('academy', 'governance', 'read') && this.requirementScope() === this.scope()
      ? this.choiceRows()
      : [],
  );
  private readonly requirementScope = signal('');
  private readonly requirementRows = signal<SourceRequirement[]>([]);
  private readonly managerRequests = signal<SourceRequest[]>([]);
  private readonly ownRequests = signal<SourceRequest[]>([]);
  readonly records = computed(() =>
    latestCertificates([
      ...(this.available() && this.loadedManager() === this.scope() ? this.manager() : []),
      ...(this.learnerAvailable() && this.loadedOwn() === this.scope() ? this.own() : []),
    ]).map((entry) => entry.value),
  );
  readonly certificates = computed(() => this.records().map((r) => r.certificate));
  readonly people = computed(() =>
    [
      ...this.records().map((r) => r.person),
      ...(this.available() && this.loadedManager() === this.scope()
        ? this.pending().map((r) => r.person)
        : []),
    ].filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i),
  );
  readonly completions = computed(() => [
    ...this.records().map((r) => r.completion),
    ...(this.available() && this.loadedManager() === this.scope() ? this.pending() : []),
  ]);
  readonly refreshers = computed(() =>
    this.records().flatMap((r) => (r.refresher ? [r.refresher] : [])),
  );
  readonly requirements = computed(() =>
    this.access.can('academy', 'governance', 'read') && this.requirementScope() === this.scope()
      ? this.requirementRows()
      : [],
  );
  readonly requests = computed(() => {
    const values = new Map<string, SourceRequest>();
    for (const row of [
      ...(this.available() && this.loadedManager() === this.scope() ? this.managerRequests() : []),
      ...(this.learnerAvailable() && this.loadedOwn() === this.scope() ? this.ownRequests() : []),
    ])
      if (!values.has(row.id) || values.get(row.id)!.version < row.version) values.set(row.id, row);
    return [...values.values()];
  });
  private sequence = 0;
  private latestLoads = [0, 0];
  private latestDetails = [0, 0];
  private latestRequirements = 0;
  private readonly activeLoads = new Set<number>();
  private retry?: { scope: string; signature: string; key: string };
  private observedScope = '';
  constructor() {
    this.observedScope = this.fingerprint();
    effect(() => this.syncScope());
  }
  private fingerprint() {
    return this.scope() + ':' + this.available() + ':' + this.learnerAvailable();
  }
  private syncScope() {
    const current = this.fingerprint();
    if (current !== this.observedScope) {
      this.observedScope = current;
      untracked(() => {
        this.clear();
        this.retry = undefined;
      });
    }
  }
  private clear() {
    this.latestLoads = [++this.sequence, ++this.sequence];
    this.latestDetails = [...this.latestLoads];
    this.latestRequirements = ++this.sequence;
    this.activeLoads.clear();
    this.loading.set(false);
    this.manager.set([]);
    this.own.set([]);
    this.loadedManager.set('');
    this.loadedOwn.set('');
    this.pending.set([]);
    this.complianceSource.set([]);
    this.requirementRows.set([]);
    this.choiceRows.set([]);
    this.requirementScope.set('');
    this.managerRequests.set([]);
    this.ownRequests.set([]);
    this.error.set('');
  }
  private root() {
    return `/companies/${this.store.companyId()}/academy`;
  }
  private check(scope: string, learner: boolean) {
    this.syncScope();
    if (scope !== this.scope() || !(learner ? this.learnerAvailable() : this.available()))
      throw Error('The workspace or certificate access changed. Reopen this page.');
  }
  private async pages<T>(
    path: string,
    scope: string,
    learner: boolean,
  ): Promise<{ rows: T[]; pending: PendingCertificate[] }> {
    const rows: T[] = [];
    let page: number | null = 1;
    let pending: PendingCertificate[] = [];
    while (page !== null) {
      const result: Page<T> = await this.auth.api(
        `${this.root()}${path}?page=${page}&page_size=100`,
      );
      this.check(scope, learner);
      if (result.meta.company_id !== this.store.companyId())
        throw Error('Certificate workspace mismatch.');
      rows.push(...result.results);
      pending = result.meta.pending ?? pending;
      page = result.next;
    }
    return { rows, pending };
  }
  private accept(
    record: CertificateRecord,
    scope: string,
    learner: boolean,
    ticket = ++this.sequence,
  ) {
    this.check(scope, learner);
    if (record.certificate.company_id !== this.store.companyId())
      throw Error('Certificate workspace mismatch.');
    const target = learner ? this.own : this.manager;
    target.update((rows) => latestCertificates([...rows, { value: record, ticket }]));
    (learner ? this.loadedOwn : this.loadedManager).set(scope);
  }
  async load(learner = false) {
    this.syncScope();
    const scope = this.scope(),
      ticket = ++this.sequence,
      mode = learner ? 1 : 0;
    this.check(scope, learner);
    this.latestLoads[mode] = ticket;
    this.latestDetails[mode] = ticket;
    const current = () => scope === this.scope() && this.latestLoads[mode] === ticket;
    this.error.set('');
    this.activeLoads.add(ticket);
    this.loading.set(true);
    const target = learner ? this.own : this.manager;
    target.set([]);
    try {
      const result = await this.pages<CertificateRecord>(
        learner ? '/learning/certificates' : '/certificates',
        scope,
        learner,
      );
      for (const row of result.rows)
        if (row.certificate.company_id !== this.store.companyId())
          throw Error('Certificate workspace mismatch.');
      if (!current()) return;
      const pending = learner
        ? []
        : (await this.pages<PendingCertificate>('/certificates/pending', scope, false)).rows;
      if (!current()) return;
      const compliance = learner
        ? []
        : (
            await this.pages<{
              person: AcademyAssignmentStaff;
              requirements: { id: string; courseId: string; title: string; missing: boolean }[];
              compliant: boolean | null;
              percentage: number | null;
            }>('/compliance', scope, false)
          ).rows;
      if (!current()) return;
      const requests = (
        await this.pages<SourceRequest>(
          learner ? '/learning/records-requests' : '/records-requests',
          scope,
          learner,
        )
      ).rows;
      if (!current()) return;
      target.update((existing) =>
        latestCertificates([
          ...result.rows.map((value) => ({ value, ticket })),
          ...existing.filter((entry) => entry.ticket > ticket),
        ]),
      );
      (learner ? this.loadedOwn : this.loadedManager).set(scope);
      (learner ? this.ownRequests : this.managerRequests).set(requests);
      if (!learner) {
        this.pending.set(pending);
        this.complianceSource.set(compliance);
      }
    } catch (e) {
      if (
        scope !== this.scope() ||
        (!current() && ![401, 403].includes((e as { status?: number }).status ?? 0))
      )
        return;
      this.clear();
      this.error.set((e as Error).message);
      throw e;
    } finally {
      this.activeLoads.delete(ticket);
      this.loading.set(this.activeLoads.size > 0);
    }
  }
  async loadRequirements() {
    this.syncScope();
    const scope = this.scope(),
      ticket = ++this.sequence;
    if (!this.access.can('academy', 'governance', 'read')) return;
    this.latestRequirements = ticket;
    this.error.set('');
    const current = () => scope === this.scope() && ticket === this.latestRequirements;
    const rows: SourceRequirement[] = [];
    let page: number | null = 1;
    try {
      while (page !== null) {
        const result: Page<SourceRequirement> = await this.auth.api(
          `${this.root()}/requirements?page=${page}&page_size=100`,
        );
        if (scope !== this.scope() || !this.access.can('academy', 'governance', 'read'))
          throw Error('Requirement access changed.');
        if (result.meta.company_id !== this.store.companyId())
          throw Error('Requirement workspace mismatch.');
        if (result.results.some((row) => row.company_id !== this.store.companyId()))
          throw Error('Requirement workspace mismatch.');
        if (!current()) return;
        rows.push(...result.results);
        page = result.next;
      }
      const choices: { id: string; title: string; version: number }[] = [];
      let choicePage: number | null = 1;
      while (choicePage !== null) {
        const result: Page<{ id: string; title: string; version: number }> = await this.auth.api(
          `${this.root()}/requirements/courses?page=${choicePage}&page_size=100`,
        );
        if (
          scope !== this.scope() ||
          !this.access.can('academy', 'governance', 'read') ||
          result.meta.company_id !== this.store.companyId()
        )
          throw Error('Requirement course access changed.');
        choices.push(...result.results);
        choicePage = result.next;
      }
      if (!current()) return;
      this.choiceRows.set(choices);
      this.requirementRows.set(rows);
      this.requirementScope.set(scope);
    } catch (e) {
      if (!current()) return;
      this.requirementRows.set([]);
      this.choiceRows.set([]);
      this.requirementScope.set('');
      this.error.set((e as Error).message);
      throw e;
    }
  }
  async detail(id: string, learner = false) {
    this.syncScope();
    const scope = this.scope(),
      ticket = ++this.sequence,
      mode = learner ? 1 : 0;
    this.check(scope, learner);
    this.latestDetails[mode] = ticket;
    const current = () => scope === this.scope() && this.latestDetails[mode] === ticket;
    try {
      const record = await this.auth.api<CertificateRecord>(
        `${this.root()}${learner ? '/learning' : ''}/certificates/${id}`,
      );
      if (!current()) return;
      this.accept(record, scope, learner, ticket);
    } catch (e) {
      if (
        scope === this.scope() &&
        (current() || [401, 403].includes((e as { status?: number }).status ?? 0))
      ) {
        this.clear();
        this.error.set((e as Error).message);
        throw e;
      }
    }
  }
  private async write(
    path: string,
    body: unknown,
    etag?: string,
    learner = false,
    method: 'POST' | 'PATCH' = 'POST',
    requirement = false,
    committed?: (result: unknown) => void,
  ): Promise<unknown> {
    this.syncScope();
    const scope = this.scope();
    if (!requirement) this.check(scope, learner);
    if (this.saving()) throw Error('A certificate request is already saving.');
    if (requirement) this.latestRequirements = ++this.sequence;
    else {
      const mode = learner ? 1 : 0;
      this.latestLoads[mode] = ++this.sequence;
      this.latestDetails[mode] = this.latestLoads[mode];
    }
    this.saving.set(true);
    const frozen = structuredClone(body),
      signature = JSON.stringify({ path, body: frozen, etag, method });
    if (this.retry?.scope !== scope || this.retry.signature !== signature)
      this.retry = { scope, signature, key: crypto.randomUUID() };
    try {
      const result = await this.auth.api(this.root() + path, frozen, method, {
        'Idempotency-Key': this.retry.key,
        ...(etag ? { 'If-Match': etag } : {}),
      });
      if (scope !== this.scope()) throw Error('The workspace changed. Reopen this page.');
      this.retry = undefined;
      committed?.(result);
      if (requirement) {
        await this.loadRequirements();
        if (scope !== this.scope()) throw Error('The workspace changed. Reopen this page.');
        if (this.available()) await this.load();
        if (scope !== this.scope()) throw Error('The workspace changed. Reopen this page.');
      } else {
        await this.load(learner);
        this.check(scope, learner);
        if (result && typeof result === 'object' && 'certificate' in result)
          await this.detail((result as CertificateRecord).certificate.id, learner);
      }
      return result;
    } catch (e) {
      if (scope === this.scope()) {
        if ([401, 403, 404].includes((e as { status?: number }).status ?? 0)) this.clear();
        this.error.set((e as Error).message);
        if ([409, 412].includes((e as { status?: number }).status ?? 0)) {
          try {
            if (requirement) await this.loadRequirements();
            else await this.load(learner);
          } catch {}
        }
      }
      throw e;
    } finally {
      this.saving.set(false);
    }
  }
  async issue(attemptId: string) {
    return this.write('/certificates', { attemptId } satisfies AcademyCertificateIssue);
  }
  private etag(id: string) {
    const row = this.certificates().find((c) => c.id === id);
    if (!row) throw Error('Reload the certificate before changing it.');
    return row.etag;
  }
  async revoke(id: string, reason: string) {
    return this.write(
      `/certificates/${id}/revoke`,
      { reason } satisfies AcademyCertificateReason,
      this.etag(id),
    );
  }
  async reissue(id: string, reason: string) {
    return this.write(
      `/certificates/${id}/reissue`,
      { reason } satisfies AcademyCertificateReason,
      this.etag(id),
    );
  }
  async acknowledge(id: string) {
    const row = this.requests().find((r) => r.id === id);
    if (!row) throw Error('Reload the request.');
    return this.write(`/records-requests/${id}/acknowledge`, {}, row.etag);
  }
  async requestRecords() {
    return this.write('/learning/records-requests', {}, undefined, true);
  }
  async saveRequirement(rule: AcademyRequirement) {
    if (!this.canSaveRequirement(rule))
      throw Error('Your role does not permit saving this policy.');
    const prior =
      this.requirements().find((r) => r.id === rule.id) ??
      ('etag' in rule ? (rule as SourceRequirement) : undefined);
    const { id, ...body } = structuredClone(rule);
    delete (body as Partial<SourceRequirement>).company_id;
    delete (body as Partial<SourceRequirement>).version;
    delete (body as Partial<SourceRequirement>).etag;
    const saved = await this.write(
      '/requirements' + (prior ? '/' + id : ''),
      { ...body, effectiveTo: body.effectiveTo || null },
      prior?.etag,
      false,
      prior ? 'PATCH' : 'POST',
      true,
      (result) => {
        const value = result as SourceRequirement;
        if (!value.id || !value.etag || value.company_id !== this.store.companyId())
          throw Error('Requirement workspace mismatch.');
        Object.assign(rule, {
          id: value.id,
          company_id: value.company_id,
          version: value.version,
          etag: value.etag,
        });
      },
    );
    rule.id = (saved as SourceRequirement).id;
    return saved;
  }
  canSaveRequirement(rule: AcademyRequirement): boolean {
    const existing = 'etag' in rule || this.requirements().some((r) => r.id === rule.id);
    return (
      this.access.can('academy', 'governance', 'read') &&
      this.access.can('academy', 'governance', existing ? 'edit' : 'create')
    );
  }
  async pdf(id: string, learner = false): Promise<Blob> {
    const scope = this.scope();
    this.check(scope, learner);
    try {
      const blob = await this.auth.api<Blob>(
        `${this.root()}${learner ? '/learning' : ''}/certificates/${id}/content`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      this.check(scope, learner);
      return blob;
    } catch (e) {
      if (scope === this.scope()) {
        this.clear();
        this.error.set((e as Error).message);
      }
      throw e;
    }
  }
  async brandingBlob(assetId: string): Promise<Blob | null> {
    const certificate = this.certificates().find((c) =>
      [c.branding.logoId, c.branding.backgroundId, c.branding.signatureId].includes(assetId),
    );
    if (!certificate) return null;
    const learner = !this.available();
    const scope = this.scope();
    this.check(scope, learner);
    try {
      const blob = await this.auth.api<Blob>(
        `${this.root()}${learner ? '/learning' : ''}/certificates/${certificate.id}/media/${assetId}/content`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      this.check(scope, learner);
      return blob;
    } catch (error) {
      if (scope === this.scope()) {
        this.clear();
        if ([401, 403].includes((error as { status?: number }).status ?? 0))
          this.access.invalidate();
        this.error.set((error as Error).message);
      }
      throw error;
    }
  }

  async download(id: string, learner = false) {
    const blob = await this.pdf(id, learner);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `certificate-${id}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
