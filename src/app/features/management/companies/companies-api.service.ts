import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE, API_BASE_PATH } from '../../../core/auth/auth-api';
import {
  CompanyPage,
  CompanyDetail,
  CompanyLifecycle,
  CompanyOverviewStats,
  CompanySummary,
  CreateCompanyRequest,
  CreatedCompany,
  COMPANY_LIFECYCLE_LABELS,
} from './companies-api.models';
import type { CompanyProfileUpdate } from './company-profile.models';

@Injectable({ providedIn: 'root' })
export class CompaniesApiService {
  private readonly auth = inject(AuthService);
  private readonly snapshot = signal<{
    context: string;
    companies: CompanySummary[];
    count: number;
    overview: CompanyOverviewStats | null;
  } | null>(null);
  private readonly pending = signal<{ context: string; request: number } | null>(null);
  private readonly failure = signal<{ context: string; message: string } | null>(null);
  private request = 0;
  private inFlight: { context: string; promise: Promise<void> } | null = null;
  readonly scope = computed(() => this.context());
  private context(): string | null {
    const profile = this.auth.profile();
    if (!this.auth.isAuthenticated() || !profile) return null;
    return `${profile.id}:${this.auth.isSuperAdmin() ? 'platform' : (profile.company_id ?? 'unassigned')}`;
  }
  readonly companies = computed(() =>
    this.snapshot()?.context === this.context() ? this.snapshot()!.companies : [],
  );
  readonly count = computed(() =>
    this.snapshot()?.context === this.context() ? this.snapshot()!.count : 0,
  );
  readonly overview = computed(() =>
    this.snapshot()?.context === this.context() ? this.snapshot()!.overview : null,
  );
  readonly loaded = computed(() => !!this.context() && this.snapshot()?.context === this.context());
  readonly loading = computed(() => !!this.pending() && this.pending()?.context === this.context());
  readonly error = computed(() =>
    this.failure()?.context === this.context() ? this.failure()!.message : '',
  );
  private readonly detailSnapshot = signal<{
    context: string;
    records: Record<string, CompanyDetail>;
  } | null>(null);
  private readonly detailFailures = signal<{
    context: string;
    records: Record<string, string>;
  } | null>(null);
  private readonly detailPending = signal<{ context: string; id: string; request: number } | null>(
    null,
  );
  detailLoading(id: string): boolean {
    return this.detailPending()?.context === this.context() && this.detailPending()?.id === id;
  }
  private detailRequest = 0;
  readonly details = computed(() =>
    this.detailSnapshot()?.context === this.context() ? this.detailSnapshot()!.records : {},
  );
  detailError(id: string): string {
    return this.detailFailures()?.context === this.context()
      ? (this.detailFailures()!.records[id] ?? '')
      : '';
  }

  async loadDetail(id: string, retainExisting = false): Promise<void> {
    const context = this.context();
    const request = ++this.detailRequest;
    if (!context || !this.auth.canAccessCompany(id)) return;
    this.detailPending.set({ context, id, request });
    this.detailFailures.set({ context, records: {} });
    const records = { ...this.details() };
    if (!retainExisting) delete records[id];
    this.detailSnapshot.set({ context, records });
    try {
      const detail = await this.auth.api<CompanyDetail>(`/companies/${encodeURIComponent(id)}`);
      if (request !== this.detailRequest || context !== this.context()) return;
      if (
        !detail ||
        detail.id !== id ||
        typeof detail.name !== 'string' ||
        typeof detail.code !== 'string' ||
        !Number.isInteger(detail.version) ||
        detail.version < 1
      )
        throw new Error('The company profile could not be read. Please retry.');
      this.rememberDetail(context, detail);
    } catch (error) {
      if (request !== this.detailRequest || context !== this.context()) return;
      this.detailFailures.set({
        context,
        records: {
          [id]:
            error instanceof Error
              ? error.message
              : 'Unable to load company details. Please retry.',
        },
      });
    } finally {
      if (this.detailPending()?.request === request) this.detailPending.set(null);
    }
  }

  readonly canCreate = computed(() => this.auth.isSuperAdmin());

  ensureLoaded(): Promise<void> {
    const context = this.context();
    if (!context || this.snapshot()?.context === context) return Promise.resolve();
    if (this.inFlight?.context === context) return this.inFlight.promise;
    const promise = this.load();
    const flight = { context, promise };
    this.inFlight = flight;
    void promise.finally(() => {
      if (this.inFlight === flight) this.inFlight = null;
    });
    return promise;
  }

