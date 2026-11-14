import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { Company } from '../management/shared/management.store';
import { InspectorReportRead, InspectorReportFindingRead } from './inspector-provider.generated';
import { emptyInspection, InspectionDraft, InspectorFinding } from './inspector.models';
import { download } from './inspector-download';

@Injectable({ providedIn: 'root' })
export class InspectorReportsApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly snapshot = signal<InspectorReportRead | null>(null);
  private readonly verified = signal('');
  private readonly logo = signal('');
  private logoUrl = '';
  private active = false;
  private generation = 0;
  private lifecycle = 0;
  private pending?: Promise<void>;
  private timer?: ReturnType<typeof setInterval>;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly retainEdits = signal(false);
  readonly companyId = computed(() => this.access.companyId() || '');
  readonly scope = computed(() => {
    const context = this.access.context();
    return JSON.stringify({
      company: this.companyId(),
      actor: this.auth.profile()?.id,
      authenticated: this.auth.isAuthenticated(),
      context: context
        ? {
            active: context.company_active,
            platform: context.platform,
            revision: context.revision,
            permissions: [...(context.permissions ?? [])].sort(),
            core: [...(context.core_permissions ?? [])].sort(),
            modules: [...(context.enabled_modules ?? [])].sort(),
            roles: (context.roles ?? []).map((r) => r.id).sort(),
          }
        : null,
    });
  });
  readonly value = computed(() => (this.verified() === this.scope() ? this.snapshot() : null));
  readonly ready = computed(() => !!this.value());
  readonly canViewProvider = computed(() => !!this.value()?.capabilities['view_provider']);
  readonly canDownload = computed(() => !!this.value()?.capabilities['export']);
  readonly saving = signal(false);
  private writeKey?: { signature: string; key: string };
  readonly canCreate = computed(() => !!this.value()?.capabilities['create']);
  readonly canEdit = computed(() => !!this.value()?.capabilities['edit']);
  readonly records = computed(() => []);
  readonly state = computed(() => this.toState(this.value()));
  toState(value: InspectorReportRead | null) {
    const state = emptyInspection(),
      details = value?.inspection,
      draft = value?.draft;
    state.draft = {
      revision: draft?.version ?? 0,
      type: details?.type ?? '',
      start: details?.start ?? '',
      end: details?.end ?? '',
      ratings: draft?.ratings ?? {},
      notes: draft?.notes ?? {},
      summary: draft?.summary ?? '',
      findings: draft?.findings ?? [],
      updated: draft?.updated ?? '',
      by: draft?.by ?? '',
    };
    return state;
  }
  readonly documents = computed(() => this.toDocuments(this.value()));
  toDocuments(value: InspectorReportRead | null) {
    return (value?.evidence ?? []).map((row) => ({
      ...row,
      expiry: row.expiry ?? '',
      questions: row.questions as import('./inspector.models').Question[],
      content: '',
    }));
  }
  readonly company = computed<Company | undefined>(() => {
    const c = this.value()?.company;
    return c
      ? {
          id: c.id,
          name: c.name,
          code: c.code,
          active: c.active,
          sector: c.sector ?? '',
          registeredPlaces: c.registered_places,
          modifiedAt: c.updated_at,
          registration: '',
          tradingName: '',
          size: '',
          country: '',
          region: '',
          logo: this.logo(),
          postcode: c.postcode ?? '',
          headOfficeAddress: c.head_office_address ?? '',
          color: '',
          accent: '',
          tagline: '',
          modules: [],
        }
      : undefined;
  });
  constructor() {
    let prior = this.scope();
    effect(() => {
      const scope = this.scope();
      if (scope !== prior) {
        prior = scope;
        untracked(() => {
          this.clear();
          if (this.active) void this.load();
        });
      }
    });
  }
  protected root() {
    return `/companies/${this.companyId()}/inspector/reports`;
  }
  protected draftRoot() {
    return this.root();
  }
  private current(scope: string, generation: number) {
    return this.active && scope === this.scope() && generation === this.generation;
  }
  private clear(retainEdits = false) {
    this.retainEdits.set(retainEdits);
    this.generation++;
    this.lifecycle++;
    this.snapshot.set(null);
    this.saving.set(false);
    this.writeKey = undefined;
    this.verified.set('');
    this.pending = undefined;
    this.loading.set(false);
    this.error.set('');
    if (this.logoUrl) URL.revokeObjectURL(this.logoUrl);
    this.logoUrl = '';
    this.logo.set('');
  }
  start() {
    this.active = true;
    void this.load();
    this.timer ??= setInterval(() => {
      if (!this.saving() && document.visibilityState !== 'hidden') void this.load();
    }, 15000);
  }
  stop() {
    this.active = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.clear();
  }
  load(): Promise<void> {
    if (!this.active) return Promise.resolve();
    if (this.pending) return this.pending;
    const scope = this.scope(),
      generation = ++this.generation;
    this.loading.set(true);
    const task = (async () => {
      try {
        const first = await this.auth.api<InspectorReportRead>(this.draftRoot());
        if (!this.current(scope, generation)) return;
        this.validate(first);
        this.snapshot.set(first);
        this.verified.set(scope);
        this.retainEdits.set(false);
        this.error.set('');
        if (first.company.logo_available) {
          const blob = await this.auth.api<Blob>(
            this.root() + '/logo',
            undefined,
            undefined,
            undefined,
            'blob',
          );
          if (!this.current(scope, generation)) return;
          if (this.logoUrl) URL.revokeObjectURL(this.logoUrl);
          this.logoUrl = URL.createObjectURL(blob);
          this.logo.set(this.logoUrl);
        } else {
          if (this.logoUrl) URL.revokeObjectURL(this.logoUrl);
          this.logoUrl = '';
          this.logo.set('');
        }
      } catch (error) {
        if (!this.current(scope, generation)) return;
        const denied = [401, 403, 404].includes((error as { status?: number }).status ?? 0);
        this.clear(!denied && (this.ready() || this.retainEdits()));
        this.error.set(
          error instanceof Error
            ? error.message
            : 'Inspection reports are unavailable. Please retry.',
        );
      } finally {
        if (this.current(scope, generation)) this.loading.set(false);
      }
    })();
    this.pending = task;
    void task.finally(() => {
      if (this.pending === task) this.pending = undefined;
    });
    return task;
  }
  protected async refreshDraft(): Promise<InspectorReportRead | null> {
    if (this.saving() || !this.active || !this.ready()) return null;
    const scope = this.scope(),
      lifecycle = this.lifecycle;
    this.saving.set(true);
    try {
      await this.load();
      return this.active && scope === this.scope() && lifecycle === this.lifecycle
        ? this.value()
        : null;
    } finally {
      if (scope === this.scope() && lifecycle === this.lifecycle) this.saving.set(false);
    }
  }
  private validate(value: InspectorReportRead) {
    if (value.company.id !== this.companyId() || value.meta.company_id !== this.companyId())
      throw Error('The report response does not match this workspace.');
    if (!/^[a-f0-9]{64}$/.test(value.meta.revision))
      throw Error('The report response is incomplete. Please retry.');
  }
  async saveDraft(draft: InspectionDraft, companyId: string): Promise<InspectorReportRead | null> {
    if (companyId !== this.companyId()) throw Error('The workspace changed. Reopen the report.');
    if (!this.canEdit()) throw Error('Saving inspection reports is not permitted.');
    return this.write<InspectorReportRead>(
      '',
      'PATCH',
      { ratings: draft.ratings, notes: draft.notes, summary: draft.summary },
      '\"v' + draft.revision + '\"',
    );
  }
  async saveFinding(finding: InspectorFinding): Promise<InspectorReportFindingRead | null> {
    if (!(finding.id ? this.canEdit() : this.canCreate()))
      throw Error('Recording inspection findings is not permitted.');
    const body = {
      question: finding.question,
      type: finding.type,
      text: finding.text.trim(),
      owner: finding.owner.trim(),
      due: finding.due || null,
      status: finding.status,
      evidenceIds: finding.evidenceIds,
      evidenceVersions: finding.evidenceVersions ?? {},
    };
    return this.write<InspectorReportFindingRead>(
      '/findings' + (finding.id ? '/' + finding.id + '/revise' : ''),
      'POST',
      body,
      finding.id ? '\"v' + finding.version + '\"' : undefined,
    );
  }
  protected async write<T>(
    suffix: string,
    method: 'POST' | 'PATCH',
    body: unknown,
    etag?: string,
  ): Promise<T | null> {
    if (this.saving() || !this.active || !this.ready()) return null;
    const scope = this.scope(),
      lifecycle = this.lifecycle;
    const signature = JSON.stringify({ scope, suffix, body, etag });
    if (this.writeKey?.signature !== signature)
      this.writeKey = { signature, key: crypto.randomUUID() };
    this.saving.set(true);
    this.generation++;
    this.pending = undefined;
    this.loading.set(false);
    try {
      const result = await this.auth.api<T>(
        suffix ? this.root() + suffix : this.draftRoot(),
        body,
        method,
        {
          ...(etag ? { 'If-Match': etag } : {}),
          'Idempotency-Key': this.writeKey.key,
        },
      );
      if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return null;
      this.writeKey = undefined;
      this.generation++;
      this.pending = undefined;
      await this.load();
      return this.active && scope === this.scope() && (this.ready() || this.retainEdits())
        ? result
        : null;
    } catch (error) {
      this.failure(error, scope, lifecycle);
      return null;
    } finally {
      if (scope === this.scope() && lifecycle === this.lifecycle) this.saving.set(false);
    }
  }
  async prepareExport(): Promise<InspectorReportRead | null> {
    if (!this.canDownload()) throw Error('Exporting inspection reports is not permitted.');
    const scope = this.scope(),
      lifecycle = this.lifecycle;
    try {
      const value = await this.auth.api<InspectorReportRead>(this.root() + '/export');
      if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return null;
      this.validate(value);
      if (!this.canDownload()) throw Error('Exporting inspection reports is no longer permitted.');
      return value;
    } catch (error) {
      this.failure(error, scope, lifecycle);
      return null;
    }
  }
  async export(_filters: Record<string, string> = {}): Promise<void> {
    const value = await this.prepareExport();
    if (value)
      download(JSON.stringify(value, null, 2), 'inspection-report.json', 'application/json');
  }
  private failure(error: unknown, scope: string, lifecycle: number) {
    if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return;
    if ([401, 403, 404].includes((error as { status?: number }).status ?? 0)) {
      this.clear();
      this.error.set(error instanceof Error ? error.message : 'Report access is unavailable.');
    }
    throw error;
  }
}
