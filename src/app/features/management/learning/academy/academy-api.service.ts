import type { AcademyCourseWrite, AcademyBankWrite } from './academy.generated';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { ManagementStore } from '../../shared/management.store';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import {
  AcademyCourse,
  AcademyQuestion,
  AcademyQuestionGroup,
  AcademyAsset,
  AcademySettings,
} from './academy.models';

export interface CourseRecord {
  course: AcademyCourse & { company_id: string; etag: string };
  published: AcademyCourse | null;
  questions: AcademyQuestion[];
  versions: AcademyCourse[];
}
@Injectable({ providedIn: 'root' })
export class AcademyApi {
  private readonly auth = inject(AuthService);
  private readonly store = inject(ManagementStore);
  private readonly access = inject(CompanyAccessService);
  readonly scope = computed(() => {
    const context = this.access.context();
    return JSON.stringify({
      actor: this.auth.currentUser()?.id ?? '',
      allowed: this.available(),
      company: this.store.companyId(),
      context: context
        ? {
            company: context.company_id,
            active: context.company_active,
            platform: context.platform,
            revision: context.revision,
            modules: [...(context.enabled_modules ?? [])].sort(),
            permissions: [...(context.permissions ?? [])].sort(),
            roles: (context.roles ?? []).map((r) => r.id).sort(),
          }
        : null,
    });
  });
  readonly available = computed(
    () =>
      this.access.can('academy', 'courses', 'read') &&
      this.access.can('academy', 'courses', 'edit'),
  );
  can(feature: string, action: string): boolean {
    return this.available() && this.access.can('academy', feature, action);
  }
  private readonly loadedScope = signal('');
  private readonly records = signal<CourseRecord[]>([]);
  private readonly media = signal<AcademyAsset[]>([]);
  private readonly configuration = signal<Partial<AcademySettings>>({});
  private readonly audienceOptions = signal<{ roles: string[]; branches: string[] }>({
    roles: [],
    branches: [],
  });
  readonly settings = computed(() =>
    this.loadedScope() === this.scope() ? this.configuration() : {},
  );
  readonly audience = computed(() =>
    this.loadedScope() === this.scope() ? this.audienceOptions() : { roles: [], branches: [] },
  );
  private readonly writing = signal(false);
  readonly saving = this.writing.asReadonly();
  private beginWrite() {
    if (this.saving()) throw Error('A course save is already in progress. Wait for it to finish.');
    this.writing.set(true);
  }
  readonly error = signal('');
  readonly mediaError = signal('');
  readonly loading = signal(false);
  readonly courses = computed(() =>
    this.loadedScope() === this.scope() && this.available() ? this.records() : [],
  );
  readonly assets = computed(() =>
    this.loadedScope() === this.scope() && this.available() ? this.media() : [],
  );
  private inFlight?: { scope: string; promise: Promise<void> };
  constructor() {
    let previous = this.scope();
    effect(() => {
      const scope = this.scope();
      if (scope !== previous) {
        previous = scope;
        untracked(() => {
          this.clear();
          this.error.set('');
          this.mediaError.set('');
        });
      }
    });
  }
  private root() {
    return `/companies/${this.store.companyId()}/academy`;
  }
  private check(scope: string) {
    if (scope !== this.scope() || !this.available())
      throw Error('The workspace or academy access changed. Reopen this page.');
  }
  private accept(record: CourseRecord, scope: string) {
    this.check(scope);
    if (record.course.company_id !== this.store.companyId())
      throw Error('The returned course belongs to another workspace.');
    this.records.update((rows) => [
      ...rows.filter((r) => r.course.id !== record.course.id),
      record,
    ]);
    this.loadedScope.set(scope);
  }
  async load(force = false): Promise<void> {
    const scope = this.scope();
    if (!this.available()) {
      this.clear();
      throw Error('Course management is unavailable.');
    }
    if (!force && this.loadedScope() === scope) return;
    if (this.inFlight?.scope === scope) return this.inFlight.promise;
    this.records.set([]);
    this.media.set([]);
    this.loadedScope.set('');
    this.error.set('');
    this.loading.set(true);
    const promise = (async () => {
      try {
        const records: CourseRecord[] = [];
        let page: number | null = 1;
        while (page !== null) {
          const response: {
            results: CourseRecord[];
            next: number | null;
            meta: {
              company_id: string;
              settings?: Partial<AcademySettings>;
              audience?: { roles: string[]; branches: string[] };
            };
          } = await this.auth.api(`${this.root()}/courses?page=${page}&page_size=100`);
          this.check(scope);
          if (
            response.meta.company_id !== this.store.companyId() ||
            response.results.some((r) => r.course.company_id !== this.store.companyId())
          )
            throw Error('Course workspace mismatch.');
          this.configuration.set(response.meta.settings ?? {});
          this.audienceOptions.set(response.meta.audience ?? { roles: [], branches: [] });
          records.push(...response.results);
          page = response.next;
        }
        const assets: AcademyAsset[] = [];
        let mediaPage: number | null = 1;
        while (mediaPage !== null) {
          const media: { company_id: string; results: AcademyAsset[]; next?: number | null } =
            await this.auth.api(`${this.root()}/media?page=${mediaPage}&page_size=100`);
          this.check(scope);
          if (media.company_id !== this.store.companyId()) throw Error('Media workspace mismatch.');
          assets.push(...media.results);
          mediaPage = media.next ?? null;
        }
        this.records.set(records);
        this.media.set(assets);
        this.loadedScope.set(scope);
      } catch (e) {
        if (scope === this.scope()) {
          this.clear();
          this.error.set((e as Error).message);
        }
        throw e;
      } finally {
        if (this.inFlight?.scope === scope) {
          this.inFlight = undefined;
          this.loading.set(false);
        }
      }
    })();
    this.inFlight = { scope, promise };
    return promise;
  }
  clear() {
    this.records.set([]);
    this.media.set([]);
    this.loadedScope.set('');
  }
  private body(course: AcademyCourse) {
    const {
      id,
      version,
      updatedAt,
      status,
      sample,
      assessmentQuestions,
      publishedAt,
      publishedBy,
      ...body
    } = course;
    delete (body as Record<string, unknown>)['company_id'];
    delete (body as Record<string, unknown>)['etag'];
    if (!body.effectiveDate) delete body.effectiveDate;
    const source: AcademyCourseWrite = { ...body, code: course.code ?? '' };
    return structuredClone(source);
  }
  async detail(id: string): Promise<void> {
    const scope = this.scope();
    this.check(scope);
    try {
      this.accept(await this.auth.api<CourseRecord>(`${this.root()}/courses/${id}`), scope);
    } catch (e) {
      this.failed(e, scope);
      throw e;
    }
  }
  async save(course: AcademyCourse, expected: string): Promise<CourseRecord> {
    const scope = this.scope();
    this.check(scope);
    const old = this.courses().find((r) => r.course.id === course.id);
    if (old && old.course.updatedAt !== expected)
      throw Error('This course changed. Reload before saving.');
    const publish = course.status === 'Published';
    if (publish && !old) throw Error('Save a draft before publishing.');
    const path = `${this.root()}/courses${old ? '/' + course.id : ''}${publish ? '/publish' : ''}`;
    this.beginWrite();
    try {
      const record = await this.auth.api<CourseRecord>(
        path,
        this.body(course),
        old && !publish ? 'PATCH' : 'POST',
        old ? { 'If-Match': old.course.etag } : { 'Idempotency-Key': course.id },
      );
      this.accept(record, scope);
      return record;
    } catch (e) {
      this.failed(e, scope);
      throw e;
    } finally {
      this.writing.set(false);
    }
  }
  async bank(
    courseId: string,
    questions: AcademyQuestion[],
    groups: AcademyQuestionGroup[],
    expected: string,
    publishQuestionId?: string,
  ) {
    const scope = this.scope();
    this.check(scope);
    const record = this.courses().find((r) => r.course.id === courseId);
    if (!record || record.course.updatedAt !== expected)
      throw Error('This course changed. Reload the question bank.');
    this.beginWrite();
    try {
      const body: AcademyBankWrite = structuredClone({
        groups,
        questions: questions.map(({ version, updatedAt, ...q }) => q),
      });
      this.accept(
        await this.auth.api<CourseRecord>(
          `${this.root()}/courses/${courseId}/questions${publishQuestionId ? '/' + publishQuestionId + '/publish' : ''}`,
          body,
          publishQuestionId ? 'POST' : 'PATCH',
          { 'If-Match': record.course.etag },
        ),
        scope,
      );
    } catch (e) {
      this.failed(e, scope);
      throw e;
    } finally {
      this.writing.set(false);
    }
  }
  private failed(error: unknown, scope: string) {
    const status = (error as { status?: number }).status;
    if (scope === this.scope() && [401, 403, 404].includes(status ?? 0)) {
      this.clear();
      this.error.set((error as Error).message);
    }
  }
  private acceptMedia(value: AcademyAsset, scope: string) {
    this.check(scope);
    this.media.update((rows) => [...rows.filter((r) => r.id !== value.id), value]);
    return value;
  }
  async upload(file: File, key: string) {
    const scope = this.scope();
    this.check(scope);
    const body = new FormData();
    body.append('file', file);
    try {
      const value = this.acceptMedia(
        await this.auth.api<AcademyAsset>(`${this.root()}/media`, body, 'POST', {
          'Idempotency-Key': key,
        }),
        scope,
      );
      this.mediaError.set('');
      try {
        return await this.process(value.id);
      } catch (e) {
        if (scope !== this.scope() || !this.available()) throw e;
        this.mediaError.set((e as Error).message);
        return value;
      }
    } catch (e) {
      this.failed(e, scope);
      throw e;
    }
  }
  async process(id: string) {
    const scope = this.scope();
    this.check(scope);
    const media = this.assets().find((a) => a.id === id);
    if (!media) throw Error('Media is unavailable.');
    try {
      return this.acceptMedia(
        await this.auth.api<AcademyAsset>(`${this.root()}/media/${id}/process`, {}, 'POST', {
          'If-Match': `"v${media.version}"`,
        }),
        scope,
      );
    } catch (e) {
      this.failed(e, scope);
      throw e;
    }
  }

