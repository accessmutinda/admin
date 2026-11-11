import type {
  JournalOptions,
  JournalPage,
  JournalEntryRead,
  JournalTaskRead,
} from './journal.generated';
import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ApiError } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import {
  JournalAttachment,
  JournalData,
  JournalEntry,
  JournalEvent,
  JournalTask,
} from './journal.models';

type Options = JournalOptions;
type Contact = Options['contacts'][number];
type Visit = Options['visits'][number];
type Page = JournalPage;
export interface JournalQuery {
  client_id?: string;
  folder: string;
  search: string;
  category: string;
  filter: string;
  order: string;
  page: number;
}
@Injectable({ providedIn: 'root' })
export class JournalService {
  readonly auth = inject(AuthService);
  readonly access = inject(CompanyAccessService);
  readonly email = computed(() => this.auth.currentUser()?.email.toLowerCase() ?? '');
  readonly allowed = computed(() => this.access.can('care', 'recording', 'read'));
  readonly scope = computed(() => {
    const context = this.access.context();
    return JSON.stringify({
      actor: this.auth.profile()?.id,
      company: this.access.companyId(),
      allowed: this.allowed(),
      context: context
        ? {
            active: context.company_active,
            platform: context.platform,
            revision: context.revision,
            permissions: [...context.permissions].sort(),
            modules: [...context.enabled_modules].sort(),
            roles: context.roles.map((role) => role.id).sort(),
          }
        : null,
    });
  });
  readonly entries = signal<JournalEntry[]>([]);
  private readonly taskRecords = signal<JournalTask[]>([]);
  readonly tasks = computed(() => this.taskRecords().filter((task) => task.owner === this.email()));
  readonly events = signal<JournalEvent[]>([]);
  readonly contacts = signal<Contact[]>([]);
  readonly clients = signal<{ id: string; name: string }[]>([]);
  readonly visits = signal<Visit[]>([]);
  readonly count = signal(0);
  readonly summary = signal<{
    folders: Record<string, number>;
    unread: number;
    awaiting: number;
    mentions: number;
    local_date: string;
  }>({ folders: {}, unread: 0, awaiting: 0, mentions: 0, local_date: '' });
  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly printBusy = signal(false);
  readonly error = signal('');
  readonly detail = signal<JournalEntry | null>(null);
  readonly data = computed<JournalData>(() => ({
    entries: this.entries(),
    tasks: this.taskRecords(),
    events: this.events(),
  }));
  readonly capabilities = signal({ can_create: false, can_edit: false, can_export: false });
  private query: JournalQuery = {
    folder: 'Inbox',
    search: '',
    category: '',
    filter: 'All messages',
    order: 'Newest first',
    page: 1,
  };
  private generation = 0;
  private detailGeneration = 0;
  private optionGeneration = 0;
  private destroyed = false;
  private active = 0;
  private pendingSend = new Map<string, string>();
  private cache = new Map<string, JournalEntry>();
  private requests = new Map<string, string>();
  private timer: ReturnType<typeof setInterval>;
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => this.clear());
    });
    const refresh = () => {
      if (this.active && document.visibilityState !== 'hidden' && this.allowed() && !this.busy())
        void this.refresh();
    };
    this.timer = setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      clearInterval(this.timer);
      document.removeEventListener('visibilitychange', refresh);
      this.clear();
    });
  }
  activate(): () => void {
    this.active++;
    return () => {
      this.active = Math.max(0, this.active - 1);
    };
  }
  private clear() {
    this.generation++;
    this.detailGeneration++;
    this.optionGeneration++;
    this.entries.set([]);
    this.taskRecords.set([]);
    this.events.set([]);
    this.contacts.set([]);
    this.clients.set([]);
    this.visits.set([]);
    this.detail.set(null);
    this.count.set(0);
    this.summary.set({ folders: {}, unread: 0, awaiting: 0, mentions: 0, local_date: '' });
    this.capabilities.set({ can_create: false, can_edit: false, can_export: false });
    this.error.set('');
    this.loading.set(false);
    this.ready.set(false);
    this.busy.set(false);
    this.printBusy.set(false);
    this.cache.clear();
    this.requests.clear();
    this.pendingSend.clear();
  }
  private current(scope: string) {
    return !this.destroyed && scope === this.scope() && this.allowed();
  }
  private root() {
    if (!this.allowed() || !this.access.companyId())
      throw Error('Client Journal access is unavailable.');
    return `/companies/${this.access.companyId()}/journal`;
  }
  private validate<T extends { company_id?: string }>(value: T): T {
    if (value.company_id !== this.access.companyId())
      throw Error('The journal response does not match this workspace.');
    return value;
  }
  private key(intent: string) {
    if (!this.requests.has(intent)) this.requests.set(intent, crypto.randomUUID());
    return this.requests.get(intent)!;
  }
  private normalize(entry: JournalEntry | JournalEntryRead): JournalEntry {
    this.validate(entry);
    const result: JournalEntry = {
      ...entry,
      attachments: entry.attachments.map((file) => ({ ...file, content: '' })),
    };
    this.cache.set(result.id, structuredClone(result));
    return result;
  }
  recipients(_clientId = '') {
    return this.contacts();
  }
  async loadOptions(clientId = ''): Promise<void> {
    const scope = this.scope(),
      generation = ++this.optionGeneration;
    const contacts: Contact[] = [],
      clients: { id: string; name: string }[] = [],
      visits: Visit[] = [];
    try {
      let page: number | null = 1;
      while (page) {
        const params: URLSearchParams = new URLSearchParams({ page: String(page) });
        if (clientId) params.set('client_id', clientId);
        const result: Options = await this.auth.api<Options>(`${this.root()}/options?${params}`);
        if (!this.current(scope) || generation !== this.optionGeneration) return;
        this.validate(result);
        contacts.push(...result.contacts);
        clients.push(...result.clients);
        visits.push(...result.visits);
        this.capabilities.set(result);
        page = result.next_page;
      }
      this.contacts.set(contacts);
      this.clients.set(clients);
      this.visits.set(visits);
    } catch (error) {
      if (this.current(scope) && generation === this.optionGeneration) {
        this.contacts.set([]);
        this.clients.set([]);
        this.visits.set([]);
        this.capabilities.set({ can_create: false, can_edit: false, can_export: false });
        this.error.set(error instanceof Error ? error.message : 'Journal options are unavailable.');
      }
    }
  }
  invalidateList() {
    this.generation++;
    this.entries.set([]);
    this.count.set(0);
    this.ready.set(false);
    this.loading.set(true);
  }
  selectClient(clientId: string) {
    if ((this.query.client_id ?? '') === clientId) return;
    this.generation++;
    this.detailGeneration++;
    this.query = { ...this.query, client_id: clientId || undefined, page: 1 };
    this.entries.set([]);
    this.taskRecords.set([]);
    this.events.set([]);
    this.detail.set(null);
    this.count.set(0);
    this.ready.set(false);
    this.cache.clear();
    this.summary.set({ folders: {}, unread: 0, awaiting: 0, mentions: 0, local_date: '' });
  }
  async setQuery(query: JournalQuery) {
    this.selectClient(query.client_id ?? '');
    this.query = { ...query };
    await this.refresh();
  }
  async refresh() {
    if (!this.allowed()) return;
    const scope = this.scope(),
      generation = ++this.generation;
    const query = { ...this.query };
    const params: URLSearchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== '') params.set(key, String(value));
    this.loading.set(true);
    try {
      const page = await this.auth.api<Page>(`${this.root()}?${params}`);
      if (!this.current(scope) || generation !== this.generation) return;
      this.validate(page.meta);
      if (query.client_id && page.results.some((row) => row.clientId !== query.client_id))
        throw Error('The journal response does not match this service user.');
      this.entries.set(page.results.map((entry) => this.normalize(entry)));
      this.count.set(page.count);
      this.ready.set(true);
      this.summary.set(page.meta);
      this.error.set('');
      if (!this.contacts().length) await this.loadOptions(query.client_id ?? '');
      if (!this.current(scope) || generation !== this.generation) return;
      await this.refreshAuxiliary(scope, '', generation);
      const selected = this.detail();
      if (selected && this.current(scope) && generation === this.generation) {
        const fresh = await this.auth.api<JournalEntryRead>(`${this.root()}/${selected.id}`);
        if (this.current(scope) && generation === this.generation)
          this.detail.set(this.normalize(fresh));
      }
    } catch (error) {
      if (this.current(scope) && generation === this.generation) {
        this.entries.set([]);
        this.count.set(0);
        this.ready.set(false);
        this.events.set([]);
        this.taskRecords.set([]);
        this.detail.set(null);
        this.cache.clear();
        this.contacts.set([]);
        this.clients.set([]);
        this.visits.set([]);
        this.capabilities.set({ can_create: false, can_edit: false, can_export: false });
        this.summary.set({ folders: {}, unread: 0, awaiting: 0, mentions: 0, local_date: '' });
        this.error.set(error instanceof Error ? error.message : 'The journal could not be loaded.');
      }
    } finally {
      if (this.current(scope) && generation === this.generation) this.loading.set(false);
    }
  }
  private async refreshAuxiliary(scope: string, clientId: string, generation: number) {
    const load = async <T>(kind: string) => {
      const rows: T[] = [];
      let page: number | null = 1;
      while (page) {
        const params: URLSearchParams = new URLSearchParams({ page: String(page) });
        if (clientId) params.set('client_id', clientId);
        const result: { company_id: string; next_page: number | null; results: T[] } =
          await this.auth.api<{ company_id: string; next_page: number | null; results: T[] }>(
            `${this.root()}/${kind}?${params}`,
          );
        if (!this.current(scope) || generation !== this.generation) return null;
        this.validate(result);
        rows.push(...result.results);
        page = result.next_page;
      }
      return rows;
    };
    const [tasks, events] = await Promise.all([
      load<JournalTaskRead>('tasks'),
      load<JournalEvent>('activity'),
    ]);
    if (this.current(scope) && generation === this.generation && tasks && events) {
      this.taskRecords.set(
        tasks.map((task) => ({
          ...task,
          resolvedAt: task.resolvedAt ?? undefined,
          attachments: (task.attachments ?? []).map((file) => ({ ...file, content: '' })),
        })),
      );
      this.events.set(events);
    }
  }
  async preparePrint(): Promise<void> {
    if (this.printBusy() || this.busy()) throw Error('Wait for the current journal action.');
    const scope = this.scope(),
      generation = ++this.generation;
    this.printBusy.set(true);
    this.busy.set(true);
    try {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(this.query))
        if (value !== undefined && value !== '') query.set(key, String(value));
      const result = await this.auth.api<JournalPage>(`${this.root()}/print?${query}`);
      if (!this.current(scope) || generation !== this.generation)
        throw Error('The workspace or journal view changed.');
      this.validate(result.meta);
      this.entries.set(result.results.map((row) => this.normalize(row)));
      this.count.set(result.count);
      this.summary.set(result.meta);
    } finally {
      if (this.current(scope)) {
        this.printBusy.set(false);
        this.busy.set(false);
      }
    }
  }
  async getEntry(id: string): Promise<JournalEntry> {
    const scope = this.scope(),
      generation = ++this.detailGeneration;
    const value = await this.auth.api<JournalEntryRead>(`${this.root()}/${id}`);
    if (!this.current(scope) || value.id !== id)
      throw Error('The workspace or selected entry changed.');
    const entry = this.normalize(value);
    if (generation === this.detailGeneration) this.detail.set(entry);
    return entry;
  }
  async getTask(id: string): Promise<JournalTask> {
    const scope = this.scope();
    const row = await this.auth.api<JournalTaskRead>(`${this.root()}/tasks/${id}`);
    if (!this.current(scope) || row.id !== id) throw Error('The workspace changed.');
    this.validate(row);
    return {
      ...row,
      resolvedAt: row.resolvedAt ?? undefined,
      attachments: row.attachments.map((file) => ({ ...file, content: '' })),
    };
  }
  closeEntry() {
    this.detailGeneration++;
    this.detail.set(null);
  }
  cached(id: string) {
    return this.cache.get(id);
  }
  newEntry(): JournalEntry {
    return {
      id: crypto.randomUUID(),
      author: this.auth.currentUser()?.name ?? '',
      authorEmail: this.email(),
      to: [],
      cc: [],
      subject: '',
      clientId: '',
      visitId: '',
      kind: 'Message',
      category: 'Care update',
      priority: 'Normal',
      body: '',
      bodyHtml: '',
      attachments: [],
      state: 'Draft',
      createdAt: new Date().toISOString(),
      readBy: [],
      archivedBy: [],
      starredBy: [],
      followUpBy: [],
    };
  }
  private body(input: JournalEntry) {
    return {
      clientId: input.clientId || null,
      visitId: input.visitId || null,
      replyToId: input.replyToId || null,
      kind: input.kind ?? 'Message',
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      body: input.body,
      bodyHtml: input.bodyHtml ?? '',
      category: input.category,
      priority: input.priority,
      responseRequired: !!input.responseRequired,
      attachment_ids: input.attachments.map((file) => file.id),
    };
  }
  private failure(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      const fields = Object.entries(error.fieldErrors)
        .filter(([, messages]) => messages.length)
        .map(
          ([field, messages]) =>
            `${({ subject: 'Subject', to: 'Recipients', cc: 'Copy recipients', body: 'Message', clientId: 'Related service user', visitId: 'Related visit', attachment_ids: 'Attachments', actions: 'Action taken', due: 'Due date', owner: 'Assigned to' } as Record<string, string>)[field] ?? field}: ${messages.join(' ')}`,
        );
      return [error.message, ...fields].join(' ');
    }
    return error instanceof Error ? error.message : fallback;
  }
  async save(input: JournalEntry, send: boolean): Promise<string | null> {
    if (this.busy()) return 'A journal action is already in progress.';
    const scope = this.scope();
    this.busy.set(true);
    try {
      const body = this.body(input),
        hash = JSON.stringify(body);
      if (
        send &&
        (!input.body.trim() || ((input.kind ?? 'Message') === 'Message' && !input.to.length))
      )
        return !input.body.trim()
          ? 'Message: Enter a message before sending.'
          : 'Recipients: Choose a recipient before sending.';
      const cached = this.cache.get(input.id);
      const unchanged = !!input.etag && !!cached && JSON.stringify(this.body(cached)) === hash;
      if (!send || (!unchanged && this.pendingSend.get(input.id) !== hash)) {
        const existing = !!input.etag;
        const saved = await this.auth.api<JournalEntryRead>(
          existing ? `${this.root()}/${input.id}` : this.root(),
          body,
          existing ? 'PATCH' : 'POST',
          existing
            ? { 'If-Match': input.etag! }
            : { 'Idempotency-Key': this.key('draft:' + input.id) },
        );
        if (!this.current(scope)) throw Error('The workspace changed.');
        Object.assign(input, this.normalize(saved));
        if (send) this.pendingSend.set(input.id, JSON.stringify(this.body(input)));
      }
      if (send) {
        const sent = await this.auth.api<JournalEntryRead>(
          `${this.root()}/${input.id}/send`,
          {},
          'POST',
          { 'If-Match': input.etag!, 'Idempotency-Key': this.key('send:' + input.id) },
        );
        if (!this.current(scope)) throw Error('The workspace changed.');
        Object.assign(input, this.normalize(sent));
        this.pendingSend.delete(input.id);
      }
      await this.refresh();
      return null;
    } catch (error) {
      return this.failure(error, 'The journal entry could not be saved.');
    } finally {
      if (this.current(scope)) this.busy.set(false);
    }
  }
  async bulkMark(
    ids: string[],
    field: 'archivedBy' | 'deletedBy',
    enabled: boolean,
  ): Promise<string | null> {
    if (this.busy()) return 'A journal action is already in progress.';
    const scope = this.scope();
    this.busy.set(true);
    try {
      const body = {
        field,
        enabled,
        entries: ids.map((id) => {
          const row = this.cached(id);
          if (!row) throw Error('A selected journal entry is unavailable.');
          return { id, etag: row.state_etag! };
        }),
      };
      const result = await this.auth.api<{ company_id: string; results: JournalEntryRead[] }>(
        `${this.root()}/bulk-state`,
        body,
        'POST',
        { 'Idempotency-Key': this.key('bulk:' + JSON.stringify(body)) },
      );
      if (!this.current(scope)) throw Error('The workspace changed.');
      this.validate(result);
      for (const row of result.results) this.normalize(row);
      await this.refresh();
      return null;
    } catch (error) {
      return this.failure(error, 'The selected entries could not be updated.');
    } finally {
      if (this.current(scope)) this.busy.set(false);
    }
  }
  async mark(
    id: string,
    field: 'readBy' | 'archivedBy' | 'starredBy' | 'followUpBy' | 'deletedBy',
    enabled: boolean,
  ): Promise<string | null> {
    if (this.busy()) return 'A journal action is already in progress.';
    const scope = this.scope();
    const row = this.cache.get(id);
    if (!row) return 'This journal entry is unavailable.';
    this.busy.set(true);
    try {
      const saved = await this.auth.api<JournalEntryRead>(
        `${this.root()}/${id}/state`,
        { field, enabled },
        'PATCH',
        { 'If-Match': row.state_etag! },
      );
      if (!this.current(scope)) return 'The workspace changed.';
      const normalized = this.normalize(saved);
      this.entries.update((rows) => rows.map((row) => (row.id === id ? normalized : row)));
      if (this.detail()?.id === id) this.detail.set(normalized);
      await this.refresh();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'This journal action could not be saved.';
    } finally {
      if (this.current(scope)) this.busy.set(false);
    }
  }
  async saveTask(input: JournalTask): Promise<string | null> {
    if (this.busy()) return 'An action is already in progress.';
    const scope = this.scope();
    this.busy.set(true);
    try {
      if (input.concernId)
        throw Error('Concern-linked tasks must be recorded in the Concerns workflow.');
      const body = {
        owner: input.owner,
        title: input.title,
        clientId: input.clientId || null,
        visitId: input.visitId || null,
        journalId: input.journalId || null,
        due: input.due,
        dueTime: input.dueTime || null,
        followUp: input.followUp || null,
        followUpTime: input.followUpTime || null,
        priority: input.priority,
        status: input.status,
        shared: input.shared ?? true,
        notes: input.notes ?? '',
        actions: input.actions ?? '',
        attachment_ids: (input.attachments ?? []).map((file) => file.id),
      };
      const row = await this.auth.api<JournalTaskRead>(
        input.etag ? `${this.root()}/tasks/${input.id}` : `${this.root()}/tasks`,
        body,
        input.etag ? 'PATCH' : 'POST',
        input.etag
          ? { 'If-Match': input.etag }
          : { 'Idempotency-Key': this.key('task:' + input.id) },
      );
      if (!this.current(scope)) throw Error('The workspace changed.');
      this.validate(row);
      Object.assign(input, row);
      await this.refresh();
      return null;
    } catch (error) {
      return this.failure(error, 'The task could not be saved.');
    } finally {
      if (this.current(scope)) this.busy.set(false);
    }
  }
  async upload(file: File, intent = ''): Promise<JournalAttachment> {
    const scope = this.scope();
    const form = new FormData();
    form.append('file', file);
    const row = await this.auth.api<JournalAttachment & { company_id: string }>(
      `${this.root()}/files`,
      form,
      'POST',
      {
        'Idempotency-Key': this.key(
          'file:' +
            (intent || crypto.randomUUID()) +
            ':' +
            file.name +
            ':' +
            file.size +
            ':' +
            file.lastModified,
        ),
      },
    );
    if (!this.current(scope)) throw Error('The workspace changed.');
    this.validate(row);
    return { ...row, content: '' };
  }
  async checkFile(id: string): Promise<JournalAttachment> {
    const scope = this.scope();
    const row = await this.auth.api<JournalAttachment & { company_id: string }>(
      `${this.root()}/files/${id}`,
    );
    if (!this.current(scope) || row.id !== id) throw Error('The workspace changed.');
    this.validate(row);
    return { ...row, content: '' };
  }
  async download(file: JournalAttachment): Promise<void> {
    const scope = this.scope();
    const blob = await this.auth.api<Blob>(
      `${this.root()}/files/${file.id}/content`,
      undefined,
      undefined,
      {},
      'blob',
    );
    if (!this.current(scope)) throw Error('The workspace changed.');
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