  async load(retainExisting = false): Promise<void> {
    const context = this.context();
    const request = ++this.request;
    this.failure.set(null);
    if (!retainExisting) this.snapshot.set(null);
    if (!context) {
      this.pending.set(null);
      return;
    }
    this.pending.set({ context, request });
    const platform = this.auth.isSuperAdmin();
    const assigned = this.auth.profile()?.company_id;
    const endpoint = platform ? '/platform/companies' : '/companies';
    const companies: CompanySummary[] = [];
    const visited = new Set<string>();
    let path: string | null = endpoint;
    let count = 0;
    let overview: CompanyOverviewStats | null = null;
    try {
      while (path) {
        if (visited.has(path))
          throw new Error('The company list could not be completed. Please retry.');
        visited.add(path);
        const page: CompanyPage = await this.auth.api(path);
        if (context !== this.context() || request !== this.request) return;
        if (!Array.isArray(page.results) || !Number.isInteger(page.count) || page.count < 0)
          throw new Error('The company list could not be read. Please retry.');
        for (const company of page.results) {
          if (
            !company ||
            typeof company.id !== 'string' ||
            !company.id ||
            typeof company.name !== 'string' ||
            typeof company.code !== 'string' ||
            !Object.hasOwn(COMPANY_LIFECYCLE_LABELS, company.lifecycle)
          )
            throw new Error('Company data could not be read. Please retry.');
          if (!platform && company.id !== assigned)
            throw new Error('The company list does not match your account assignment.');
          companies.push(company);
        }
        count = page.count;
        if (!overview) overview = this.readOverview(page.meta);
        path = page.next ? this.pagePath(page.next, endpoint) : null;
      }
      this.snapshot.set({ context, companies, count, overview });
    } catch (error) {
      if (context !== this.context() || request !== this.request) return;
      this.failure.set({
        context,
        message: error instanceof Error ? error.message : 'Unable to load companies. Please retry.',
      });
    } finally {
      if (this.pending()?.request === request) this.pending.set(null);
    }
  }

  async create(
    payload: CreateCompanyRequest,
    idempotencyKey: string,
    duplicateId?: string,
  ): Promise<CreatedCompany> {
    if (!this.auth.isSuperAdmin()) throw new Error('Only Super Admin can create companies.');
    if (!idempotencyKey) throw new Error('A company creation request key is required.');
    const result = await this.auth.api<CreatedCompany>(
      duplicateId
        ? `/companies/${encodeURIComponent(duplicateId)}/duplicate`
        : '/platform/companies',
      payload,
      undefined,
      {
        'Idempotency-Key': idempotencyKey,
      },
    );
    if (
      !result ||
      typeof result.id !== 'string' ||
      !result.id ||
      typeof result.code !== 'string' ||
      !result.code ||
      !['pending_setup', 'active'].includes(result.lifecycle) ||
      !result.initial_admin_invitation?.id ||
      typeof result.initial_admin_invitation.state !== 'string' ||
      typeof result.initial_admin_invitation.delivery_state !== 'string'
    )
      throw new Error(
        'The creation response could not be read. Retry this request to check its result.',
      );
    return result;
  }

  async exportDirectory(ids: string[]): Promise<Blob> {
    const context = this.context();
    if (!context || !ids.length) throw Error('Choose companies to export.');
    const query = new URLSearchParams({ format: 'csv', ids: ids.join(',') });
    const blob = await this.auth.api<Blob>(
      '/companies/export?' + query,
      undefined,
      undefined,
      { Accept: 'text/csv' },
      'blob',
    );
    if (context !== this.context())
      throw Error('The company context changed. Reopen the directory.');
    return blob;
  }
  async refreshCompany(id: string): Promise<void> {
    const context = this.context();
    if (!context || !this.auth.canAccessCompany(id)) return;
    const records = { ...this.details() };
    delete records[id];
    this.detailSnapshot.set({ context, records });
    await this.load(true);
  }

