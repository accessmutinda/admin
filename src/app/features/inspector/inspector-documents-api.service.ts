import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { Company } from '../management/shared/management.store';
import { InspectorDocumentPage } from './inspector-provider.generated';
import { InspectorDocument, emptyInspection } from './inspector.models';
import { download } from './inspector-download';

@Injectable({ providedIn: 'root' })
export class InspectorDocumentsApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly snapshot = signal<InspectorDocumentPage | null>(null);
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
  readonly canDownload = computed(() => !!this.value()?.capabilities['download']);
  readonly records = computed(() => this.value()?.results ?? []);
  readonly state = computed(() => {
    const state = emptyInspection(),
      details = this.value()?.inspection;
    state.draft.type = details?.type ?? '';
    state.draft.start = details?.start ?? '';
    state.draft.end = details?.end ?? '';
    state.draft.revision = details?.version ?? 0;
    return state;
  });
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
  readonly canUpload = computed(() => !!this.value()?.capabilities['upload']);
  readonly saving = signal(false);
  readonly documents = computed<InspectorDocument[]>(() =>
    this.records().map((row) => ({
      ...row,
      questions: row.questions as InspectorDocument['questions'],
      expiry: row.expiry ?? '',
      content: '',
    })),
  );
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
  private root() {
    return `/companies/${this.companyId()}/inspector/documents`;
  }
  private current(scope: string, generation: number) {
    return this.active && scope === this.scope() && generation === this.generation;
  }
  private clear() {
    this.saving.set(false);
    this.generation++;
    this.lifecycle++;
    this.snapshot.set(null);
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
      if (document.visibilityState !== 'hidden') void this.load();
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
        const first = await this.auth.api<InspectorDocumentPage>(
          this.root() + '?page=1&page_size=100',
        );
        if (!this.current(scope, generation)) return;
        this.validate(first);
        if (first.count > 2000)
          throw Error(
            'The evidence register exceeds the supported review size. Ask the provider administrator for assistance.',
          );
        const results = [...first.results];
        for (let page = 2; results.length < first.count; page++) {
          const next = await this.auth.api<InspectorDocumentPage>(
            this.root() + `?page=${page}&page_size=100`,
          );
          if (!this.current(scope, generation)) return;
          this.validate(next);
          if (
            next.count !== first.count ||
            next.meta.revision !== first.meta.revision ||
            !next.results.length
          )
            throw Error('Evidence records changed while loading. Please retry.');
          results.push(...next.results);
        }
        if (
          results.length !== first.count ||
          new Set(results.map((r) => r.id)).size !== first.count
        )
          throw Error('Evidence records changed while loading. Please retry.');
        this.snapshot.set({ ...first, results });
        this.verified.set(scope);
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
        this.clear();
        this.error.set(
          error instanceof Error
            ? error.message
            : 'Evidence records are unavailable. Please retry.',
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
  private validate(page: InspectorDocumentPage) {
    if (!/^[a-f0-9]{64}$/.test(page.meta.revision))
      throw Error('The evidence response is incomplete. Please retry.');
    if (page.company.id !== this.companyId() || page.meta.company_id !== this.companyId())
      throw Error('The evidence response does not match this workspace.');
  }
  async export(_filters: Record<string, string>): Promise<void> {
    throw Error('Select documents to download an evidence pack.');
  }
  async upload(
    file: File,
    metadata: import('./inspector-provider.generated').InspectorDocumentMetadata,
    key: string,
  ): Promise<boolean> {
    if (!this.canUpload()) throw Error('Uploading inspection evidence is not permitted.');
    const scope = this.scope(),
      lifecycle = this.lifecycle;
    const form = new FormData();
    form.append('file', file);
    form.append('metadata', JSON.stringify(metadata));
    this.saving.set(true);
    try {
      await this.auth.api(this.root(), form, 'POST', { 'Idempotency-Key': key });
      if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return false;
      if (this.pending) await this.pending;
      await this.load();
      return this.active && scope === this.scope() && lifecycle === this.lifecycle;
    } catch (error) {
      this.failure(error, scope, lifecycle);
      return false;
    } finally {
      if (scope === this.scope() && lifecycle === this.lifecycle) this.saving.set(false);
    }
  }
  async download(id: string): Promise<void> {
    const row = this.records().find((r) => r.id === id);
    if (!row?.downloadable || !this.canDownload())
      throw Error('This evidence has no currently authorised clean file.');
    await this.binary(
      '/' + encodeURIComponent(id) + '/content?source_version=' + row.source_version,
      row.filename,
      row.content_type,
      [{ id: row.id, source_version: row.source_version }],
    );
  }
  async pack(
    ids: string[],
    selectedVersions?: Readonly<Record<string, number | undefined>>,
  ): Promise<void> {
    if (!this.canDownload()) throw Error('Downloading evidence packs is not permitted.');
    if (!ids.length || ids.length > 50 || new Set(ids).size !== ids.length)
      throw Error('Select between 1 and 50 documents.');
    const rows = ids.map((id) => this.records().find((r) => r.id === id));
    if (rows.some((r) => !r?.downloadable))
      throw Error(
        'Some selected evidence is no longer downloadable. Reselect the available files.',
      );
    if (selectedVersions && rows.some((r) => selectedVersions[r!.id] !== r!.source_version))
      throw Error('Selected evidence changed. Review and reselect the current versions.');
    const references = rows.map((r) => ({ id: r!.id, source_version: r!.source_version }));
    await this.binary('/pack', 'inspection-evidence.zip', 'application/zip', references, {
      documents: rows.map((r) => ({
        id: r!.id,
        source_version: selectedVersions ? selectedVersions[r!.id] : r!.source_version,
      })),
    });
  }
  private async binary(
    path: string,
    filename: string,
    mime: string,
    sources: ReadonlyArray<{ id: string; source_version: number }>,
    body?: unknown,
  ) {
    const scope = this.scope(),
      lifecycle = this.lifecycle;
    try {
      const blob = await this.auth.api<Blob>(
        this.root() + path,
        body,
        body ? 'POST' : undefined,
        undefined,
        'blob',
      );
      if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return;
      if (!this.canDownload()) throw Error('Evidence download access changed. Reload and retry.');
      if (
        sources.some(
          (source) =>
            !this.records().some(
              (row) =>
                row.downloadable &&
                row.id === source.id &&
                row.source_version === source.source_version,
            ),
        )
      )
        throw Error('Selected evidence changed. Review and reselect current files.');
      download(blob, filename, mime);
    } catch (error) {
      this.failure(error, scope, lifecycle);
    }
  }
  private failure(error: unknown, scope: string, lifecycle: number) {
    if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return;
    if ([401, 403, 404].includes((error as { status?: number }).status ?? 0)) {
      this.clear();
      this.error.set(error instanceof Error ? error.message : 'Evidence access is unavailable.');
    }
    throw error;
  }
}
