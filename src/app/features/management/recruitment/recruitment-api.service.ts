import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { API_BASE } from '../../../core/auth/auth-api';
import type { Vacancy, Person, StaffDocument, Company } from '../shared/management.store';
import { vacancyClosed, vacancyScheduled } from './vacancy-deadline';

import type {
  RecruitmentVacancy as VacancyDto,
  RecruitmentApplication as ApplicationDto,
  RecruitmentInterview as InterviewDto,
  RecruitmentOffer as OfferDto,
  RecruitmentSummary as SummaryDto,
  RecruitmentCompliance as ComplianceDto,
  RecruitmentUpload as UploadDto,
  RecruitmentPublicVacancy as PublicVacancyDto,
  RecruitmentHire as HireDto,
} from './recruitment.generated';
export type RecruitmentVacancy = VacancyDto;
export type RecruitmentApplication = ApplicationDto;
export type Interview = InterviewDto;
export type Offer = OfferDto;
export type RecruitmentSummary = SummaryDto;
export type CandidateCompliance = ComplianceDto;
export type Upload = UploadDto;
export type PublicVacancy = PublicVacancyDto;
interface Page<T> {
  count: number;
  next: string | null;
  results: T[];
  meta: { company_id: string };
}

@Injectable({ providedIn: 'root' })
export class RecruitmentApi {
  private readonly auth = inject(AuthService);
  readonly access = inject(CompanyAccessService);
  readonly companyId = this.access.companyId;
  readonly vacancies = signal<RecruitmentVacancy[]>([]);
  readonly applications = signal<RecruitmentApplication[]>([]);
  readonly summary = signal<RecruitmentSummary | null>(null);
  readonly record = signal<RecruitmentApplication | null>(null);
  readonly compliance = signal<CandidateCompliance | null>(null);
  readonly loading = signal(true);
  readonly recordLoading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly scope = computed(
    () => `${this.auth.profile()?.id ?? ''}:${this.companyId()}:${this.allowed()}`,
  );
  private readonly mutationKeys = new Map<string, string>();
  private mutationKey(source: string): string {
    const previous = this.mutationKeys.get(source);
    if (previous) return previous;
    const key = crypto.randomUUID();
    this.mutationKeys.set(source, key);
    return key;
  }
  private generation = 0;
  private recordGeneration = 0;
  readonly allowed = computed(() => this.access.can('people', 'recruitment', 'read'));
  constructor() {
    effect(() => {
      this.companyId();
      this.auth.profile()?.id;
      this.allowed();
      untracked(() => this.reset());
    });
    effect(() => {
      if (!this.access.can('people', 'compliance', 'read')) this.compliance.set(null);
    });
  }
  private reset(): void {
    this.generation++;
    this.recordGeneration++;
    this.mutationKeys.clear();
    this.vacancies.set([]);
    this.applications.set([]);
    this.summary.set(null);
    this.record.set(null);
    this.compliance.set(null);
    this.error.set('');
    this.loading.set(true);
    this.recordLoading.set(true);
  }
  can(action: string): boolean {
    return this.access.can('people', 'recruitment', action);
  }
  private path(suffix: string): string {
    return `/companies/${encodeURIComponent(this.companyId())}${suffix}`;
  }
  private async all<T>(path: string, company: string): Promise<T[]> {
    const results: T[] = [];
    let next: string | null = path;
    const visited = new Set<string>();
    while (next) {
      if (visited.has(next) || visited.size >= 100)
        throw Error('Narrow the recruitment result set before continuing.');
      visited.add(next);
      const data: Page<T> = await this.auth.api(next);
      if (data.meta.company_id !== company)
        throw Error('The recruitment records do not match this company.');
      results.push(...data.results);
      if (data.next) {
        const url = new URL(data.next, API_BASE);
        const base = new URL(API_BASE);
        if (
          url.origin !== base.origin ||
          !url.pathname.startsWith(base.pathname + `/companies/${company}/`)
        )
          throw Error('The recruitment page link is invalid.');
        next = url.pathname.slice(base.pathname.length) + url.search;
      } else next = null;
    }
    return results;
  }
  async load(q = '', vacancyId = ''): Promise<void> {
    const company = this.companyId(),
      generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    this.applications.set([]);
    if (!company || !this.allowed()) {
      this.loading.set(false);
      return;
    }
    try {
      const [summary, vacancies, applications] = await Promise.all([
        this.auth.api<RecruitmentSummary>(this.path('/recruitment/summary')),
        this.all<RecruitmentVacancy>(this.path('/vacancies?page_size=100'), company),
        this.all<RecruitmentApplication>(
          this.path(
            '/applications?page_size=100' +
              (q ? '&q=' + encodeURIComponent(q) : '') +
              (vacancyId ? '&vacancy=' + encodeURIComponent(vacancyId) : ''),
          ),
          company,
        ),
      ]);
      if (generation !== this.generation || company !== this.companyId() || !this.allowed()) return;
      if (
        summary.company_id !== company ||
        [...vacancies, ...applications].some((row) => row.company_id !== company)
      )
        throw Error('The recruitment records do not match this company.');
      this.summary.set(summary);
      this.vacancies.set(vacancies);
      this.applications.set(applications);
    } catch (error) {
      if (generation === this.generation) {
        this.summary.set(null);
        this.vacancies.set([]);
        this.applications.set([]);
        this.error.set(this.message(error));
      }
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async detail(id: string): Promise<void> {
    const company = this.companyId(),
      generation = ++this.recordGeneration;
    this.record.set(null);
    this.compliance.set(null);
    this.recordLoading.set(true);
    this.error.set('');
    if (!company || !this.allowed()) {
      this.recordLoading.set(false);
      return;
    }
    try {
      const value = await this.auth.api<RecruitmentApplication>(this.path(`/applications/${id}`));
      if (generation !== this.recordGeneration || company !== this.companyId() || !this.allowed())
        return;
      if (value.company_id !== company || value.id !== id)
        throw Error('The application does not match this company.');
      this.record.set(value);
      if (this.access.can('people', 'compliance', 'read')) {
        const compliance = await this.auth.api<CandidateCompliance>(
          this.path(`/applications/${id}/compliance`),
        );
        if (
          generation === this.recordGeneration &&
          company === this.companyId() &&
          this.allowed() &&
          this.access.can('people', 'compliance', 'read')
        )
          this.compliance.set(compliance);
      }
    } catch (error) {
      if (generation === this.recordGeneration) this.error.set(this.message(error));
    } finally {
      if (generation === this.recordGeneration) this.recordLoading.set(false);
    }
  }
  async saveVacancy(vacancy: Vacancy): Promise<RecruitmentVacancy> {
    const company = this.companyId(),
      scope = this.scope();
    const source = 'vacancy:' + vacancy.id;
    const existing = this.vacancies().find((row) => row.id === vacancy.id);
    const payload = {
      title: vacancy.title,
      location: vacancy.location,
      type: vacancy.type,
      salary: vacancy.salary,
      description: vacancy.description ?? '',
      published: !!vacancy.published,
      goLiveDate: vacancy.goLiveDate || null,
      closingDate: vacancy.closingDate || null,
      fields: vacancy.fields ?? [],
      documents: vacancy.documents ?? [],
    };
    const value = await this.auth.api<RecruitmentVacancy>(
      this.path('/vacancies' + (existing ? '/' + existing.id : '')),
      payload,
      existing ? 'PATCH' : 'POST',
      {
        'Idempotency-Key': this.mutationKey(source),
        ...(existing ? { 'If-Match': existing.etag } : {}),
      },
    );
    if (company !== this.companyId() || scope !== this.scope() || !this.allowed())
      throw Error('The workspace or recruitment access changed.');
    this.mutationKeys.delete(source);
    await this.load();
    return value;
  }
  async addApplicant(data: {
    name: string;
    email: string;
    vacancy: string;
    location: string;
  }): Promise<void> {
    const vacancy = this.vacancies().find((row) => row.id === data.vacancy);
    if (!vacancy) throw Error('Choose a vacancy.');
    await this.auth.api(
      this.path('/applications'),
      {
        vacancy_id: vacancy.id,
        vacancy_version: vacancy.version,
        name: data.name,
        email: data.email,
        location: data.location,
      },
      'POST',
      { 'Idempotency-Key': crypto.randomUUID() },
    );
    await this.load();
  }
  async command(
    operation: string,
    payload: unknown,
    etag?: string,
    key?: string,
  ): Promise<RecruitmentApplication> {
    const row = this.record(),
      company = this.companyId(),
      scope = this.scope();
    if (!row || row.company_id !== company)
      throw Error('Reload this application before continuing.');
    const source = `${row.id}:${operation}:${etag ?? row.etag}:${JSON.stringify(payload)}`;
    const operationKey = key ?? this.mutationKey(source);
    const method = operation.startsWith('interviews/') ? 'PATCH' : 'POST';
    const result = await this.auth.api<RecruitmentApplication>(
      this.path(`/applications/${row.id}/${operation}`),
      payload,
      method,
      { 'If-Match': etag ?? row.etag, 'Idempotency-Key': operationKey },
    );
    if (company !== this.companyId() || scope !== this.scope() || !this.allowed())
      throw Error('The workspace or recruitment access changed.');
    if (result.company_id !== company || result.id !== row.id)
      throw Error('The application does not match this company.');
    this.mutationKeys.delete(source);
    this.record.set(result);
    this.applications.update((rows) => rows.map((item) => (item.id === result.id ? result : item)));
    return result;
  }
  async updateApplication(payload: unknown): Promise<void> {
    const row = this.record();
    if (!row) return;
    const company = this.companyId(),
      scope = this.scope();
    const result = await this.auth.api<RecruitmentApplication>(
      this.path(`/applications/${row.id}`),
      payload,
      'PATCH',
      { 'If-Match': row.etag },
    );
    if (
      company === this.companyId() &&
      scope === this.scope() &&
      this.allowed() &&
      result.company_id === company &&
      result.id === row.id
    )
      this.record.set(result);
  }
  async updateCompliance(payload: unknown): Promise<void> {
    const row = this.record();
    if (!row) return;
    const scope = this.scope();
    const result = await this.auth.api<CandidateCompliance>(
      this.path(`/applications/${row.id}/compliance`),
      payload,
      'PATCH',
      { 'If-Match': this.compliance()?.etag ?? '"v0"' },
    );
    if (
      scope === this.scope() &&
      this.access.can('people', 'compliance', 'read') &&
      result.application_id === this.record()?.id
    )
      this.compliance.set(result);
  }
  async upload(
    file: File,
    vacancy: Pick<RecruitmentVacancy, 'id' | 'company_id' | 'version'>,
    requirementId?: string,
    applicationId?: string,
  ): Promise<Upload> {
    const scope = this.scope();
    return uploadRecruitmentFile(
      (path, body, headers) => {
        if (scope !== this.scope() || !this.can('edit'))
          throw Error('The workspace or recruitment access changed.');
        return this.auth.api(path, body, body === undefined ? undefined : 'POST', headers);
      },
      this.path('/recruitment/files'),
      file,
      vacancy,
      requirementId,
      applicationId,
    );
  }
  async download(file: Upload): Promise<void> {
    const company = this.companyId(),
      scope = this.scope();
    const data = await this.auth.api<Blob>(
      this.path(`/recruitment/files/${file.id}/content`),
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (company !== this.companyId() || scope !== this.scope() || !this.allowed()) return;
    downloadBlob(data, file.name);
  }
  async removeFile(file: Upload): Promise<void> {
    const scope = this.scope(),
      source = `file:${file.id}:archive:${file.etag}`;
    await this.auth.api(
      this.path(`/recruitment/files/${file.id}/archive`),
      { reason: 'Removed by the recruitment team' },
      'POST',
      {
        'If-Match': file.etag,
        'Idempotency-Key': this.mutationKey(source),
      },
    );
    if (scope !== this.scope() || !this.allowed()) return;
    this.mutationKeys.delete(source);
    const id = this.record()?.id;
    if (id) await this.detail(id);
  }
  async draft(
    id: string,
  ): Promise<{ draft: { etag: string; step: number; facts: HireInput } | null }> {
    return this.auth.api(this.path(`/applications/${id}/setup-draft`));
  }
  async saveDraft(
    id: string,
    facts: HireInput,
    step: number,
    etag: string,
  ): Promise<{ etag: string }> {
    return this.auth.api(this.path(`/applications/${id}/setup-draft`), { facts, step }, 'PATCH', {
      'If-Match': etag,
    });
  }
  message(error: unknown): string {
    return error instanceof Error ? error.message : 'Recruitment information is unavailable.';
  }
  vacancyStatus(vacancy: Vacancy): string {
    return (
      (vacancy as RecruitmentVacancy).status ??
      (!vacancy.published
        ? 'Not accepting applications'
        : vacancyClosed(vacancy, new Date())
          ? 'Deadline passed'
          : vacancyScheduled(vacancy, new Date())
            ? 'Scheduled'
            : 'Accepting applications')
    );
  }
  vacancyClosed(vacancy: Vacancy): boolean {
    return this.vacancyStatus(vacancy) === 'Deadline passed';
  }
  vacancyScheduled(vacancy: Vacancy): boolean {
    return this.vacancyStatus(vacancy) === 'Scheduled';
  }
}

export type HireInput = Omit<HireDto, 'facts' | 'status' | 'employment_type'> & {
  facts: Record<string, unknown>;
  employment_type: string;
  status?: string;
};

export async function publicRecruitment<T>(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await fetch(API_BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'omit',
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.detail ?? 'Recruitment information is unavailable.');
  return data as T;
}

type Transport = <T>(path: string, body?: unknown, headers?: Record<string, string>) => Promise<T>;
export async function uploadRecruitmentFile(
  request: Transport,
  endpoint: string,
  file: File,
  vacancy: Pick<RecruitmentVacancy, 'id' | 'company_id' | 'version'>,
  requirementId?: string,
  applicationId?: string,
): Promise<Upload> {
  if (file.size < 1 || file.size > 1048576)
    throw Error('Choose a document between 1 byte and 1 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };
  if (!types[extension]) throw Error('Choose a PDF, Word document or JPG/PNG image.');
  const content = await file.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', content)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  const session = await request<Upload>(
    endpoint,
    {
      company_id: vacancy.company_id,
      vacancy_id: vacancy.id,
      vacancy_version: vacancy.version,
      ...(requirementId ? { requirement_id: requirementId } : {}),
      ...(applicationId ? { application_id: applicationId } : {}),
      name: file.name,
      content_type: types[extension],
      size: file.size,
      sha256: digest,
    },
    { 'Idempotency-Key': crypto.randomUUID() },
  );
  const base = endpoint.startsWith('/public/')
    ? `/public/companies/${vacancy.company_id}/application-uploads/${session.id}`
    : endpoint + '/' + session.id;
  const headers = { 'X-Upload-Token': session.upload_token ?? '' };
  for (let offset = 0, position = 0; offset < content.byteLength; offset += 262144, position++) {
    const bytes = new Uint8Array(content.slice(offset, offset + 262144));
    let text = '';
    for (let index = 0; index < bytes.length; index++) text += String.fromCharCode(bytes[index]);
    await request(base + `/chunks/${position}`, { content: btoa(text) }, headers);
  }
  let value = await request<Upload>(
    base + '/finalise',
    {},
    { ...headers, 'If-Match': session.etag, 'Idempotency-Key': crypto.randomUUID() },
  );
  for (let attempt = 0; value.state === 'quarantined' && attempt < 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    value = await request<Upload>(base, undefined, headers);
  }
  if (value.state !== 'clean')
    throw Error(
      value.state === 'quarantined'
        ? 'The document is still being scanned. Try again when scanning is available.'
        : 'This document did not pass security scanning.',
    );
  return { ...value, upload_token: session.upload_token };
}

export function asPerson(
  row: RecruitmentApplication,
  compliance: CandidateCompliance | null = null,
): Person {
  const checks = [
    'Right to work',
    'DBS check',
    'Adult barred list',
    'Child barred list',
    'References',
    'Health declaration',
    'Code of conduct',
  ];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    location: row.location,
    stage: row.stage,
    vacancy: row.vacancy,
    vacancyId: row.vacancyId,
    start: row.start,
    notes: (row.notes ?? []).map((note) => note.text),
    documents: (row.documents ?? []).map((document) => ({
      ...document,
      requirementId: document.requirementId ?? undefined,
      content: '',
    })),
    checks: checks.map(
      (code) => compliance?.checks.find((row) => row.code === code)?.recorded ?? false,
    ),
    onboarding: [],
    learning: [],
    progress: {},
    application: row.application,
    visaType: compliance?.visa_type,
    visaExpiry: compliance?.visa_expiry ?? '',
    checkExpiry: Object.fromEntries(
      (compliance?.checks ?? []).map((row) => [row.code, row.expiry ?? '']),
    ),
  };
}
export function downloadBlob(data: Blob, name: string): void {
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
