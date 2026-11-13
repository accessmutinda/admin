import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { Company } from '../management/shared/management.store';
import { InspectorIncidentPage } from './inspector-provider.generated';
import { emptyInspection } from './inspector.models';
import { download } from './inspector-download';

@Injectable({ providedIn: 'root' })
export class InspectorIncidentsApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly snapshot = signal<InspectorIncidentPage | null>(null);
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
  readonly saving = signal(false);
  private writeKey?: { signature: string; key: string };
  readonly canCreate = computed(() => !!this.value()?.capabilities['create']);
  readonly canEdit = computed(() => !!this.value()?.capabilities['edit']);
  readonly canViewProvider = computed(() => !!this.value()?.capabilities['view_provider']);
  readonly canDownload = computed(() => !!this.value()?.capabilities['export']);
  readonly records = computed(() => this.value()?.results ?? []);
  readonly state = computed(() => {
    const state = emptyInspection(),
      details = this.value()?.inspection;
    state.draft.type = details?.type ?? '';
    state.draft.start = details?.start ?? '';
    state.draft.end = details?.end ?? '';
    state.draft.revision = details?.version ?? 0;
    state.draft.findings = this.value()?.findings ?? [];
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
  readonly summary = computed(() => this.value()?.summary);
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
    return `/companies/${this.companyId()}/inspector/incidents`;
  }
  private current(scope: string, generation: number) {
    return this.active && scope === this.scope() && generation === this.generation;
  }
  private clear() {
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
        const first = await this.auth.api<InspectorIncidentPage>(
          this.root() + '?page=1&page_size=100',
        );
        if (!this.current(scope, generation)) return;
        this.validate(first);
        if (first.count > 20000)
          throw Error(
            'The incident register exceeds the supported review size. Ask the provider administrator for assistance.',
          );
        const results = [...first.results];
        for (let page = 2; results.length < first.count; page++) {
          const next = await this.auth.api<InspectorIncidentPage>(
            this.root() + `?page=${page}&page_size=100`,
          );
          if (!this.current(scope, generation)) return;
          this.validate(next);
          if (next.count !== first.count || !next.results.length)
            throw Error('Incident records changed while loading. Please retry.');
          results.push(...next.results);
        }
        if (
          results.length !== first.count ||
          new Set(results.map((r) => r.id)).size !== first.count
        )
          throw Error('Incident records changed while loading. Please retry.');
        if (results.length !== first.summary.recorded)
          throw Error('Incident records changed while loading. Please retry.');
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
            : 'Incident records are unavailable. Please retry.',
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
  private validate(page: InspectorIncidentPage) {
    if (page.count < 0 || page.count > 20000)
      throw Error('The incident register exceeds the supported review size.');
    if (page.company.id !== this.companyId() || page.meta.company_id !== this.companyId())
      throw Error('The incident response does not match this workspace.');
  }
  async export(filters: Record<string, string>): Promise<void> {
    if (!this.canDownload()) throw Error('Exporting incident records is not permitted.');
    const scope = this.scope(),
      lifecycle = this.lifecycle;
    try {
      const query = new URLSearchParams(filters);
      const blob = await this.auth.api<Blob>(
        this.root() + '/export?' + query.toString(),
        undefined,
        undefined,
        undefined,
        'blob',
      );
      if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return;
      if (!this.canDownload()) throw Error('Exporting incident records is no longer permitted.');
      download(blob, 'incidents-and-safeguarding.csv', 'text/csv;charset=utf-8');
    } catch (error) {
      this.failure(error, scope, lifecycle);
    }
  }
  async saveFinding(finding: import('./inspector.models').InspectorFinding): Promise<boolean> {
    const permitted = finding.id ? this.canEdit() : this.canCreate();
    if (!permitted || this.saving()) return false;
    const scope = this.scope(),
      lifecycle = this.lifecycle;
    const body = {
      question: finding.question,
      type: finding.type,
      text: finding.text,
      owner: finding.owner,
      due: finding.due || null,
      status: finding.status,
      evidenceIds: finding.evidenceIds,
      evidenceVersions: finding.evidenceVersions ?? {},
    };
    const signature = JSON.stringify({ id: finding.id, version: finding.version, body });
    if (this.writeKey?.signature !== signature)
      this.writeKey = { signature, key: crypto.randomUUID() };
    this.saving.set(true);
    try {
      await this.auth.api(
        this.root() + '/findings' + (finding.id ? '/' + finding.id + '/revise' : ''),
        body,
        'POST',
        {
          ...(finding.id ? { 'If-Match': '"v' + finding.version + '"' } : {}),
          'Idempotency-Key': this.writeKey.key,
        },
      );
      if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return false;
      this.writeKey = undefined;
      this.generation++;
      this.pending = undefined;
      await this.load();
      return this.ready();
    } catch (error) {
      if (
        (error as { status?: number }).status === 412 &&
        this.active &&
        scope === this.scope() &&
        lifecycle === this.lifecycle
      )
        await this.load();
      this.failure(error, scope, lifecycle);
      return false;
    } finally {
      if (scope === this.scope() && lifecycle === this.lifecycle) this.saving.set(false);
    }
  }
  private failure(error: unknown, scope: string, lifecycle: number) {
    if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return;
    if ([401, 403, 404].includes((error as { status?: number }).status ?? 0)) {
      this.clear();
      this.error.set(error instanceof Error ? error.message : 'Incident access is unavailable.');
    }
    throw error;
  }
}
