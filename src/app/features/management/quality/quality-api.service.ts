import { Injectable, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import {
  Assessment,
  AssessmentTemplate,
  CorrectiveAction,
  QualityData,
  QualityEvidence,
  ukDate,
} from './quality.models';
import type {
  QualityWorkspaceRead,
  QualityMutationRead,
  QualityFileRead,
  QualityDetailRead,
} from './quality.generated';

@Injectable()
export class QualityApi {
  readonly connected = true;
  readonly auth = inject(AuthService);
  readonly records = inject(ServiceUsersApi);
  readonly access = this.records.access;
  readonly scope = this.records.scope;
  private readonly route = inject(ActivatedRoute);
  readonly supervisor = this.route.snapshot.data['supervisor'] === true;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly unavailable = signal<string[]>([]);
  readonly denied = signal(false);
  readonly today = signal(ukDate());
  readonly role = computed(() => this.auth.currentUser()?.roleCode || '');
  private readonly raw = signal<any>(null);
  private readonly snapshot = computed(() =>
    this.can('view') && this.raw()?._scope === this.scope() ? this.raw() : null,
  );
  private readonly view = signal<string | null>(null);
  private generation = 0;
  private session = 0;
  private readonly active = signal(true);
  private appliedScope = this.scope();
  private destroyed = false;
  private readonly intents = new Map<string, string>();
  private readonly created = new Map<string, { id: string; version: number }>();
  readonly data = computed<QualityData>(() =>
    this.can('view') && this.snapshot()
      ? { assessments: this.snapshot().results, actions: this.snapshot().context.actions }
      : { assessments: [], actions: [] },
  );
  readonly templates = computed<AssessmentTemplate[]>(() =>
    this.can('view') ? this.snapshot()?.context.templates || [] : [],
  );
  readonly members = computed<any[]>(() =>
    this.can('view') ? this.snapshot()?.context.members || [] : [],
  );
  readonly assessors = computed(() =>
    this.members().filter((m) => this.snapshot()?.context.assessors?.includes(m.id)),
  );
  readonly owners = computed(() =>
    this.members().filter((m) => this.snapshot()?.context.owners?.includes(m.id)),
  );
  readonly metrics = computed<Record<string, number | null>>(() =>
    this.can('view') ? this.snapshot()?.meta.metrics || {} : {},
  );
  readonly store = {
    company: computed(() => (this.can('view') ? this.snapshot()?.context.company || null : null)),
    companyId: this.records.companyId,
    staff: computed(() => (this.can('view') ? this.snapshot()?.context.staff || [] : [])),
    data: computed(() => ({
      reviews: this.can('view') ? this.snapshot()?.context.reviews || [] : [],
      members: this.members(),
    })),
  };
  constructor() {
    effect(() => {
      const scope = this.scope();
      untracked(() => {
        if (scope === this.appliedScope) return;
        this.appliedScope = scope;
        const view = this.view();
        this.generation++;
        this.clear();
        this.denied.set(false);
        this.created.clear();
        this.intents.clear();
        if (view !== null) void this.load(view, scope);
      });
    });
    const timer = setInterval(() => {
      const zone = this.snapshot()?.meta.timezone;
      if (zone) {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: zone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(new Date());
        this.today.set(
          ['year', 'month', 'day']
            .map((key) => parts.find((part) => part.type === key)!.value)
            .join('-'),
        );
      }
      if (this.view() !== null && this.can('view') && !this.loading() && !this.saving())
        void this.load(this.view()!);
    }, 30000);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
      clearInterval(timer);
      this.clear();
    });
  }
  private clear() {
    this.raw.set(null);
    this.error.set('');
    this.unavailable.set([]);
  }
  canSource(source: string, action = 'read') {
    return !this.denied() && this.access.can('quality', source, action);
  }
  can(action: string) {
    if (!this.active()) return false;
    const frame = this.supervisor
      ? this.canSource('supervision')
      : this.canSource(
          this.view() === 'Corrective actions'
            ? 'actions'
            : this.view() === 'Reports'
              ? 'reports'
              : 'assessments',
        );
    if (!frame) return false;
    if (action === 'view') return true;
    if (action === 'export' && !this.canSource('reports', 'export')) return false;
    const source =
      this.view() === 'Corrective actions'
        ? 'actions'
        : this.view() === 'Reports'
          ? 'reports'
          : 'assessments';
    return (
      this.canSource(source, action) &&
      (action !== 'export' || !this.supervisor || this.canSource('supervision', 'export'))
    );
  }
  canTab(view: string) {
    return (
      this.can('view') &&
      (view === 'Overview' ||
        view === 'Review schedule' ||
        this.canSource(
          view === 'Corrective actions'
            ? 'actions'
            : view === 'Reports'
              ? 'reports'
              : 'assessments',
        ))
    );
  }
  canCreateAssessment() {
    return (
      this.can('view') && this.canSource('assessments') && this.canSource('assessments', 'create')
    );
  }
  canAction(action: string) {
    return this.can('view') && this.canSource('actions', action);
  }
  connect(view = 'Overview') {
    this.active.set(true);
    this.denied.set(false);
    if (this.view() !== view) {
      this.view.set(view);
      void this.load(view);
    }
  }
  setView(view: string) {
    this.active.set(true);
    if (this.view() !== view) {
      this.view.set(view);
      void this.load(view);
    }
  }
  disconnect() {
    this.session++;
    this.generation++;
    this.active.set(false);
    this.view.set(null);
    this.loading.set(false);
    this.saving.set(false);
    this.clear();
    this.created.clear();
    this.intents.clear();
  }
  private root() {
    return `/companies/${this.records.companyId()}`;
  }
  private current(scope: string) {
    return !this.destroyed && scope === this.scope() && this.can('view');
  }
  private check<T extends { company_id: string }>(value: T, scope: string): T {
    if (!this.current(scope) || value.company_id !== this.records.companyId())
      throw Error('The quality workspace changed. Reopen the record.');
    return value;
  }
  private async request<T>(
    path: string,
    body?: unknown,
    method?: 'POST' | 'PATCH',
    headers?: Record<string, string>,
    type: 'json' | 'blob' = 'json',
  ): Promise<T> {
    const scope = this.scope(),
      session = this.session;
    try {
      const result = await this.auth.api<T>(path, body, method, headers, type);
      if (session !== this.session)
        throw Error('The quality view was closed. Reopen it to see the recorded result.');
      return result;
    } catch (error) {
      if (
        scope === this.scope() &&
        session === this.session &&
        [401, 403].includes((error as any)?.status)
      ) {
        this.clear();
        this.denied.set(true);
      }
      throw error;
    }
  }
  async load(view = this.view() || 'Overview', scope = this.scope()): Promise<boolean> {
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    try {
      if (!this.can('view'))
        throw Error('Supervisor and quality records are unavailable without the required access.');
      const root = this.root() + (this.supervisor ? '/supervisor' : '/quality/workspace');
      let page = this.check(
        await this.request<QualityWorkspaceRead>(
          root + '?' + new URLSearchParams({ view, page_size: '100' }),
        ),
        scope,
      );
      const first = page,
        rows = [...page.results],
        seen = new Set<string>();
      if (!first.context || page.count > 2000)
        throw Error('The quality workspace is incomplete or exceeds its supported window.');
      while (page.next) {
        if (generation !== this.generation) return false;
        if (!page.next.startsWith(root + '?') || seen.has(page.next) || rows.length >= first.count)
          throw Error('Quality pagination is incomplete. Reload.');
        seen.add(page.next);
        page = this.check(await this.request<QualityWorkspaceRead>(page.next), scope);
        if (page.meta['revision'] !== first.meta['revision'] || page.count !== first.count)
          throw Error('Quality records changed. Reload.');
        rows.push(...page.results);
      }
      if (rows.length !== first.count || new Set(rows.map((r) => r['id'])).size !== first.count)
        throw Error('Quality pagination is incomplete. Reload.');
      if (generation !== this.generation || !this.current(scope)) return false;
      this.raw.set({ ...first, results: rows, _scope: scope });
      this.today.set(String(first.meta['local_date']));
      this.unavailable.set((first.context['unavailable'] || []) as string[]);
      return true;
    } catch (error) {
      if (generation === this.generation && scope === this.scope() && !this.destroyed) {
        this.clear();
        this.error.set(
          error instanceof Error ? error.message : 'Quality records could not be loaded.',
        );
      }
      return false;
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async openAssessment(id: string | null, type: string | null) {
    this.active.set(true);
    this.denied.set(false);
    this.view.set('Assessments');
    if (!(await this.load('Assessments'))) return false;
    if (id) {
      const scope = this.scope();
      try {
        const response = this.check(
          await this.request<QualityDetailRead>(this.root() + `/quality/assessments/${id}`),
          scope,
        );
        this.raw.update((v) =>
          v
            ? { ...v, results: [...v.results.filter((a: any) => a.id !== id), response.record] }
            : v,
        );
        return true;
      } catch (error) {
        this.error.set((error as Error).message);
        return false;
      }
    }
    return !!this.templates().find((t) => t.id === type);
  }
  newAssessment(templateId: string): Assessment {
    const own = this.auth.currentUser();
    return {
      id: crypto.randomUUID(),
      templateId,
      subjectId: '',
      subjectName: '',
      assessorId:
        this.assessors().find((a) => a.id === own?.id)?.id || this.assessors()[0]?.id || '',
      assessorName: '',
      date: this.today(),
      reviewDate: '',
      context: '',
      answers: {},
      outcome: '',
      recommendations: '',
      evidence: [],
      status: 'Draft',
      revision: 0,
      audit: [],
    };
  }
  subjects(templateId: string): { id: string; name: string }[] {
    const kind = this.templates().find((t) => t.id === templateId)?.subject;
    return !kind || !this.can('view')
      ? []
      : kind === 'client'
        ? this.snapshot()?.context.clients || []
        : kind === 'staff'
          ? this.snapshot()?.context.staff || []
          : this.store.company()
            ? [this.store.company()!]
            : [];
  }
  savedId(id: string) {
    return this.created.get(id)?.id || id;
  }
  private async send(
    path: string,
    body: unknown,
    etag?: string,
    method: 'POST' | 'PATCH' = 'POST',
  ): Promise<QualityMutationRead> {
    const scope = this.scope(),
      key = scope + path + JSON.stringify(body);
    if (!this.intents.has(key)) this.intents.set(key, crypto.randomUUID());
    const result = this.check(
      await this.request<QualityMutationRead>(path, body, method, {
        'Idempotency-Key': this.intents.get(key)!,
        ...(etag ? { 'If-Match': etag } : {}),
      }),
      scope,
    );
    this.intents.delete(key);
    return result;
  }
  private body(input: Assessment, mode: string, evidence: { id: string; caption: string }[]) {
    return {
      templateId: input.templateId,
      subjectId: input.subjectId || null,
      assessorId: input.assessorId || null,
      date: input.date,
      reviewDate: input.reviewDate || null,
      context: input.context,
      answers: input.answers,
      outcome: input.outcome,
      recommendations: input.recommendations,
      evidence,
      mode,
    };
  }
  async saveAssessment(
    input: Assessment,
    mode: 'draft' | 'schedule' | 'submit',
  ): Promise<string | null> {
    if (this.saving()) return 'A quality record is already being saved.';
    const scope = this.scope(),
      session = this.session;
    this.saving.set(true);
    this.generation++;
    this.loading.set(false);
    try {
      const root = this.root() + '/quality/assessments';
      let saved = this.created.get(input.id),
        id = saved?.id || input.id,
        version = input.revision || saved?.version || 0;
      const attachments = input.evidence.some((e) => e.content.startsWith('data:'));
      if (!version) {
        const result = await this.send(root, this.body(input, attachments ? 'draft' : mode, []));
        id = result.id;
        version = result.version;
        this.created.set(input.id, { id, version });
        if (!attachments && !input.evidence.length) {
          const loaded = await this.load(this.view() || 'Assessments', scope);
          if (!this.current(scope)) throw Error('The workspace changed while saving.');
          return loaded
            ? null
            : this.error() ||
                'The assessment was saved, but its latest version could not be loaded. Reopen it.';
        }
      }
      const links = [];
      for (const file of input.evidence) {
        const uploaded = file.content.startsWith('data:')
          ? await this.upload(id, file)
          : { id: file.id };
        links.push({ id: uploaded.id, caption: file.caption });
      }
      await this.send(root + '/' + id, this.body(input, mode, links), `"v${version}"`, 'PATCH');
      if (!this.current(scope)) throw Error('The workspace changed while saving.');
      const loaded = await this.load(this.view() || 'Assessments', scope);
      if (!this.current(scope)) throw Error('The workspace changed while saving.');
      return loaded
        ? null
        : this.error() ||
            'The assessment was saved, but its latest version could not be loaded. Reopen it.';
    } catch (error) {
      return (error as Error).message;
    } finally {
      if (session === this.session) this.saving.set(false);
    }
  }
  async saveAction(input: CorrectiveAction): Promise<string | null> {
    return this.command(
      '/quality/actions' + (input.revision ? '/' + input.id : ''),
      {
        assessmentId: input.assessmentId || null,
        title: input.title,
        ownerId: input.ownerId,
        due: input.due,
        priority: input.priority,
        status: input.status,
        resolution: input.resolution,
      },
      input.revision ? `"v${input.revision}"` : undefined,
      input.revision ? 'PATCH' : 'POST',
    );
  }
  private async command(
    path: string,
    body: unknown,
    etag?: string,
    method: 'POST' | 'PATCH' = 'POST',
  ) {
    if (this.saving()) return 'A quality record is already being saved.';
    this.saving.set(true);
    this.generation++;
    this.loading.set(false);
    const scope = this.scope(),
      session = this.session;
    try {
      await this.send(this.root() + path, body, etag, method);
      if (!this.current(scope)) throw Error('The workspace changed while saving.');
      const loaded = await this.load(this.view() || 'Overview', scope);
      if (!this.current(scope)) throw Error('The workspace changed while saving.');
      return loaded
        ? null
        : this.error() ||
            'The quality record was saved, but its latest version could not be loaded. Reopen it.';
    } catch (error) {
      return (error as Error).message;
    } finally {
      if (session === this.session) this.saving.set(false);
    }
  }
  signOff(id: string, revision: number, name: string, declaration: boolean) {
    return this.command(
      `/quality/assessments/${id}/sign-off`,
      { name, declaration },
      `"v${revision}"`,
    );
  }
  reopen(id: string, revision: number, reason: string) {
    return this.command(`/quality/assessments/${id}/reopen`, { reason }, `"v${revision}"`);
  }
  private async upload(id: string, file: QualityEvidence): Promise<QualityFileRead> {
    const scope = this.scope(),
      match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(file.content);
    if (!match) throw Error('Choose a valid assessment attachment.');
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    if (bytes.length !== file.size || bytes.length > 500000)
      throw Error('The attachment exceeds its size limit or has changed.');
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
    const path = this.root() + `/quality/assessments/${id}/files`,
      key = scope + path + digest + file.name;
    if (!this.intents.has(key)) this.intents.set(key, crypto.randomUUID());
    const form = new FormData();
    form.append('file', new File([bytes], file.name, { type: file.type }));
    let row = this.check(
      await this.request<QualityFileRead>(path, form, 'POST', {
        'Idempotency-Key': this.intents.get(key)!,
      }),
      scope,
    );
    for (let n = 0; row.state === 'quarantined' && n < 60; n++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (!this.current(scope)) throw Error('The workspace changed during the scan.');
      row = this.check(
        await this.request<QualityFileRead>(this.root() + `/quality/files/${row.id}`),
        scope,
      );
    }
    if (row.assessmentId !== id || row.state !== 'clean')
      throw Error(
        row.state === 'quarantined'
          ? 'The attachment is still being scanned. Retry the same save once scanning finishes.'
          : 'The attachment did not pass its security scan.',
      );
    return row;
  }
  private saveBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async exportReport() {
    if (!this.can('export')) throw Error('Quality export access is required.');
    const scope = this.scope(),
      blob = await this.request<Blob>(
        this.root() +
          (this.supervisor ? '/supervisor/export' : '/quality/export') +
          '?' +
          new URLSearchParams({ view: this.view() || 'Overview' }),
        undefined,
        undefined,
        undefined,
        'blob',
      );
    if (!this.current(scope)) throw Error('The workspace changed during export.');
    this.saveBlob(blob, 'quality-report.json');
  }
  canExportAssessment(record: Assessment) {
    const subject =
      (record as any).template?.subject ||
      this.templates().find((t) => t.id === record.templateId)?.subject;
    return (
      this.canSource('assessments', 'export') &&
      (subject === 'service' ||
        (subject === 'client' && this.access.can('care', 'records', 'export')) ||
        (subject === 'staff' && this.access.can('people', 'records', 'export')))
    );
  }
  async exportAssessment(id: string) {
    const row = this.data().assessments.find((r) => r.id === id);
    if (!row || !this.canExportAssessment(row))
      throw Error('Assessment and subject-record export access are required.');
    const scope = this.scope(),
      blob = await this.request<Blob>(
        this.root() + `/quality/assessments/${id}/export`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
    if (!this.current(scope)) throw Error('The workspace changed during export.');
    this.saveBlob(blob, 'assessment.json');
  }
  async downloadEvidence(file: QualityEvidence) {
    const row = this.data().assessments.find((r) => r.evidence.some((e) => e.id === file.id));
    if (!row || !this.canExportAssessment(row))
      throw Error('Assessment and subject-record export access are required.');
    const scope = this.scope(),
      blob = await this.request<Blob>(
        this.root() + `/quality/files/${file.id}/content`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
    if (!this.current(scope)) throw Error('The workspace changed during download.');
    this.saveBlob(blob, file.name);
  }
}