  async metadata(id: string, values: Partial<AcademyAsset>) {
    const scope = this.scope();
    this.check(scope);
    const media = this.assets().find((a) => a.id === id);
    if (!media) throw Error('Media is unavailable.');
    try {
      this.acceptMedia(
        await this.auth.api<AcademyAsset>(`${this.root()}/media/${id}`, values, 'PATCH', {
          'If-Match': `"v${media.version}"`,
        }),
        scope,
      );
    } catch (e) {
      this.failed(e, scope);
      throw e;
    }
  }
  async approve(courseId: string, lessonId: string) {
    const scope = this.scope();
    this.check(scope);
    const record = this.courses().find((r) => r.course.id === courseId);
    if (!record) throw Error('Course is unavailable.');
    try {
      this.acceptMedia(
        await this.auth.api<AcademyAsset>(
          `${this.root()}/courses/${courseId}/lessons/${lessonId}/approve-media`,
          {},
          'POST',
          { 'If-Match': record.course.etag },
        ),
        scope,
      );
    } catch (e) {
      this.failed(e, scope);
      throw e;
    }
  }

  async blob(id: string): Promise<Blob> {
    const scope = this.scope();
    this.check(scope);
    try {
      const value = await this.auth.api<Blob>(
        `${this.root()}/media/${id}/content`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      this.check(scope);
      return value;
    } catch (e) {
      this.failed(e, scope);
      throw e;
    }
  }
}