  async bulkLifecycle(
    ids: string[],
    lifecycle: CompanyLifecycle,
  ): Promise<{ id: string; ok: boolean; detail?: string }[]> {
    const context = this.context();
    if (!context || !this.auth.isSuperAdmin())
      throw Error('Only Super Admin can change company status.');
    const result = await this.auth.api<{ results: { id: string; ok: boolean; detail?: string }[] }>(
      '/platform/companies/lifecycle',
      { company_ids: ids, lifecycle, reason: 'Updated from the company directory.' },
      'POST',
      { 'Idempotency-Key': crypto.randomUUID() },
    );
    if (context !== this.context())
      throw Error('The company context changed. Reopen the directory.');
    if (
      !Array.isArray(result.results) ||
      result.results.length !== ids.length ||
      result.results.some((r) => !ids.includes(r.id) || typeof r.ok !== 'boolean')
    )
      throw Error('The company status response could not be read. Reload the directory.');
    const records = { ...this.details() };
    for (const row of result.results) if (row.ok) delete records[row.id];
    this.detailSnapshot.set({ context, records });
    await this.load(true);
    return result.results;
  }

  async updateDetail(id: string, changes: CompanyProfileUpdate): Promise<CompanyDetail> {
    const context = this.context();
    const current = this.details()[id];
    if (!context || !this.auth.canAccessCompany(id))
      throw new Error('Reload the company profile before saving.');
    if (!current?.etag) throw new Error('Reload the company profile before saving.');
    const detail = await this.auth.api<CompanyDetail>(
      `/companies/${encodeURIComponent(id)}`,
      changes,
      'PATCH',
      { 'If-Match': current.etag },
    );
    if (context !== this.context())
      throw new Error('The company context changed. Reload before saving again.');
    this.readDetail(id, detail);
    this.rememberDetail(context, detail);
    return detail;
  }

  async changeLifecycle(id: string, lifecycle: CompanyLifecycle): Promise<void> {
    const context = this.context();
    if (!context || !this.auth.canAccessCompany(id))
      throw new Error('Reload the company profile before saving.');
    const result = await this.auth.api<{ ok?: boolean; detail?: string }>(
      `/companies/${encodeURIComponent(id)}/lifecycle`,
      { lifecycle, reason: 'Updated from the company profile.' },
      'POST',
    );
    if (context !== this.context())
      throw new Error('The company context changed. Reload before saving again.');
    if (!result?.ok) throw new Error(result?.detail || 'The company status could not be changed.');
  }

  private readDetail(id: string, detail: CompanyDetail): void {
    if (
      !detail ||
      detail.id !== id ||
      typeof detail.name !== 'string' ||
      typeof detail.code !== 'string' ||
      !Number.isInteger(detail.version) ||
      detail.version < 1 ||
      typeof detail.etag !== 'string'
    )
      throw new Error('The company profile could not be read. Please retry.');
  }

  private rememberDetail(context: string, detail: CompanyDetail): void {
    this.detailSnapshot.set({
      context,
      records: { ...this.details(), [detail.id]: detail },
    });
    const snapshot = this.snapshot();
    if (snapshot?.context !== context) return;
    this.snapshot.set({
      ...snapshot,
      companies: snapshot.companies.map((company) =>
        company.id === detail.id
          ? {
              ...company,
              name: detail.name,
              code: detail.code,
              lifecycle: detail.lifecycle,
              service_type: detail.service_type,
              updated_at: detail.updated_at,
              profile_completion_percent: detail.profile_completion_percent,
            }
          : company,
      ),
    });
  }

  private readOverview(meta: Record<string, unknown>): CompanyOverviewStats | null {
    const keys: (keyof CompanyOverviewStats)[] = [
      'authorised_total',
      'active_total',
      'pending_setup_total',
      'profile_completion_percent',
      'open_admin_tasks',
    ];
    if (
      !meta ||
      !keys.every(
        (key) =>
          typeof meta[key] === 'number' && Number.isFinite(meta[key]) && Number(meta[key]) >= 0,
      )
    )
      return null;
    if (Number(meta['profile_completion_percent']) > 100) return null;
    return Object.fromEntries(
      keys.map((key) => [key, meta[key]]),
    ) as unknown as CompanyOverviewStats;
  }

  private pagePath(next: string | number, endpoint: string): string {
    if (typeof next === 'number') {
      if (!Number.isInteger(next) || next < 1)
        throw new Error('The company list returned an invalid page. Please retry.');
      return `${endpoint}?page=${next}`;
    }
    const url = new URL(next, `${API_BASE}${endpoint}`);
    if (url.pathname.replace(/\/$/, '') !== `${API_BASE_PATH}${endpoint}`)
      throw new Error('The company list returned an invalid page. Please retry.');
    return url.pathname.slice(API_BASE_PATH.length) + url.search;
  }
}
