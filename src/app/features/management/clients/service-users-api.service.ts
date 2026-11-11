import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { RotaClient } from '../rota/rota.models';
import type {
  ServiceUser,
  ServiceUserPage,
  ServiceUserSummary,
  ServiceUserFacets,
  ServiceUserWrite,
  ServiceUserPhoto,
  ServiceUserOverview,
  ServiceUserDemographics,
  ServiceUserFamily,
  ServiceUserCarePlan,
  ServiceUserRecordSection,
} from './service-users.generated';
export type DirectoryUser = RotaClient & {
  company_id: string;
  version: number;
  etag: string;
  photo_id: string | null;
  primary_needs: string[];
  packages: ServiceUser['packages'];
  next_visit: ServiceUser['next_visit'];
};
@Injectable({ providedIn: 'root' })
export class ServiceUsersApi {
  readonly access = inject(CompanyAccessService);
  private readonly auth = inject(AuthService);
  readonly companyId = this.access.companyId;
  readonly allowed = computed(() => this.access.can('care', 'records', 'read'));
  readonly scope = computed(() => {
    const context = this.access.context();
    return JSON.stringify({
      actor: this.auth.profile()?.id ?? '',
      company: this.companyId(),
      allowed: this.allowed(),
      context: context
        ? {
            company: context.company_id,
            active: context.company_active,
            platform: context.platform,
            revision: context.revision,
            modules: [...(context.enabled_modules ?? [])].sort(),
            permissions: [...(context.permissions ?? [])].sort(),
            roles: (context.roles ?? []).map((role) => role.id).sort(),
          }
        : null,
    });
  });
  readonly directory = signal<ServiceUserPage | null>(null);
  readonly rows = signal<DirectoryUser[]>([]);
  readonly selected = signal<DirectoryUser | null>(null);
  readonly summary = signal<ServiceUserSummary | null>(null);
  readonly facets = signal<ServiceUserFacets | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly error = signal('');
  readonly exportBusy = signal(false);
  readonly saving = signal(false);
  private destroyed = false;
  private generation = 0;
  private detailGeneration = 0;
  private photoUrls = new Set<string>();
  private readonly intents = new Map<string, string>();
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.clear();
    });
    effect(() => {
      this.scope();
      untracked(() => this.clear());
    });
  }
  private clear(): void {
    this.generation++;
    this.detailGeneration++;
    this.directory.set(null);
    this.rows.set([]);
    this.selected.set(null);
    this.summary.set(null);
    this.facets.set(null);
    this.error.set('');
    this.loading.set(false);
    this.detailLoading.set(false);
    this.saving.set(false);
    this.exportBusy.set(false);
    for (const url of this.photoUrls) URL.revokeObjectURL(url);
    this.photoUrls.clear();
    this.intents.clear();
  }
  private root(): string {
    if (!this.allowed() || !this.companyId()) throw Error('Service user records are unavailable.');
    return `/companies/${this.companyId()}`;
  }
  private current(scope: string): boolean {
    return !this.destroyed && scope === this.scope() && this.allowed();
  }
  private validate<T extends { company_id: string }>(value: T): T {
    if (value.company_id !== this.companyId())
      throw Error('The returned record does not match this company.');
    return value;
  }
  private project(value: ServiceUser): DirectoryUser {
    this.validate(value);
    return {
      ...value,
      funding: value.funding as RotaClient['funding'],
      priority: value.priority as RotaClient['priority'],
      representative: {
        name: value.representative.name ?? '',
        relationship: value.representative.relationship ?? '',
        phone: value.representative.phone ?? '',
        email: value.representative.email ?? '',
      },
      riskFlags: value.riskFlags as RotaClient['riskFlags'],
      file: {
        details: Object.fromEntries(Object.entries(value.details).map(([k, v]) => [k, v ?? ''])),
        sections: {},
        entries: {},
        updatedAt: '',
      },
    };
  }
  private projectOverview(value: ServiceUserOverview): DirectoryUser {
    const row = this.project(value.record),
      c = value.clinical;
    row.overview = value;
    row.file!.sections = {
      diagnoses: {
        primary: c.primary_diagnosis,
        diet: c.diet,
        ongoing: c.ongoing,
        communication: c.communication,
        hearing: c.hearing,
        vision: c.vision,
        sensory: c.sensory,
      },
      moving: {
        equipment: c.equipment,
        support: c.mobility_support,
        instructions: c.mobility_instructions,
      },
      capacity: {
        status: value.capacity.status,
        assessed: value.capacity.assessed_on ?? '',
        support: c.decision_support,
        welfareLpa: c.welfare_lpa,
        financeLpa: c.finance_lpa,
      },
      support: {
        personal: c.personal,
        nutrition: c.nutrition,
        continence: c.continence,
        safety: c.safety,
        behaviour: c.behaviour,
        continuity: c.continuity,
      },
      family: { approved: value.family.approved, preferences: value.family.preferences },
      consent: { family: value.family.sharing_consent },
      access: { location: c.key_safe_location },
    };
    for (const section of value.workspace.sections) {
      this.validate(section);
      if (section.id !== row.id)
        throw Error('The record section does not match this service user.');
      row.file!.sections[section.key] = Object.fromEntries(
        section.fields.map((field) => [field.key, field.value]),
      );
      row.file!.entries[section.key] = section.entries.map((entry) => ({
        ...entry,
        date: entry.date ?? '',
        level: entry.level as 'Low' | 'Medium' | 'High',
        status: entry.status as 'Active' | 'Completed' | 'Inactive',
      }));
    }
    const consent = row.file!.sections['consent']?.['family'];
    row.file!.sections['family']['sharingConsent'] = [
      consent && consent !== 'Not recorded' ? consent : '',
      value.family.sharing_consent,
    ]
      .filter(Boolean)
      .join(' · ');
    if (value.care_plan) {
      row.file!.sections['plan'] = Object.fromEntries(
        Object.entries(value.care_plan.plan).map(([key, item]) => [key, item ?? '']),
      );
      row.file!.entries['plan'] = value.care_plan.goals.map((goal) => ({
        ...goal,
        date: goal.date ?? '',
        level: goal.level as 'Low' | 'Medium' | 'High',
        status: goal.status as 'Active' | 'Completed' | 'Inactive',
      }));
    }
    return row;
  }
  async saveCard(
    card: string,
    body: unknown,
    original: DirectoryUser,
    scope: string,
  ): Promise<DirectoryUser> {
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    if (!this.access.can('care', 'records', 'edit'))
      throw Error('You do not have permission to edit this service user.');
    const value = await this.auth.api<ServiceUserOverview>(
      `${this.root()}/service-users/${original.id}/overview/${card}`,
      body,
      'PATCH',
      { 'If-Match': original.etag },
    );
    if (!this.current(scope)) throw Error('The workspace changed. Reload the record.');
    if (value.record.id !== original.id)
      throw Error('The saved service user does not match the requested record.');
    const row = this.projectOverview(value);
    if (row.photo_id === original.photo_id && original.file?.photo)
      row.file!.photo = original.file.photo;
    this.selected.set(row);
    if (row.photo_id && !row.file?.photo)
      void this.loadPhoto(
        row,
        scope,
        () => this.selected()?.id === row.id && this.selected()?.photo_id === row.photo_id,
      );
    return row;
  }
  async getRecordSection(id: string, section: string): Promise<ServiceUserRecordSection> {
    const scope = this.scope();
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    const value = await this.auth.api<ServiceUserRecordSection>(
      `${this.root()}/service-users/${id}/record-sections/${section}`,
    );
    if (!this.current(scope) || value.id !== id || value.key !== section)
      throw Error('The workspace changed. Reopen the form.');
    this.validate(value);
    return value;
  }
  async saveRecordSection(
    body: unknown,
    original: DirectoryUser,
    etag: string,
    scope: string,
    section: string,
    entryId?: string | null,
    key?: string,
  ): Promise<DirectoryUser> {
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    const owner =
      ({ risks: 'risks', medication: 'medication', tasks: 'recording' } as Record<string, string>)[
        section
      ] ?? 'records';
    const action = entryId === null ? 'create' : 'edit';
    if (!this.access.can('care', owner, action))
      throw Error('You do not have permission to change this record.');
    const suffix = entryId === undefined ? '' : '/entries' + (entryId ? '/' + entryId : '');
    const value = await this.auth.api<ServiceUserOverview>(
      `${this.root()}/service-users/${original.id}/record-sections/${section}${suffix}`,
      body,
      entryId === null ? 'POST' : 'PATCH',
      { 'If-Match': etag, ...(entryId === null ? { 'Idempotency-Key': key! } : {}) },
    );
    if (!this.current(scope) || this.selected()?.id !== original.id)
      throw Error('The workspace changed. Reload the record.');
    if (value.record.id !== original.id)
      throw Error('The saved record does not match the requested service user.');
    const row = this.projectOverview(value);
    if (row.photo_id === original.photo_id && original.file?.photo)
      row.file!.photo = original.file.photo;
    this.selected.set(row);
    if (row.photo_id && !row.file?.photo)
      void this.loadPhoto(
        row,
        scope,
        () => this.selected()?.id === row.id && this.selected()?.photo_id === row.photo_id,
      );
    return row;
  }
  async recordSummary(id: string): Promise<DirectoryUser> {
    const scope = this.scope();
    if (!this.current(scope) || !this.access.can('care', 'records', 'export'))
      throw Error('Service user export permission is required.');
    const value = await this.auth.api<ServiceUserOverview>(
      `${this.root()}/service-users/${id}/record-summary`,
    );
    if (!this.current(scope) || value.record.id !== id || this.selected()?.id !== id)
      throw Error('The workspace changed. Reopen the care summary.');
    return this.projectOverview(value);
  }
  async getCarePlan(id: string): Promise<ServiceUserCarePlan> {
    const scope = this.scope();
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    const value = await this.auth.api<ServiceUserCarePlan>(
      `${this.root()}/service-users/${id}/care-plan`,
    );
    if (!this.current(scope) || value.id !== id)
      throw Error('The workspace changed. Reopen the form.');
    this.validate(value);
    return value;
  }
  async saveCarePlan(
    body: unknown,
    original: DirectoryUser,
    etag: string,
    scope: string,
    goalId?: string | null,
    key?: string,
  ): Promise<DirectoryUser> {
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    const action = goalId === null ? 'create' : 'edit';
    if (!this.access.can('care', 'planning', action))
      throw Error('Care Planning permission is required.');
    const suffix = goalId === undefined ? '' : '/goals' + (goalId ? '/' + goalId : '');
    const value = await this.auth.api<ServiceUserOverview>(
      `${this.root()}/service-users/${original.id}/care-plan${suffix}`,
      body,
      goalId === null ? 'POST' : 'PATCH',
      { 'If-Match': etag, ...(goalId === null ? { 'Idempotency-Key': key! } : {}) },
    );
    if (!this.current(scope) || this.selected()?.id !== original.id)
      throw Error('The workspace changed. Reload the record.');
    if (value.record.id !== original.id)
      throw Error('The saved service user does not match the requested record.');
    const row = this.projectOverview(value);
    if (row.photo_id === original.photo_id && original.file?.photo)
      row.file!.photo = original.file.photo;
    this.selected.set(row);
    if (row.photo_id && !row.file?.photo)
      void this.loadPhoto(
        row,
        scope,
        () => this.selected()?.id === row.id && this.selected()?.photo_id === row.photo_id,
      );
    return row;
  }
  async getDemographics(id: string): Promise<ServiceUserDemographics> {
    const scope = this.scope();
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    const value = await this.auth.api<ServiceUserDemographics>(
      `${this.root()}/service-users/${id}/demographics`,
    );
    if (!this.current(scope) || value.id !== id)
      throw Error('The workspace changed. Reopen the form.');
    this.validate(value);
    return value;
  }
  async getFamily(id: string): Promise<ServiceUserFamily> {
    const scope = this.scope();
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    const value = await this.auth.api<ServiceUserFamily>(
      `${this.root()}/service-users/${id}/family`,
    );
    if (!this.current(scope) || value.id !== id)
      throw Error('The workspace changed. Reopen the form.');
    this.validate(value);
    return value;
  }
  async saveFamily(
    body: unknown,
    original: DirectoryUser,
    etag: string,
    scope: string,
  ): Promise<DirectoryUser> {
    return this.saveSource('family', body, original, etag, scope);
  }
  async saveDemographics(
    body: unknown,
    original: DirectoryUser,
    etag: string,
    scope: string,
  ): Promise<DirectoryUser> {
    return this.saveSource('demographics', body, original, etag, scope);
  }
  private async saveSource(
    source: 'demographics' | 'family',
    body: unknown,
    original: DirectoryUser,
    etag: string,
    scope: string,
  ): Promise<DirectoryUser> {
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    if (!this.access.can('care', 'records', 'edit'))
      throw Error('You do not have permission to edit this service user.');
    const value = await this.auth.api<ServiceUserOverview>(
      `${this.root()}/service-users/${original.id}/${source}`,
      body,
      'PATCH',
      { 'If-Match': etag },
    );
    if (!this.current(scope) || this.selected()?.id !== original.id)
      throw Error('The workspace changed. Reload the record.');
    if (value.record.id !== original.id)
      throw Error('The saved service user does not match the requested record.');
    const row = this.projectOverview(value);
    if (row.photo_id === original.photo_id && original.file?.photo)
      row.file!.photo = original.file.photo;
    this.selected.set(row);
    if (row.photo_id && !row.file?.photo)
      void this.loadPhoto(
        row,
        scope,
        () => this.selected()?.id === row.id && this.selected()?.photo_id === row.photo_id,
      );
    return row;
  }
  async savePhoto(
    draft: RotaClient,
    original: DirectoryUser,
    scope: string,
  ): Promise<DirectoryUser> {
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    if (this.saving()) throw Error('A save is already in progress.');
    if (!this.access.can('care', 'records', 'edit'))
      throw Error('You do not have permission to change this photo.');
    const image = draft.file?.photo;
    this.saving.set(true);
    try {
      let photo = original.photo_id;
      if (image === '') photo = null;
      else if (image?.startsWith('data:')) photo = await this.upload(image, scope, draft.id);
      return await this.saveCard('photo', { photo_id: photo }, original, scope);
    } finally {
      if (this.current(scope)) this.saving.set(false);
    }
  }

  async load(query: string): Promise<void> {
    const scope = this.scope(),
      generation = ++this.generation;
    this.directory.set(null);
    this.rows.set([]);
    this.summary.set(null);
    this.facets.set(null);
    this.error.set('');
    this.loading.set(true);
    try {
      const root = this.root();
      const [page, summary, facets] = await Promise.all([
        this.auth.api<ServiceUserPage>(`${root}/service-users?${query}`),
        this.auth.api<ServiceUserSummary>(`${root}/service-users/summary`),
        this.auth.api<ServiceUserFacets>(`${root}/service-users/facets`),
      ]);
      if (!this.current(scope) || generation !== this.generation) return;
      this.validate(page.meta);
      this.validate(summary);
      this.validate(facets);
      const rows = page.results.map((row) => this.project(row));
      this.directory.set(page);
      this.rows.set(rows);
      this.summary.set(summary);
      this.facets.set(facets);
      for (const row of rows)
        if (row.photo_id) void this.loadPhoto(row, scope, () => generation === this.generation);
    } catch (error) {
      if (this.current(scope) && generation === this.generation)
        this.error.set(
          error instanceof Error ? error.message : 'Service user information is unavailable.',
        );
    } finally {
      if (this.current(scope) && generation === this.generation) this.loading.set(false);
    }
  }
  async detail(id: string, retainCurrent = false): Promise<void> {
    const scope = this.scope(),
      generation = ++this.detailGeneration;
    if (!retainCurrent || this.selected()?.id !== id) this.selected.set(null);
    this.error.set('');
    this.detailLoading.set(true);
    try {
      const value = await this.auth.api<ServiceUserOverview>(
        `${this.root()}/service-users/${id}/overview`,
      );
      if (!this.current(scope) || generation !== this.detailGeneration) return;
      if (value.record.id !== id)
        throw Error('The returned service user does not match the requested record.');
      const row = this.projectOverview(value);
      this.selected.set(row);
      if (row.photo_id) void this.loadPhoto(row, scope, () => generation === this.detailGeneration);
    } catch (error) {
      if (this.current(scope) && generation === this.detailGeneration) {
        this.selected.set(null);
        this.error.set(
          error instanceof Error ? error.message : 'This service user is unavailable.',
        );
      }
    } finally {
      if (this.current(scope) && generation === this.detailGeneration)
        this.detailLoading.set(false);
    }
  }
  private async loadPhoto(
    row: DirectoryUser,
    scope: string,
    current: () => boolean,
  ): Promise<void> {
    try {
      const blob = await this.auth.api<Blob>(
        `${this.root()}/service-users/${row.id}/photo`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      if (!this.current(scope) || !current()) return;
      const matches = (candidate: DirectoryUser | null) =>
        !!candidate &&
        candidate.id === row.id &&
        candidate.photo_id === row.photo_id &&
        candidate.version === row.version;
      if (!matches(this.selected()) && !this.rows().some(matches)) return;
      const url = URL.createObjectURL(blob);
      this.photoUrls.add(url);
      const withPhoto = (candidate: DirectoryUser) => ({
        ...candidate,
        file: { ...candidate.file!, photo: url },
      });
      this.rows.update((rows) =>
        rows.map((candidate) => (matches(candidate) ? withPhoto(candidate) : candidate)),
      );
      const selected = this.selected();
      if (matches(selected)) this.selected.set(withPhoto(selected!));
    } catch {
      /* The record remains available using its initials. */
    }
  }
  private key(intent: string): string {
    if (!this.intents.has(intent)) this.intents.set(intent, crypto.randomUUID());
    return this.intents.get(intent)!;
  }
  private async upload(data: string, scope: string, intent: string): Promise<string> {
    const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!match) throw Error('Choose a valid JPEG or PNG.');
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    if (!bytes.length || bytes.length > 1048576) throw Error('Choose a photo up to 1 MB.');
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
    const root = this.root();
    let photo = await this.auth.api<ServiceUserPhoto>(
      `${root}/service-user-photos`,
      {
        name: `profile.${match[1] === 'image/png' ? 'png' : 'jpg'}`,
        content_type: match[1],
        size: bytes.length,
        digest,
      },
      'POST',
      { 'Idempotency-Key': this.key('photo:' + intent + ':' + digest) },
    );
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    this.validate(photo);
    if (photo.state === 'Uploading') {
      for (let offset = 0; offset < bytes.length; offset += 262144) {
        const chunk = bytes.slice(offset, offset + 262144);
        let binary = '';
        for (const byte of chunk) binary += String.fromCharCode(byte);
        await this.auth.api(
          `${root}/service-user-photos/${photo.id}/chunks/${offset / 262144}`,
          { content: btoa(binary) },
          'POST',
          { 'If-Match': photo.etag },
        );
        if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
      }
      photo = await this.auth.api<ServiceUserPhoto>(
        `${root}/service-user-photos/${photo.id}/finalise`,
        {},
        'POST',
        { 'If-Match': photo.etag },
      );
    }
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    this.validate(photo);
    if (photo.state !== 'Clean')
      throw Error('The photo did not pass the security scan. Choose another photo.');
    return photo.id;
  }
  async save(
    draft: RotaClient,
    original: DirectoryUser | null,
    scope: string,
  ): Promise<DirectoryUser> {
    if (this.saving()) throw Error('A service user save is already in progress.');
    if (!this.current(scope)) throw Error('The workspace changed. Reopen the form.');
    if (!this.access.can('care', 'records', original ? 'edit' : 'create'))
      throw Error('You do not have permission to save this service user.');
    draft = structuredClone(draft);
    this.saving.set(true);
    try {
      let photo = original?.photo_id ?? null;
      if (draft.file?.photo === '') photo = null;
      else if (draft.file?.photo?.startsWith('data:'))
        photo = await this.upload(draft.file.photo, scope, draft.id);
      const details = { ...draft.file?.details };
      if (!details['dob']) delete details['dob'];
      const body: ServiceUserWrite = {
        name: draft.name,
        reference: draft.reference,
        address: draft.address,
        postcode: draft.postcode,
        funding: draft.funding,
        priority: draft.priority,
        active: draft.active,
        phone: draft.phone ?? '',
        email: draft.email ?? '',
        details,
        representative: {
          name: draft.representative?.name ?? '',
          relationship: draft.representative?.relationship ?? '',
          phone: draft.representative?.phone ?? '',
          email: draft.representative?.email ?? '',
        },
        riskFlags: draft.riskFlags ?? [],
        photo_id: photo,
      };
      const root = this.root();
      const value = await this.auth.api<ServiceUser>(
        `${root}/service-users${original ? '/' + original.id : ''}`,
        body,
        original ? 'PATCH' : 'POST',
        original
          ? { 'If-Match': original.etag }
          : { 'Idempotency-Key': this.key('create:' + draft.id) },
      );
      if (!this.current(scope))
        throw Error('The workspace changed. Reload to see the saved record.');
      if (original && value.id !== original.id)
        throw Error('The saved record does not match the requested service user.');
      const row = original?.overview
        ? this.projectOverview({ ...original.overview, record: value })
        : this.project(value);
      if (row.photo_id === original?.photo_id && original?.file?.photo)
        row.file!.photo = original.file.photo;
      this.selected.set(row);
      if (row.photo_id && !row.file?.photo)
        void this.loadPhoto(
          row,
          scope,
          () => this.selected()?.id === row.id && this.selected()?.photo_id === row.photo_id,
        );
      return row;
    } finally {
      if (this.current(scope)) this.saving.set(false);
    }
  }
  async export(query: string): Promise<void> {
    if (this.exportBusy() || !this.access.can('care', 'records', 'export')) return;
    const scope = this.scope();
    this.exportBusy.set(true);
    this.error.set('');
    const params = new URLSearchParams(query);
    params.delete('page');
    params.delete('page_size');
    try {
      const blob = await this.auth.api<Blob>(
        `${this.root()}/service-users/export?${params}`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      if (!this.current(scope) || !this.access.can('care', 'records', 'export')) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = 'service-users.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      if (this.current(scope))
        this.error.set(
          error instanceof Error ? error.message : 'Service user export is unavailable.',
        );
    } finally {
      if (this.current(scope)) this.exportBusy.set(false);
    }
  }
}
