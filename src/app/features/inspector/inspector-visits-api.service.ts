import { londonDate } from '../management/rota/rota.models';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { Company } from '../management/shared/management.store';
import { InspectorVisitPage } from './inspector-provider.generated';
import { emptyInspection } from './inspector.models';
import { download } from './inspector-download';

@Injectable({ providedIn: 'root' })
export class InspectorVisitsApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly snapshot = signal<InspectorVisitPage | null>(null);
  private readonly verified = signal('');
  private readonly logo = signal('');
  private logoUrl = '';
  private active = false;
  private generation = 0;
  private lifecycle = 0;
  private pending?: Promise<void>;
  private timer?: ReturnType<typeof setInterval>;
  readonly month = signal(londonDate().slice(0, 7));
  readonly loading = signal(false);
  readonly error = signal('');
  readonly companyId = computed(() => this.access.companyId() || '');
  readonly scope = computed(() => {
    const context = this.access.context();
    return JSON.stringify({
      month: this.month(),
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
  readonly calendar = computed(
    () => this.value()?.calendar.map((day) => ({ ...day, inMonth: day.in_month })) ?? [],
  );
  readonly notes = computed(() => this.value()?.notes ?? []);
  selectMonth(value: string): boolean {
    if (!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value)) return false;
    this.month.set(value);
    return true;
  }
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
    return `/companies/${this.companyId()}/inspector/visits`;
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
        const first = await this.auth.api<InspectorVisitPage>(
          this.root() + '?page=1&page_size=100&month=' + this.month(),
        );
        if (!this.current(scope, generation)) return;
        this.validate(first);
        if (first.count > 2000)
          throw Error(
            'The visit register exceeds the supported review size. Ask the provider administrator for assistance.',
          );
        const results = [...first.results];
        for (let page = 2; results.length < first.count; page++) {
          const next = await this.auth.api<InspectorVisitPage>(
            this.root() + `?page=${page}&page_size=100&month=${this.month()}`,
          );
          if (!this.current(scope, generation)) return;
          this.validate(next);
          if (
            next.count !== first.count ||
            next.meta.revision !== first.meta.revision ||
            !next.results.length
          )
            throw Error('Visit records changed while loading. Please retry.');
          results.push(...next.results);
        }
        if (
          results.length !== first.count ||
          new Set(results.map((r) => r.id)).size !== first.count
        )
          throw Error('Visit records changed while loading. Please retry.');
        if (results.filter((row) => row.status === 'Completed').length !== first.summary.completed)
          throw Error('Visit records changed while loading. Please retry.');
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
          error instanceof Error ? error.message : 'Visit records are unavailable. Please retry.',
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
  private validate(page: InspectorVisitPage) {
    if (!/^[a-f0-9]{64}$/.test(page.meta.revision))
      throw Error('The visit response is incomplete. Please retry.');
    if (page.summary.published !== page.count)
      throw Error('The visit summary is incomplete. Please retry.');
    if (page.meta.month !== this.month())
      throw Error('The visit response does not match the selected month.');
    if (page.company.id !== this.companyId() || page.meta.company_id !== this.companyId())
      throw Error('The visit response does not match this workspace.');
  }
  async export(filters: Record<string, string>): Promise<void> {
    if (!this.canDownload()) throw Error('Exporting visit records is not permitted.');
    const scope = this.scope(),
      lifecycle = this.lifecycle;
    try {
      const query = new URLSearchParams({ ...filters, month: this.month() });
      const blob = await this.auth.api<Blob>(
        this.root() + '/export?' + query.toString(),
        undefined,
        undefined,
        undefined,
        'blob',
      );
      if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return;
      if (!this.canDownload()) throw Error('Exporting visit records is no longer permitted.');
      download(blob, 'visit-monitoring.csv', 'text/csv;charset=utf-8');
    } catch (error) {
      this.failure(error, scope, lifecycle);
    }
  }
  private failure(error: unknown, scope: string, lifecycle: number) {
    if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return;
    if ([401, 403, 404].includes((error as { status?: number }).status ?? 0)) {
      this.clear();
      this.error.set(error instanceof Error ? error.message : 'Visit access is unavailable.');
    }
    throw error;
  }
}
