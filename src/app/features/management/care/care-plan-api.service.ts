import { Injectable, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CareDocumentsApi } from './care-documents-api.service';
import { CareService } from './care.service';
import { CarePlanRecord, PlanVersion } from './care-plan.models';
import { RotaClient } from '../rota/rota.models';
import type { ServiceUserOverview } from '../clients/service-users.generated';
import type { CarePlanWorkspaceRead, CarePlanRegisterRead } from './care-plan.generated';

@Injectable()
export class CarePlanApi {
  readonly connected = true;
  private readonly records = inject(ServiceUsersApi);
  private readonly auth = inject(AuthService);
  private readonly documentsApi = inject(CareDocumentsApi);
  readonly scope = this.records.scope;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal('');
  readonly unavailable = signal<string[]>([]);
  private readonly denied = signal(false);
  private readonly target = signal<string | null>(null);
  private readonly source = signal<CarePlanWorkspaceRead | null>(null);
  private readonly selectedClient = signal<RotaClient | null>(null);
  readonly registerRows = signal<any[]>([]);
  readonly registerMetrics = signal<{
    users: number;
    awaiting: number;
    approved: number;
    overdue: number;
  } | null>(null);
  private generation = 0;
  private destroyed = false;
  private intents = new Map<string, string>();
  private urls = new Set<string>();
  private photoUrls = new Map<string, string>();
  readonly care = {
    auth: this.auth,
    store: { companyId: this.records.companyId, staff: () => [] },
    clients: computed(() => (this.selectedClient() ? [this.selectedClient()!] : [])),
    client: (id: string) => (this.selectedClient()?.id === id ? this.selectedClient()! : undefined),
    rota: {
      data: computed(() => ({
        clients: this.selectedClient() ? [this.selectedClient()!] : [],
        calls: this.source()?.calls ?? [],
        visits: [],
        audit: [],
      })),
      can: (action: string) =>
        action === 'view'
          ? this.canRead()
          : action === 'manage'
            ? this.canEdit()
            : this.can(action),
    },
    documents: (id: string) =>
      this.selectedClient()?.id === id ? this.documentsApi.documents() : [],
    canManageDocuments: () => this.records.access.can('care', 'documents', 'create'),
  } as unknown as CareService;
  constructor() {
    effect(() => {
      const scope = this.scope(),
        target = this.target();
      untracked(() => {
        this.generation++;
        this.clear();
        this.denied.set(false);
        this.intents.clear();
        if (target !== null) {
          if (this.canRead()) void this.load(target, scope);
          else
            this.error.set(
              'Care plans are unavailable. Care-plan and service-user read permissions are required.',
            );
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
      this.clear();
    });
  }
  private clear() {
    this.source.set(null);
    this.selectedClient.set(null);
    this.registerRows.set([]);
    this.registerMetrics.set(null);
    this.unavailable.set([]);
    this.error.set('');
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls.clear();
    this.photoUrls.clear();
  }
  connect(id = '') {
    untracked(() => {
      this.denied.set(false);
      if (this.target() === id) {
        if (this.canRead()) void this.load(id);
      } else this.target.set(id);
    });
  }
  canRead() {
    return (
      !this.denied() &&
      this.records.allowed() &&
      this.records.access.can('care', 'planning', 'read')
    );
  }
  can(action: string) {
    return this.canRead() && this.records.access.can('care', 'planning', action);
  }
  canEdit() {
    return this.can('edit') || this.can('create') || this.can('approve');
  }
  canManageHandoffs() {
    return this.records.access.can('care', 'rostering', 'edit');
  }
  canApprove() {
    return this.can('approve');
  }
  read(id: string): CarePlanRecord | undefined {
    return this.canRead() && this.source()?.id === id
      ? (this.source()!.record as unknown as CarePlanRecord)
      : undefined;
  }
  readonly handoffRows = computed(() => {
    const client = this.selectedClient();
    if (client)
      return (client.file?.carePlan?.packageHandoffs || []).map((handoff) => ({
        client,
        handoff,
        revision: client.file!.carePlan!.revision,
      }));
    return this.registerRows().flatMap((row) =>
      (row.handoffs || []).map((handoff: any) => ({
        client: row.client,
        handoff,
        revision: row.revision,
      })),
    );
  });
  private root(id = '') {
    return `/companies/${this.records.companyId()}/care-plans${id ? '/' + id : ''}`;
  }
  private current(scope: string) {
    return !this.destroyed && scope === this.scope() && this.canRead();
  }
  private async request<T>(
    path: string,
    body?: unknown,
    method?: 'POST' | 'PATCH',
    headers?: Record<string, string>,
  ): Promise<T> {
    const scope = this.scope();
    try {
      return await this.auth.api<T>(path, body, method, headers);
    } catch (error) {
      if (scope === this.scope() && [401, 403].includes((error as any)?.status)) {
        this.clear();
        this.denied.set(true);
      }
      throw error;
    }
  }
  private check<T extends { company_id: string }>(value: T, scope: string): T {
    if (!this.current(scope) || value.company_id !== this.records.companyId())
      throw Error('The care-plan workspace changed. Reopen the record.');
    return value;
  }
  private apply(value: CarePlanWorkspaceRead, id: string, scope: string) {
    this.check(value, scope);
    if (value.id !== id) throw Error('The care-plan response belongs to another person.');
    const overview = value.source['overview'] as unknown as ServiceUserOverview;
    if (
      overview.record.id !== id ||
      overview.record.company_id !== value.company_id ||
      overview.record.version !== value.record.revision
    )
      throw Error('The care plan and service-user sources changed. Reload the record.');
    const client = this.records.projectOverview(overview);
    client.file!.carePlan = value.record as unknown as CarePlanRecord;
    client.file!.contacts = (value.source['contacts'] || []) as any;
    client.file!.documents = this.records.access.can('care', 'documents', 'read')
      ? this.documentsApi.documents()
      : [];
    if (this.records.access.can('care', 'documents', 'export')) {
      for (const version of value.record.versions) {
        const details = version.details as Record<string, string>;
        if (details['aboutPhotoId'] && this.photoUrls.has(details['aboutPhotoId']))
          details['aboutPhoto'] = this.photoUrls.get(details['aboutPhotoId'])!;
        for (const observation of (version['body'] || []) as any[]) {
          if (observation.photoId && this.photoUrls.has(observation.photoId))
            observation.photo = this.photoUrls.get(observation.photoId)!;
        }
      }
    }
    this.source.set(value);
    this.selectedClient.set(client);
    this.unavailable.set(value.unavailable);
  }
  async load(id = this.target() || '', scope = this.scope()): Promise<void> {
    const generation = ++this.generation;
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls.clear();
    this.photoUrls.clear();
    this.loading.set(true);
    this.error.set('');
    try {
      if (id) {
        const value = this.check(await this.request<CarePlanWorkspaceRead>(this.root(id)), scope);
        if (generation !== this.generation) return;
        const attachmentErrors: string[] = [];
        if (this.records.access.can('care', 'documents', 'read')) {
          await this.documentsApi.load(id);
          if (!this.current(scope) || generation !== this.generation) return;
          if (this.records.access.can('care', 'documents', 'export')) {
            const photos = value.record.versions.flatMap((v) => [
              ...((v['body'] as any[]) || []),
              v.details as any,
            ]);
            for (const observation of photos) {
              if (!observation.photoId && !observation.aboutPhotoId) continue;
              const document = this.documentsApi
                .documents()
                .find((d) => d.id === (observation.photoId || observation.aboutPhotoId));
              if (!document) {
                attachmentErrors.push('A linked photograph is unavailable from Documents.');
                continue;
              }
              try {
                const blob = await this.documentsApi.content(id, document);
                if (!this.current(scope) || generation !== this.generation) return;
                const url = URL.createObjectURL(blob);
                this.urls.add(url);
                this.photoUrls.set(observation.photoId || observation.aboutPhotoId, url);
                if (observation.aboutPhotoId) observation.aboutPhoto = url;
                else observation.photo = url;
              } catch (error) {
                if (!this.current(scope) || generation !== this.generation) return;
                attachmentErrors.push(
                  error instanceof Error ? error.message : 'A care-plan photograph is unavailable.',
                );
                if ([401, 403].includes((error as any)?.status)) {
                  for (const url of this.urls) URL.revokeObjectURL(url);
                  this.urls.clear();
                  this.photoUrls.clear();
                  for (const item of photos) {
                    if (item.aboutPhotoId) delete item.aboutPhoto;
                    else item.photo = '';
                  }
                  break;
                }
              }
            }
          }
        }
        if (!this.current(scope) || generation !== this.generation) return;
        this.apply(value, id, scope);
        if (this.documentsApi.error()) attachmentErrors.push(this.documentsApi.error());
        if (attachmentErrors.length)
          this.unavailable.update((values) => [...values, ...new Set(attachmentErrors)]);
      } else {
        const root = this.root();
        let page = this.check(
          await this.request<CarePlanRegisterRead>(root + '?page_size=100'),
          scope,
        );
        const revision = page.meta['revision'],
          count = page.count,
          metrics = page.meta['metrics'];
        if (count > 2000) throw Error('Narrow the service-user directory to load care plans.');
        const rows = [...page.results],
          visited = new Set<string>();
        while (page.next) {
          if (generation !== this.generation) return;
          if (!page.next.startsWith(root + '?') || visited.has(page.next) || rows.length >= count)
            throw Error('Care-plan pagination is incomplete. Reload the register.');
          visited.add(page.next);
          page = this.check(await this.request<CarePlanRegisterRead>(page.next), scope);
          if (page.meta['revision'] !== revision || page.count !== count)
            throw Error('Care plans changed. Reload the register.');
          rows.push(...page.results);
        }
        if (generation !== this.generation) return;
        if (
          rows.length !== count ||
          new Set(rows.map((r) => (r['client'] as any).id)).size !== count
        )
          throw Error('Care-plan pagination is incomplete. Reload the register.');
        this.registerRows.set(rows);
        this.registerMetrics.set(metrics as any);
      }
    } catch (error) {
      if (!this.destroyed && scope === this.scope() && generation === this.generation) {
        this.source.set(null);
        this.selectedClient.set(null);
        this.registerRows.set([]);
        this.registerMetrics.set(null);
        this.error.set(error instanceof Error ? error.message : 'Care plans are unavailable.');
      }
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  private async mutate(
    id: string,
    workspace: string,
    suffix: string,
    body: unknown,
    revision?: number,
    method: 'POST' | 'PATCH' = 'POST',
  ): Promise<string | null> {
    if (this.saving() || this.uploading() || this.loading())
      return 'A care-plan change is already in progress.';
    if (workspace !== this.records.companyId() || this.source()?.id !== id || !this.canRead())
      return 'The workspace changed. Reopen the care plan.';
    const scope = this.scope(),
      generation = this.generation,
      path = this.root(id) + suffix;
    const intent = scope + path + JSON.stringify(body);
    if (!this.intents.has(intent)) this.intents.set(intent, crypto.randomUUID());
    this.saving.set(true);
    try {
      const value = this.check(
        await this.request<CarePlanWorkspaceRead>(path, body, method, {
          'If-Match': revision === undefined ? this.source()!.etag : `"v${revision}"`,
          'Idempotency-Key': this.intents.get(intent)!,
        }),
        scope,
      );
      if (generation !== this.generation || this.source()?.id !== id)
        return 'The care-plan view changed while saving. Reopen the record to see the saved result.';
      this.apply(value, id, scope);
      this.intents.delete(intent);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'The care-plan change could not be saved.';
    } finally {
      this.saving.set(false);
    }
  }
  initialise(id: string, workspace: string) {
    if (!this.can('create')) return Promise.resolve('Care-plan creation permission is required.');
    return this.mutate(id, workspace, '', {
      reason: 'Create a versioned care-plan draft from existing records',
    });
  }
  private draftBody(plan: PlanVersion, reason: string) {
    return {
      source_token: this.source()!.source_token,
      review: plan.review || null,
      confirmed: plan.confirmed,
      details: Object.fromEntries(
        Object.entries(plan.details).filter(([key, value]) => key !== 'aboutPhoto' || value === ''),
      ),
      participation: plan.participation,
      capacity: plan.capacity,
      packageDecision: plan.packageDecision,
      packageProposal: plan.packageProposal,
      qualityReview: plan.qualityReview,
      sections: plan.sections.map((s) => ({ ...s, review: s.review || null })),
      assessments: plan.assessments.map((a) => ({
        id: a.id || null,
        name: a.name,
        section: a.section,
        findings: a.findings,
        action: a.action,
        review: a.review || null,
        status: a.status,
        fields: a.fields || {},
      })),
      body: plan.body.map((b) => ({
        id: b.id || null,
        view: b.view,
        x: b.x,
        y: b.y,
        date: b.date,
        status: b.status,
        photo: (b as any).photoId || null,
        location: b.location,
        type: b.type,
        description: b.description,
        size: b.size,
        pain: b.pain,
        issue: b.issue,
        action: b.action,
        professional: b.professional,
        related: b.related,
      })),
      decisions: (plan.reviewReport?.findings || [])
        .filter((f) => f.decision !== 'Pending')
        .map((f) => ({ key: f.id, decision: f.decision, rationale: f.rationale })),
      reason: reason || 'Save the entered care-plan draft and review decisions',
    };
  }
  async commit(
    id: string,
    workspace: string,
    draft: PlanVersion,
    revision: number,
    action: 'save' | 'submit' | 'approve' | 'return' | 'review' | 'package',
    reason = '',
    _signature?: { name: string; confirmed: boolean },
  ): Promise<string | null> {
    if (workspace !== this.records.companyId() || this.source()?.id !== id || !this.canRead())
      return 'The workspace changed. Reopen the care plan.';
    if (this.saving() || this.uploading() || this.loading())
      return 'A care-plan change is already in progress.';
    if ((action === 'save' || action === 'submit') && !this.can('edit'))
      return 'Care-plan edit permission is required.';
    if (
      (action === 'save' || action === 'submit') &&
      draft.details['aboutPhoto']?.startsWith('data:')
    ) {
      try {
        const data = draft.details['aboutPhoto'],
          match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(data);
        if (!match) return 'Choose a JPG, PNG or WebP photograph.';
        const binary = atob(match[2]);
        if (binary.length > 1048576) return 'Choose a photograph up to 1 MB.';
        const file = new File(
          [Uint8Array.from(binary, (c) => c.charCodeAt(0))],
          'care-plan-photo.' + match[1].split('/')[1],
          { type: match[1] },
        );
        const photo = await this.uploadPhoto(id, file, 'Care Plan Photo');
        draft.details['aboutPhotoId'] = photo.photoId;
        draft.details['aboutPhoto'] = photo.photo;
      } catch (error) {
        return error instanceof Error ? error.message : 'The photograph could not be saved.';
      }
    }
    if (action === 'return' && !reason.trim()) return 'Enter a reason for returning this plan.';
    if (draft.details['aboutPhoto'] === '') delete draft.details['aboutPhotoId'];
    if (action === 'save')
      return this.mutate(
        id,
        workspace,
        `/versions/${draft.id}`,
        this.draftBody(draft, reason),
        revision,
        'PATCH',
      );
    if (action === 'submit') {
      const saved = await this.mutate(
        id,
        workspace,
        `/versions/${draft.id}`,
        this.draftBody(draft, reason),
        revision,
        'PATCH',
      );
      if (saved) return saved;
      revision = this.read(id)!.revision;
    }
    return this.mutate(
      id,
      workspace,
      `/versions/${draft.id}/${action}`,
      {
        reason: reason || `Record care-plan ${action}`,
        source_token: this.source()!.source_token,
        ...(action === 'approve'
          ? {
              signature_name: _signature?.name || '',
              signature_confirmed: _signature?.confirmed || false,
            }
          : {}),
      },
      revision,
    );
  }
  async advancePackageHandoff(
    id: string,
    workspace: string,
    handoffId: string,
    revision: number,
    note: string,
  ) {
    const register = this.target() === '';
    if (this.source()?.id !== id) await this.load(id);
    if (!this.read(id)) return this.error() || 'The care plan is unavailable.';
    const handoff = this.read(id)!.packageHandoffs?.find((row) => row.id === handoffId);
    if (!handoff) return 'The care-package handoff is unavailable.';
    if (handoff.status === 'Awaiting rota update' && !note.trim())
      return 'Enter a completion note describing the rota change.';
    const result = await this.mutate(
      id,
      workspace,
      `/handoffs/${handoffId}`,
      { reason: note || 'Send the authorised recommendation to the rota queue' },
      revision,
    );
    if (register) await this.load('');
    return result;
  }
  async download(id: string, version: string) {
    if (!this.can('export')) throw Error('Care-plan export permission is required.');
    const scope = this.scope();
    let blob: Blob;
    try {
      blob = await this.auth.api<Blob>(
        this.root(id) + `/versions/${version}/pdf`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
    } catch (error) {
      if (scope === this.scope() && [401, 403].includes((error as any)?.status)) {
        this.clear();
        this.denied.set(true);
      }
      throw error;
    }
    if (!this.current(scope)) throw Error('The workspace changed during the export.');
    const url = URL.createObjectURL(blob),
      anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'care-plan.pdf';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async uploadPhoto(
    id: string,
    file: File,
    category = 'Body Chart',
  ): Promise<{ photo: string; photoId: string }> {
    const scope = this.scope();
    if (!this.current(scope) || this.source()?.id !== id || !this.can('edit'))
      throw Error('The workspace changed. Reopen the care plan.');
    if (this.uploading() || this.saving())
      throw Error('A care-plan change is already in progress.');
    const revision = this.read(id)!.revision;
    this.uploading.set(true);
    try {
      if (file.type === 'image/webp') {
        const bitmap = await createImageBitmap(file),
          canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        try {
          canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (value) =>
                value ? resolve(value) : reject(Error('The photograph could not be converted.')),
              'image/png',
            ),
          );
          if (blob.size > 1048576)
            throw Error('Choose a smaller photograph or upload a JPG or PNG.');
          file = new File([blob], 'care-plan-photo.png', { type: 'image/png' });
        } finally {
          bitmap.close();
        }
      }
      if (!this.current(scope) || this.source()?.id !== id)
        throw Error('The workspace changed during the photograph upload.');
      let row = await this.documentsApi.save(
        id,
        {
          name: file.name,
          category,
          version: '1.0',
          status: 'Current',
          issueDate: new Date().toISOString().slice(0, 10),
          reviewDate: '',
          description:
            category === 'Body Chart'
              ? 'Observation photograph recorded with consent'
              : 'Care-plan identity photograph',
        },
        { staff: true, family: false, inspector: false },
        null,
        file,
      );
      for (let attempt = 0; row.state === 'quarantined' && attempt < 15; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (!this.current(scope) || this.source()?.id !== id)
          throw Error('The workspace changed during the photograph scan.');
        row = await this.documentsApi.detail(id, row.id);
      }
      if (row.state !== 'clean')
        throw Error(
          row.state === 'quarantined'
            ? 'The photograph is still being scanned. Retry the same upload when scanning completes.'
            : 'The photograph did not pass the document scan. Choose another photograph.',
        );
      const blob = await this.documentsApi.content(id, row);
      if (!this.current(scope) || this.source()?.id !== id)
        throw Error('The workspace changed during the photograph upload.');
      const fresh = this.check(await this.request<CarePlanWorkspaceRead>(this.root(id)), scope);
      if (!this.current(scope) || this.source()?.id !== id || fresh.record.revision !== revision)
        throw Error(
          'The service-user record changed during the photograph upload. Reload and review it before saving.',
        );
      if (this.source()?.id === id)
        this.source.update((current) =>
          current ? { ...current, source_token: fresh.source_token } : current,
        );
      const photo = URL.createObjectURL(blob);
      this.urls.add(photo);
      this.photoUrls.set(row.id, photo);
      return { photo, photoId: row.id };
    } finally {
      this.uploading.set(false);
    }
  }
}
