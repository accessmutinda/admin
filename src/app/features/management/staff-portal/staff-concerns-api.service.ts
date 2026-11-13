import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { StaffDashboardApi } from './staff-dashboard-api.service';
import { PortalConcern, PortalEvent } from './portal.models';
import { JournalAttachment } from '../journal/journal.models';
import {
  StaffConcernContext,
  StaffConcernRead,
  StaffConcernPage,
  StaffConcernWrite,
} from './staff-concerns.generated';

export type ConnectedConcern = PortalConcern & {
  version?: number;
  etag?: string;
  company_id?: string;
  can_edit?: boolean;
  can_note?: boolean;
  careEventId?: string;
};
@Injectable()
export class StaffConcernsApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly dashboard = inject(StaffDashboardApi);
  private readonly contextValue = signal<StaffConcernContext | null>(null);
  readonly context = computed(() =>
    this.verified() === this.scope() ? this.contextValue() : null,
  );
  private readonly concernsValue = signal<ConnectedConcern[]>([]);
  readonly concerns = computed(() => (this.staffReady() ? this.concernsValue() : []));
  private readonly eventsValue = signal<PortalEvent[]>([]);
  readonly events = computed(() => (this.staffReady() ? this.eventsValue() : []));
  readonly loading = signal(false);
  private readonly readyValue = signal(false);
  readonly ready = computed(() => this.staffReady() && this.readyValue());
  readonly busy = signal(false);
  readonly error = signal('');
  readonly code = signal('');
  readonly scope = computed(() => {
    const context = this.access.context();
    return JSON.stringify({
      company: this.access.companyId(),
      actor: this.auth.profile()?.id,
      context: context
        ? {
            active: context.company_active,
            platform: context.platform,
            revision: context.revision,
            permissions: [...context.permissions].sort(),
            core: [...context.core_permissions].sort(),
            modules: [...context.enabled_modules].sort(),
            roles: context.roles.map((role) => role.id).sort(),
          }
        : null,
    });
  });
  private readonly verified = signal('');
  readonly staffReady = computed(() => !!this.context() && this.verified() === this.scope());
  readonly email = computed(() => (this.staffReady() ? this.context()!.email : ''));
  readonly contacts = computed(
    () =>
      this.context()?.contacts.map((p) => ({
        name: p['name'],
        email: p['email'],
        role: p['role'],
      })) ?? [],
  );
  readonly clients = computed(
    () => this.context()?.clients.map((p) => ({ id: p['id'], name: p['name'] })) ?? [],
  );
  readonly capabilities = computed(() => this.context()?.capabilities ?? {});
  readonly openConcerns = computed(() =>
    this.concerns().filter((c) => !['Resolved', 'Closed'].includes(c.status)),
  );
  readonly store = { company: computed(() => this.context()?.company ?? null) };
  get today() {
    return this.context()?.local_date ?? '';
  }
  private generation = 0;
  private auditTarget = '';
  private pending?: Promise<void>;
  private destroyed = false;
  private timer?: ReturnType<typeof setInterval>;
  private requests = new Map<string, string>();
  constructor() {
    let prior = this.scope();
    effect(() => {
      const current = this.scope();
      if (current !== prior) {
        prior = current;
        untracked(() => {
          this.clear();
          void this.load();
        });
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      if (this.timer) clearInterval(this.timer);
      this.clear();
    });
  }
  start() {
    void this.load();
    this.timer ??= setInterval(() => {
      if (document.visibilityState !== 'hidden' && !this.busy()) void this.load();
    }, 15000);
  }
  private clear() {
    this.generation++;
    this.auditTarget = '';
    this.verified.set('');
    this.pending = undefined;
    this.contextValue.set(null);
    this.concernsValue.set([]);
    this.eventsValue.set([]);
    this.readyValue.set(false);
    this.loading.set(false);
    this.busy.set(false);
    this.error.set('');
    this.code.set('');
    this.requests.clear();
  }
  private root() {
    return `/companies/${this.access.companyId()}/staff-portal/concerns`;
  }
  private current(scope: string, generation = this.generation) {
    return !this.destroyed && scope === this.scope() && generation === this.generation;
  }
  private validate(value: { company_id?: string }) {
    if (value.company_id !== this.access.companyId())
      throw Error('The concern response does not match this workspace.');
  }
  private failure(error: unknown) {
    return error instanceof Error
      ? error.message
      : 'Your staff concerns are unavailable. Please try again.';
  }
  private async api<T>(
    path: string,
    body?: unknown,
    method?: 'POST' | 'PATCH',
    headers?: Record<string, string>,
    responseType: 'json' | 'blob' = 'json',
  ): Promise<T> {
    const scope = this.scope();
    try {
      return await this.auth.api<T>(path, body, method, headers, responseType);
    } catch (error) {
      if (this.current(scope) && [401, 403].includes((error as { status?: number }).status ?? 0)) {
        this.clear();
        this.code.set((error as { code?: string }).code ?? 'permission_denied');
        this.error.set(this.failure(error));
      }
      throw error;
    }
  }
  async load(): Promise<void> {
    if (this.destroyed) return;
    if (this.pending) return this.pending;
    const scope = this.scope(),
      generation = ++this.generation;
    this.loading.set(true);
    const promise = (async () => {
      try {
        const context = await this.api<StaffConcernContext>(this.root() + '/context');
        if (!this.current(scope, generation)) return;
        this.validate(context);
        if (
          String(context.actor_id) !== String(this.auth.profile()?.id) ||
          context.company.id !== context.company_id ||
          !context.person_id ||
          !context.employment_id ||
          !context.email
        )
          throw Error('This concern context does not belong to your staff account.');
        this.verified.set(scope);
        this.contextValue.set(context);
        this.dashboard.rememberCompany(context.company, context.actor_id);
        const records: ConnectedConcern[] = [];
        let page: number | null = 1;
        while (page) {
          const result: StaffConcernPage = await this.api<StaffConcernPage>(
            this.root() + `?page=${page}&page_size=100`,
          );
          if (!this.current(scope, generation)) return;
          this.validate(result);
          records.push(...result.results.map((row) => this.decode(row)));
          page = result.next;
        }
        this.concernsValue.set(records);
        this.readyValue.set(true);
        this.error.set('');
        this.code.set('');
      } catch (error) {
        if (this.current(scope, generation)) {
          this.concernsValue.set([]);
          this.eventsValue.set([]);
          this.readyValue.set(false);
          this.error.set(this.failure(error));
        }
      } finally {
        if (this.current(scope, generation)) {
          this.loading.set(false);
          this.pending = undefined;
        }
      }
    })();
    this.pending = promise;
    return promise;
  }
  private decode(row: StaffConcernRead): ConnectedConcern {
    this.validate(row);
    return {
      ...row,
      visitId: row.visitId || '',
      careEventId: row.careEventId || '',
      checklist: row.checklist.map((c) => ({
        ...c,
        due: c.due ?? '',
        completedAt: c.completedAt ?? undefined,
      })),
      evidence: row.evidence.map((f) => ({ ...f, content: '' })),
      notes: row.notes.map((n) => ({
        ...n,
        kind: 'Note',
        attachments: n.attachments.map((f) => ({ ...f, content: '' })),
      })),
    };
  }
  private remember(row: StaffConcernRead) {
    const value = this.decode(row);
    this.concernsValue.update((rows) => [value, ...rows.filter((c) => c.id !== value.id)]);
    return value;
  }
  async detail(id: string): Promise<ConnectedConcern> {
    const scope = this.scope(),
      generation = this.generation;
    const row = await this.api<StaffConcernRead>(this.root() + '/' + id);
    if (!this.current(scope, generation) || row.id !== id)
      throw Error('The workspace or selected concern changed.');
    return this.remember(row);
  }
  async loadAudit(id: string) {
    this.auditTarget = id;
    const scope = this.scope();
    const result = await this.api<{ company_id: string; results: PortalEvent[] }>(
      this.root() + '/' + id + '/audit',
    );
    if (!this.current(scope) || this.auditTarget !== id) return;
    this.validate(result);
    this.eventsValue.set(result.results);
  }
  person(email: string) {
    return (
      this.contacts().find((p) => p.email.toLowerCase() === email.toLowerCase())?.name ?? email
    );
  }
  clientName(id: string) {
    return (
      this.clients().find((c) => c.id === id)?.name ?? (id ? 'Service user unavailable' : 'General')
    );
  }
  newConcern(): ConnectedConcern {
    return {
      id: crypto.randomUUID(),
      reference: '',
      title: '',
      description: '',
      type: 'Safeguarding',
      priority: 'High',
      clientId: '',
      staffEmail: '',
      assignedTo: this.email(),
      followers: [],
      visitDate: this.today,
      raisedBy: this.context()?.name ?? '',
      raisedAt: '',
      status: 'Raised',
      checklist: (this.context()?.checklist ?? []).map((title) => ({
        id: crypto.randomUUID(),
        title,
        done: false,
      })),
      notes: [],
      evidence: [],
      outcome: '',
    };
  }
  private key(intent: string) {
    if (!this.requests.has(intent)) this.requests.set(intent, crypto.randomUUID());
    return this.requests.get(intent)!;
  }
  private body(row: ConnectedConcern): StaffConcernWrite {
    return {
      title: row.title,
      description: row.description,
      type: row.type as StaffConcernWrite['type'],
      priority: row.priority,
      clientId: row.clientId || null,
      visitId: row.visitId || null,
      careEventId: row.careEventId || null,
      staffEmail: row.staffEmail,
      assignedTo: row.assignedTo,
      followers: row.followers,
      visitDate: row.visitDate,
      visitTime: row.visitTime ?? '',
      location: row.location ?? '',
      outcome: row.outcome,
      checklist: row.etag
        ? row.checklist.map((c) => ({
            id: c.id,
            done: c.done,
            assignedTo: c.assignedTo ?? '',
            due: c.due || null,
          }))
        : [],
      attachment_ids: row.evidence.map((f) => f.id),
    };
  }
  async saveConcern(input: ConnectedConcern): Promise<string | null> {
    if (this.busy()) return 'Wait for the current concern action.';
    const scope = this.scope();
    this.busy.set(true);
    try {
      const previous = this.concerns().find((c) => c.id === input.id),
        existing = !!input.etag;
      const changed = existing && previous?.status !== input.status;
      const command = changed ? (previous?.status === 'Closed' ? 'reopen' : 'transition') : '';
      const body = { ...this.body(input), ...(command ? { status: input.status } : {}) };
      const path = this.root() + (existing ? '/' + input.id : '') + (command ? '/' + command : '');
      const headers: Record<string, string> = existing ? { 'If-Match': input.etag! } : {};
      if (!existing || command)
        headers['Idempotency-Key'] = this.key(JSON.stringify([path, input.id, input.etag, body]));
      const result = await this.api<StaffConcernRead>(
        path,
        body,
        existing && !command ? 'PATCH' : 'POST',
        headers,
      );
      if (!this.current(scope)) return 'The workspace changed.';
      Object.assign(input, this.remember(result));
      await this.loadAudit(result.id);
      return null;
    } catch (error) {
      return this.failure(error);
    } finally {
      if (this.current(scope)) this.busy.set(false);
    }
  }
  async addNote(
    id: string,
    text: string,
    attachments: JournalAttachment[] = [],
    expectedVersion?: string,
  ): Promise<string | null> {
    if (this.busy()) return 'Wait for the current concern action.';
    const scope = this.scope();
    const row = this.concerns().find((c) => c.id === id);
    if (!row?.etag) return 'Reopen the current concern before adding notes.';
    this.busy.set(true);
    try {
      const body = { text, attachment_ids: attachments.map((f) => f.id) },
        path = this.root() + '/' + id + '/notes';
      const result = await this.api<StaffConcernRead>(path, body, 'POST', {
        'If-Match': expectedVersion ?? row.etag,
        'Idempotency-Key': this.key(JSON.stringify([path, expectedVersion ?? row.etag, body])),
      });
      if (!this.current(scope)) return 'The workspace changed.';
      this.remember(result);
      await this.loadAudit(id);
      return null;
    } catch (error) {
      return this.failure(error);
    } finally {
      if (this.current(scope)) this.busy.set(false);
    }
  }
  async upload(file: File): Promise<JournalAttachment> {
    const scope = this.scope(),
      form = new FormData();
    form.append('file', file);
    let row = await this.api<JournalAttachment & { company_id: string }>(
      this.root() + '/files',
      form,
      'POST',
      { 'Idempotency-Key': crypto.randomUUID() },
    );
    for (let attempt = 0; row.state === 'quarantined' && attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!this.current(scope)) throw Error('The workspace changed.');
      row = await this.api<JournalAttachment & { company_id: string }>(
        this.root() + '/files/' + row.id,
      );
    }
    if (!this.current(scope)) throw Error('The workspace changed.');
    this.validate(row);
    if (row.state !== 'clean')
      throw Error(
        row.state === 'quarantined'
          ? 'Attachment scanning is pending. Try attaching it again once the scanner is available.'
          : 'The attachment did not pass its scan.',
      );
    return { ...row, content: '' };
  }
  async download(file: JournalAttachment) {
    const scope = this.scope();
    const blob = await this.api<Blob>(
      this.root() + '/files/' + file.id + '/content',
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (!this.current(scope)) throw Error('The workspace changed.');
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
