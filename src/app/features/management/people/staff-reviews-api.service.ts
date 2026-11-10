import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { API_BASE } from '../../../core/auth/auth-api';
import type {
  StaffReview,
  StaffReviewPage,
  StaffReviewWrite,
  StaffReviewComplete,
  StaffReviewOptions,
  StaffReviewType,
  StaffReviewDimension,
} from './staff-reviews.generated';
@Injectable({ providedIn: 'root' })
export class StaffReviewsApi {
  private readonly auth = inject(AuthService);
  readonly access = inject(CompanyAccessService);
  readonly companyId = this.access.companyId;
  readonly allowed = computed(
    () =>
      this.access.can('people', 'performance', 'read') &&
      this.access.can('people', 'records', 'read'),
  );
  readonly scope = computed(
    () =>
      `${this.auth.profile()?.id ?? ''}:${this.companyId()}:${JSON.stringify(this.access.context())}`,
  );
  readonly rows = signal<StaffReview[]>([]);
  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly staff = signal<StaffReviewOptions['results']>([]);
  readonly types = signal<StaffReviewType[]>([]);
  readonly dimensions = signal<StaffReviewDimension[]>([]);
  readonly localDate = signal('');
  readonly canComplete = signal(false);
  readonly optionsLoading = signal(false);
  readonly optionError = signal('');
  private generation = 0;
  private optionsGeneration = 0;
  private readonly keys = new Map<string, string>();
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => {
        this.generation++;
        this.optionsGeneration++;
        this.rows.set([]);
        this.loaded.set(false);
        this.loading.set(false);
        this.error.set('');
        this.staff.set([]);
        this.types.set([]);
        this.dimensions.set([]);
        this.localDate.set('');
        this.canComplete.set(false);
        this.optionError.set('');
        this.optionsLoading.set(false);
        this.keys.clear();
      });
    });
  }
  private root(): string {
    if (!this.companyId() || !this.allowed())
      throw Error('Supervision and appraisal access is unavailable.');
    return `/companies/${this.companyId()}`;
  }
  private key(source: string): string {
    if (!this.keys.has(source)) this.keys.set(source, crypto.randomUUID());
    return this.keys.get(source)!;
  }
  private next(value: string | null, company: string): string | null {
    if (!value) return null;
    const url = new URL(value, API_BASE),
      base = new URL(API_BASE);
    if (
      url.origin !== base.origin ||
      !url.pathname.startsWith(base.pathname + `/companies/${company}/`)
    )
      throw Error('The review page link is invalid.');
    return url.pathname.slice(base.pathname.length) + url.search;
  }
  async load(q = '', status = '', staffId = ''): Promise<void> {
    const scope = this.scope(),
      company = this.companyId(),
      generation = ++this.generation;
    this.rows.set([]);
    this.loaded.set(false);
    this.error.set('');
    this.loading.set(true);
    try {
      let path: string | null =
        this.root() +
        '/staff-reviews?' +
        new URLSearchParams({
          q,
          status,
          page_size: '100',
          ...(staffId ? { staff_id: staffId } : {}),
        });
      const rows: StaffReview[] = [];
      const seen = new Set<string>();
      while (path) {
        if (seen.has(path) || seen.size >= 100)
          throw Error('Narrow the review search to load this history.');
        seen.add(path);
        const response: StaffReviewPage = await this.auth.api(path);
        if (response.meta.company_id !== company)
          throw Error('The review response does not match this company.');
        if (scope !== this.scope() || generation !== this.generation) return;
        rows.push(...response.results);
        this.localDate.set(response.meta.local_date);
        path = this.next(response.next, company);
      }
      this.rows.set(rows);
      this.loaded.set(true);
    } catch (error) {
      if (scope === this.scope() && generation === this.generation)
        this.error.set(this.message(error));
    } finally {
      if (scope === this.scope() && generation === this.generation) this.loading.set(false);
    }
  }
  async options(): Promise<void> {
    const scope = this.scope(),
      company = this.companyId(),
      generation = ++this.optionsGeneration;
    this.staff.set([]);
    this.types.set([]);
    this.dimensions.set([]);
    this.optionError.set('');
    this.optionsLoading.set(true);
    try {
      let path: string | null = this.root() + '/hr/review-options?page_size=100';
      const staff: StaffReviewOptions['results'] = [];
      const seen = new Set<string>();
      let meta: StaffReviewOptions['meta'] | null = null;
      while (path) {
        if (seen.has(path) || seen.size >= 100)
          throw Error('Open a staff record to add a review for this workforce.');
        seen.add(path);
        const response: StaffReviewOptions = await this.auth.api(path);
        if (response.meta.company_id !== company)
          throw Error('The staff options do not match this company.');
        if (scope !== this.scope() || generation !== this.optionsGeneration) return;
        staff.push(...response.results);
        meta = response.meta;
        path = this.next(response.next, company);
      }
      this.staff.set(staff);
      if (meta) {
        this.types.set(meta.types);
        this.dimensions.set(meta.dimensions);
        this.localDate.set(meta.local_date);
        this.canComplete.set(meta.can_complete);
      }
    } catch (error) {
      if (scope === this.scope() && generation === this.optionsGeneration)
        this.optionError.set(this.message(error));
    } finally {
      if (scope === this.scope() && generation === this.optionsGeneration)
        this.optionsLoading.set(false);
    }
  }
  async create(body: StaffReviewWrite, key: string): Promise<StaffReview> {
    const scope = this.scope();
    const result = await this.auth.api<StaffReview>(this.root() + '/staff-reviews', body, 'POST', {
      'Idempotency-Key': key,
    });
    if (scope !== this.scope()) throw Error('The workspace or review access changed.');
    if (
      result.personId !== body.staff_id ||
      result.type_id !== body.type_id ||
      result.date !== body.date ||
      result.assessor !== body.assessor.trim()
    )
      throw Error('This review changed. Reopen the review before continuing.');
    return result;
  }
  async complete(row: StaffReview, body: StaffReviewComplete): Promise<StaffReview> {
    const scope = this.scope();
    const result = await this.auth.api<StaffReview>(
      this.root() + `/staff-reviews/${row.id}/complete`,
      body,
      'POST',
      {
        'If-Match': row.etag,
        'Idempotency-Key': this.key(`complete:${row.id}:${row.etag}:${JSON.stringify(body)}`),
      },
    );
    if (scope !== this.scope()) throw Error('The workspace or review access changed.');
    return result;
  }
  message(error: unknown): string {
    return error instanceof Error ? error.message : 'Supervision and appraisals are unavailable.';
  }
}
