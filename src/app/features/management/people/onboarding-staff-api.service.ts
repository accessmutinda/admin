import { Injectable, computed, effect, DestroyRef, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import type { Person, StaffDocument, Course } from '../shared/management.store';
import type { StaffOnboarding } from './onboarding.generated';
import { weeklySlots } from './hr.models';
import type { Upload } from '../recruitment/recruitment-api.service';

export type OnboardingPerson = Person & { hr: NonNullable<Person['hr']> };
export type Readiness = {
  ready: boolean;
  missing: string[];
  completed: number;
  total: number;
  next_task: string | null;
  next_section: string;
  tasks: { title: string; section: string; done: boolean }[];
};
const optionalDate = (value: string | undefined) => value || null;
@Injectable({ providedIn: 'root' })
export class OnboardingStaffApi {
  readonly access = inject(CompanyAccessService);
  private readonly auth = inject(AuthService);
  readonly companyId = this.access.companyId;
  readonly area = signal<'onboarding' | 'compliance' | 'leave' | 'performance'>('onboarding');
  readonly value = signal<StaffOnboarding | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly person = computed(() => (this.value()?.person as OnboardingPerson | null) ?? null);
  readonly readiness = computed(
    () =>
      (this.value()?.readiness as Readiness | undefined) ?? {
        ready: false,
        missing: ['Onboarding evidence is unavailable.'],
        completed: 0,
        total: 0,
        next_task: null,
        next_section: 'employment',
        tasks: [],
      },
  );
  readonly courses = computed<Course[]>(() =>
    (this.value()?.courses ?? []).map((row) => ({
      id: String(row['id']),
      title: String(row['title']),
      category: String(row['category']),
      icon: String(row['icon']),
      duration: '',
      description: '',
    })),
  );
  readonly localDate = computed(() => this.value()?.local_date ?? '');
  readonly scope = computed(
    () =>
      `${this.auth.profile()?.id ?? ''}:${this.companyId()}:${this.area()}:${JSON.stringify(this.access.context())}`,
  );
  private photoUrl = '';
  private photoId = '';
  private clearPhoto(): void {
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
    this.photoUrl = '';
    this.photoId = '';
  }
  lastUploadEtag = '';
  private generation = 0;
  private readonly keys = new Map<string, string>();
  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearPhoto());
    effect(() => {
      this.scope();
      untracked(() => {
        this.generation++;
        this.value.set(null);
        this.error.set('');
        this.loading.set(false);
        this.keys.clear();
        this.lastUploadEtag = '';
        this.clearPhoto();
      });
    });
  }
  private key(source: string): string {
    if (!this.keys.has(source)) this.keys.set(source, crypto.randomUUID());
    return this.keys.get(source)!;
  }
  private filePath(): string {
    return this.area() === 'compliance' ? '/files' : '/onboarding-files';
  }
  private endpoint(id: string): string {
    const company = this.companyId();
    if (
      !company ||
      !this.access.can('people', this.area(), 'read') ||
      !this.access.can('people', 'records', 'read')
    )
      throw Error('Staff record access is unavailable.');
    return `/companies/${company}/staff/${id}${this.area() === 'compliance' ? '/workforce-compliance' : this.area() === 'leave' ? '/workforce-availability' : this.area() === 'performance' ? '/workforce-reviews' : ''}`;
  }
  private accept(value: StaffOnboarding, id: string, scope: string): StaffOnboarding {
    if (scope !== this.scope())
      throw Error('The workspace or staff access changed. Reopen the staff record.');
    const person = value.person as OnboardingPerson;
    if (value.company_id !== this.companyId() || person.id !== id || !person.hr)
      throw Error('The staff response does not match this company and employee.');
    if (
      person.hr.personal.photoFileId &&
      this.photoId === person.hr.personal.photoFileId &&
      this.photoUrl
    )
      person.hr.personal.photo = this.photoUrl;
    this.value.set(value);
    void this.loadPhoto(value, scope);
    return value;
  }
  private async loadPhoto(value: StaffOnboarding, scope: string): Promise<void> {
    const person = value.person as OnboardingPerson,
      photoId = person.hr.personal.photoFileId;
    if (!photoId || (this.photoId === photoId && this.photoUrl)) return;
    this.clearPhoto();
    try {
      const blob = await this.auth.api<Blob>(
        this.endpoint(person.id) + `${this.filePath()}/${photoId}/download`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      if (scope !== this.scope() || this.value() !== value) return;
      this.photoId = photoId;
      this.photoUrl = URL.createObjectURL(blob);
      person.hr.personal.photo = this.photoUrl;
      this.value.set({ ...value, person: { ...person } });
    } catch {
      if (scope === this.scope()) this.error.set('The photograph could not be downloaded.');
    }
  }
  async load(id: string, refresh = false): Promise<void> {
    const scope = this.scope(),
      generation = ++this.generation;
    if (!refresh || this.person()?.id !== id) this.value.set(null);
    this.error.set('');
    this.loading.set(true);
    try {
      const value = await this.auth.api<StaffOnboarding>(this.endpoint(id) + '/profile');
      if (generation === this.generation) this.accept(value, id, scope);
    } catch (error) {
      if (generation === this.generation) {
        this.value.set(null);
        this.error.set(this.message(error));
      }
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  message(error: unknown): string {
    return error instanceof Error ? error.message : 'Staff onboarding is unavailable.';
  }
  private async mutate(
    id: string,
    suffix: string,
    body: unknown,
    method: 'POST' | 'PATCH',
    etag = this.value()?.etag,
    headers: Record<string, string> = {},
  ): Promise<void> {
    const scope = this.scope(),
      generation = this.generation;
    if (!etag) throw Error('Reload this staff record before saving.');
    try {
      const value = await this.auth.api<StaffOnboarding>(
        this.endpoint(id) +
          (this.area() === 'performance' && suffix === '/onboarding-entries'
            ? '/entries'
            : this.area() === 'leave' && suffix === '/availability'
              ? '/pattern'
              : this.area() === 'compliance'
                ? suffix === '/compliance'
                  ? '/checks'
                  : suffix === '/onboarding-entries'
                    ? '/requests'
                    : suffix
                : suffix),
        body,
        method,
        {
          'If-Match': etag,
          ...headers,
        },
      );
      if (generation !== this.generation)
        throw Error(
          'The selected staff record changed. Reopen the record to see the saved result.',
        );
      this.accept(value, id, scope);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (
        generation === this.generation &&
        scope === this.scope() &&
        (status === 401 || status === 403 || status === 404)
      ) {
        this.value.set(null);
        this.error.set(this.message(error));
      }
      throw error;
    }
  }
  async save(person: OnboardingPerson, section: string, etag: string): Promise<void> {
    const h = person.hr;
    let body: unknown;
    if (section === 'personal') {
      const { photo, photoFileId, ...personal } = h.personal;
      body = {
        ...personal,
        photo_file_id: photoFileId || null,
        birthDate: optionalDate(personal.birthDate),
        email: person.email,
      };
    } else if (section === 'employment') {
      const { recruitment, rate, payrollNumber, ...terms } = h.employment;
      body = {
        ...terms,
        recruitmentSource: recruitment?.source ?? '',
        nextReview: optionalDate(recruitment?.nextReview),
        reference: h.reference,
        role: person.role,
        location: person.location,
        start: person.start,
        contractEnd: optionalDate(terms.contractEnd),
        references: h.references.map(({ id, ...reference }) => ({
          ...(this.person()?.hr.references.some((row) => row.id === id) ? { id } : {}),
          ...reference,
        })),
        ...(this.access.can('finance', 'payroll', 'read') &&
        this.access.can('finance', 'payroll', 'edit')
          ? { rate, payrollNumber }
          : {}),
      };
    } else if (section === 'availability') {
      body = {
        mode: h.availabilityMode ?? 'Weekly slots',
        availability: h.availability,
        weeklySlots: weeklySlots(person),
        preferences: h.preferences,
        ...(this.access.can('people', 'records', 'edit')
          ? { driver: h.personal.driver, vehicle: h.personal.vehicle ?? '' }
          : {}),
      };
    } else if (section === 'compliance') {
      body = {
        checks: h.checks.map(({ id, status, completed, expiry, documentId, note }) => ({
          id,
          status,
          completed: optionalDate(completed),
          expiry: optionalDate(expiry),
          documentId: documentId || null,
          note,
        })),
      };
    } else if (section === 'training') {
      body = {
        training: h.training.map((t) => ({
          courseId: t.courseId,
          completed: optionalDate(t.completed),
          expiry: optionalDate(t.expiry),
          certificateId: t.certificateId || null,
          assessor: t.assessor,
          competency: t.competency,
          score: t.score ?? null,
          reassessmentDue: optionalDate(t.reassessmentDue),
        })),
        induction: h.induction.map(({ id, complete, evidenceId }) => ({
          id,
          complete,
          ...(evidenceId ? { evidence_id: evidenceId } : {}),
        })),
      };
    } else if (section === 'documents') {
      body = {
        documents: (person.documents ?? []).map((d) => ({
          id: d.id,
          category: d.category || 'Employment & HR',
          expiry: optionalDate(d.expiry),
        })),
      };
    } else throw Error('This staff section is not connected yet.');
    await this.mutate(person.id, '/' + section, body, 'PATCH', etag);
  }
  async commit(before: OnboardingPerson, after: Person): Promise<void> {
    for (const [key, kind] of [
      ['requests', 'request'],
      ['actions', 'action'],
      ['bookings', 'booking'],
      ['notes', 'note'],
    ] as const) {
      const existing = before.hr[key] ?? [],
        next = after.hr![key] ?? [];
      const added = next.find((row) => !existing.some((v) => v.id === row.id));
      if (added) {
        let body: unknown;
        if (kind === 'request') {
          const row = added as NonNullable<Person['hr']>['requests'][number];
          body = { kind, title: row.title };
        } else if (kind === 'action') {
          const row = added as NonNullable<Person['hr']>['actions'][number];
          body = { kind, title: row.title, owner: row.owner, due: row.due };
        } else if (kind === 'booking') {
          const row = added as NonNullable<NonNullable<Person['hr']>['bookings']>[number];
          body = {
            kind,
            course_id: row.courseId,
            due: row.date,
            provider: row.provider,
            booking_type: row.type,
          };
        } else {
          const row = added as NonNullable<Person['hr']>['notes'][number];
          body = { kind, title: row.text, reflective: row.reflective };
        }
        await this.mutate(before.id, '/onboarding-entries', body, 'POST');
        return;
      }
      const changed = next.find(
        (row) => JSON.stringify(row) !== JSON.stringify(existing.find((v) => v.id === row.id)),
      );
      if (changed) {
        const row = changed as { id: string; status: string; evidence?: string };
        await this.mutate(
          before.id,
          '/onboarding-entries',
          {
            kind,
            id: row.id,
            state: row.status,
            ...(kind === 'action' ? { evidence: row.evidence } : {}),
          },
          'POST',
        );
        return;
      }
    }
    throw Error('This action is not connected to staff onboarding.');
  }
  async verify(id: string): Promise<void> {
    const person = this.person();
    if (!person) throw Error('Reload this staff record.');
    await this.mutate(person.id, `${this.filePath()}/${id}/verify`, {}, 'POST');
  }
  async activate(id: string, etag: string): Promise<void> {
    const localDate = this.localDate();
    if (!localDate) throw Error('Reload the onboarding record before activation.');
    const body = {
      reason: 'Onboarding completed after current evidence review.',
      effective_date: localDate,
    };
    await this.mutate(id, '/activate', body, 'POST', etag, {
      'Idempotency-Key': this.key(`activate:${id}:${etag}`),
    });
  }
  async upload(file: File, category: string, replacesId = ''): Promise<StaffDocument> {
    const person = this.person(),
      scope = this.scope(),
      generation = this.generation;
    if (!person || !this.value()) throw Error('Reload the staff record before uploading.');
    if (file.size < 1 || file.size > 1048576) throw Error('Choose a file between 1 byte and 1 MB.');
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };
    const type = types[file.name.split('.').pop()?.toLowerCase() ?? ''];
    if (!type) throw Error('Choose a PDF, JPG, PNG, DOC or DOCX file.');
    const bytes = await file.arrayBuffer();
    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
    if (scope !== this.scope() || generation !== this.generation)
      throw Error('The selected workspace or staff record changed during upload.');
    const root = this.endpoint(person.id),
      etag = this.value()!.etag;
    const upload = await this.auth.api<Upload>(
      root + (this.area() === 'compliance' ? '/uploads' : '/onboarding-uploads'),
      {
        name: file.name,
        content_type: type,
        size: file.size,
        sha256,
        category,
        ...(replacesId ? { replaces_id: replacesId } : {}),
      },
      'POST',
      {
        'If-Match': etag,
        'Idempotency-Key': this.key(
          `upload:${person.id}:${sha256}:${category}:${replacesId}:${etag}`,
        ),
      },
    );
    if (scope !== this.scope() || generation !== this.generation)
      throw Error('The selected workspace or staff record changed during upload.');
    this.lastUploadEtag = upload.staff_etag ?? '';
    const base = root + this.filePath() + '/' + upload.id;
    try {
      for (let offset = 0, position = 0; offset < bytes.byteLength; offset += 262144, position++) {
        if (scope !== this.scope() || generation !== this.generation)
          throw Error('The workspace changed during upload.');
        let binary = '';
        for (const byte of new Uint8Array(bytes.slice(offset, offset + 262144)))
          binary += String.fromCharCode(byte);
        await this.auth.api(base + '/chunks/' + position, { content: btoa(binary) }, 'POST');
      }
      let value = await this.auth.api<Upload>(base + '/finalise', {}, 'POST', {
        'If-Match': upload.etag,
        'Idempotency-Key': this.key(`finalise:${upload.id}`),
      });
      for (let attempt = 0; value.state === 'quarantined' && attempt < 20; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (scope !== this.scope() || generation !== this.generation)
          throw Error('The workspace changed during scanning.');
        value = await this.auth.api<Upload>(base);
      }
      if (value.state !== 'clean')
        throw Error(
          value.state === 'quarantined'
            ? 'The document is saved and awaiting security scanning. Verification is unavailable until scanning completes.'
            : 'This document failed security scanning.',
        );
    } finally {
      if (scope === this.scope() && generation === this.generation)
        await this.load(person.id, true);
    }
    if (scope !== this.scope() || this.person()?.id !== person.id)
      throw Error('The workspace or selected staff record changed during upload.');
    if (this.value()?.etag !== this.lastUploadEtag)
      throw Error('This staff record changed during upload. Reload before saving further edits.');
    const document = this.person()?.documents?.find((d) => d.id === upload.id);
    if (!document) throw Error('Reload the staff documents to inspect the uploaded file.');
    return document;
  }
  async file(id: string): Promise<Blob> {
    const person = this.person();
    if (!person) throw Error('Reload the staff record.');
    const scope = this.scope(),
      generation = this.generation;
    const blob = await this.auth.api<Blob>(
      this.endpoint(person.id) + `${this.filePath()}/${id}/download`,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (scope !== this.scope() || generation !== this.generation)
      throw Error('The workspace changed during download.');
    return blob;
  }
}
