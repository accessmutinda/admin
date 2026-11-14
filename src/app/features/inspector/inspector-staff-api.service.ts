import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { Company } from '../management/shared/management.store';
import { InspectorStaffPage } from './inspector-provider.generated';
import { InspectorDocument, emptyInspection, documentStatus } from './inspector.models';
import { companyDateKey } from '../../shared/pipes/company-date.pipe';
import { download } from './inspector-download';

@Injectable({ providedIn: 'root' })
export class InspectorStaffApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly snapshot = signal<InspectorStaffPage | null>(null);
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
  readonly canDownload = computed(() => !!this.value()?.capabilities['export']);
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
  readonly summary = computed(() => this.value()?.summary);
  readonly documents = computed<InspectorDocument[]>(() =>
    this.records().flatMap((row) =>
      row.documents.map((d) => ({
        id: `staff:${row.id}:${d.id}`,
        name: d.name,
        category: d.category === 'Training' ? 'Training Certificates' : d.category,
        questions: ['Effective'],
        owner: row.name,
        updated: row.updated_at,
        version: String(d.version),
        expiry: d.expiry ?? '',
        status: documentStatus(
          { status: d.status, expiry: d.expiry ?? '' },
          companyDateKey(this.value()!.meta.as_of, this.value()!.meta.timezone),
        ),
        content: '',
        source: 'Staff record',
      })),
    ),
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
    return `/companies/${this.companyId()}/inspector/staffing`;
  }
  private current(scope: string, generation: number) {
    return this.active && scope === this.scope() && generation === this.generation;
  }
  private clear() {
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
        const first = await this.auth.api<InspectorStaffPage>(
          this.root() + '?page=1&page_size=100',
        );
        if (!this.current(scope, generation)) return;
        this.validate(first);
        if (first.count > 1000)
          throw Error(
            'The staff directory exceeds the supported review size. Ask the provider administrator for assistance.',
          );
        const results = [...first.results];
        for (let page = 2; results.length < first.count; page++) {
          const next = await this.auth.api<InspectorStaffPage>(
            this.root() + `?page=${page}&page_size=100`,
          );
          if (!this.current(scope, generation)) return;
          this.validate(next);
          if (next.count !== first.count || next.meta.revision !== first.meta.revision || !next.results.length)
            throw Error('Staff records changed while loading. Please retry.');
          results.push(...next.results);
        }
        if (
          results.length !== first.count ||
          new Set(results.map((r) => r.id)).size !== first.count
        )
          throw Error('Staff records changed while loading. Please retry.');
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
          error instanceof Error ? error.message : 'Staff records are unavailable. Please retry.',
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
  private validate(page: InspectorStaffPage) {
    if (!/^[a-f0-9]{64}$/.test(page.meta.revision))
      throw Error('The register response is incomplete. Please retry.');
    if (page.summary.total_staff !== page.count)
      throw Error('The workforce summary is incomplete. Please retry.');
    if (page.company.id !== this.companyId() || page.meta.company_id !== this.companyId())
      throw Error('The staff response does not match this workspace.');
  }
  async export(filters: Record<string, string>): Promise<void> {
    if (!this.canDownload()) throw Error('Exporting staff records is not permitted.');
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
      if (!this.canDownload()) throw Error('Exporting staff records is no longer permitted.');
      download(blob, 'staffing.csv', 'text/csv;charset=utf-8');
    } catch (error) {
      this.failure(error, scope, lifecycle);
    }
  }
  private failure(error: unknown, scope: string, lifecycle: number) {
    if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return;
    if ([401, 403, 404].includes((error as { status?: number }).status ?? 0)) {
      this.clear();
      this.error.set(error instanceof Error ? error.message : 'Staff access is unavailable.');
    }
    throw error;
  }
}
