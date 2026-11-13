import { Injectable, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { RotaData, RotaVisit, londonDate, londonInstant } from '../rota/rota.models';
import { EcmData, EcmEvidence, EcmRecord, EcmEscalation } from './ecm.models';
import type { EcmWorkspaceRead, EcmMutationRead, EcmMediaRead } from './ecm.generated';

const unavailableData = (): EcmData => ({
  lateMinutes: 0,
  riskMinutes: 0,
  missedMinutes: 0,
  styles: {},
  records: [],
  evidence: [],
  notifications: [],
  escalations: [],
  invoices: [],
  packs: [],
  feed: [],
});
@Injectable()
export class EcmApi {
  readonly connected = true;
  private readonly auth = inject(AuthService);
  readonly records = inject(ServiceUsersApi);
  readonly scope = this.records.scope;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly unavailable = signal<string[]>([]);
  readonly loadedAt = signal('');
  readonly denied = signal(false);
  private readonly target = signal<string | null>(null);
  private readonly raw = signal<any>(null);
  private generation = 0;
  private destroyed = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private intents = new Map<string, string>();
  private editVersions = new Map<string, string>();
  private urls = new Set<string>();
  readonly data = computed<EcmData>(() =>
    this.can('view') && this.raw() ? this.raw().data : unavailableData(),
  );
  readonly visits = computed<RotaVisit[]>(() =>
    this.can('view')
      ? (this.raw()?.results || []).map((v: any) => ({
          ...v,
          attendance: v.attendance.map((a: any) => ({ ...a, end: a.end || '' })),
          mileage: v.mileage === null ? undefined : Number(v.mileage),
          backupStaffId: v.backupStaffId || undefined,
          carers: v.carers || 0,
        }))
      : [],
  );
  readonly clients = computed(() => (this.can('view') ? this.raw()?.context?.clients || [] : []));
  readonly people = computed<any[]>(() =>
    this.can('view')
      ? (this.raw()?.context?.staff || []).map((p: any) => ({
          ...p,
          role: '',
          progress: {},
          email:
            p.id === this.raw()?.meta?.self_staff_id ? this.auth.currentUser()?.email || '' : '',
          hr: {
            personal: { gender: p.gender, driver: p.driver },
            employment: { hours: p.hours === null ? null : Number(p.hours) },
            training: p.training,
            availabilityRecorded: p.availabilityRecorded,
            availableDays: p.availableDays,
          },
        }))
      : [],
  );
  readonly members = computed<any[]>(() =>
    this.can('view') ? this.raw()?.meta?.owners || [] : [],
  );
  readonly trainingOptions = computed<any[]>(() =>
    this.can('view')
      ? (this.raw()?.meta?.training_options || []).map((v: any) => ({ id: v.code, title: v.title }))
      : [],
  );
  readonly rosterData = computed<RotaData>(() => ({
    clients: this.clients(),
    calls: this.raw()?.context?.calls || [],
    visits: this.visits(),
    audit: this.raw()?.context?.audit || [],
    travelMinutes: this.raw()?.context?.travelMinutes || 0,
    ecm: this.data(),
  }));
  readonly store = {
    company: computed(() => (this.can('view') ? this.raw()?.meta?.company || null : null)),
    companyId: this.records.companyId,
    staff: this.people,
    data: computed(() => ({
      people: this.people(),
      members: this.members(),
      leaves: this.raw()?.context?.leaves || [],
    })),
    initials: (name: string) =>
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join(''),
    download: (name: string, body: string, type = 'application/json') => {
      if (!this.can('export')) return;
      this.saveBlob(new Blob([body], { type }), name);
    },
  };
  readonly rota = {
    data: this.rosterData,
    can: (action: string) => this.can(action),
    conflicts: (_visit: unknown) => [
      'Current availability and training are checked by the server when saving.',
    ],
    allocate: (id: string, staffIds: string[], allocation: string, reason: string) =>
      this.allocate(id, staffIds, allocation, reason),
    sendToPayroll: (_date: string) =>
      'Payroll integration is not configured. Attendance is retained in Visits & Rostering.',
  };
  readonly payroll = { can: (_action: string) => false };
  readonly manager = computed(() => this.can('manage'));
  readonly preview = {
    visits: this.visits,
    waiting: () => [],
    setup: () =>
      'Sample setup is unavailable for connected company records. Create visits in Visits & Rostering.',
    next: () =>
      'Connect a verified mobile source or record actual attendance; simulated feed updates are unavailable.',
  };
  readonly care = {
    auth: this.auth,
    store: this.store,
    rota: this.rota,
    client: (id: string) => this.clients().find((c: any) => c.id === id),
  };
  constructor() {
    effect(() => {
      const scope = this.scope(),
        date = this.target();
      untracked(() => {
        this.generation++;
        this.clear();
        this.denied.set(false);
        this.intents.clear();
        this.endEdit();
        if (date !== null) {
          if (this.can('view')) void this.load(date, scope);
          else
            this.error.set(
              'Live visits are unavailable. ECM, roster and service-user read access are required.',
            );
        }
      });
    });
    this.timer = setInterval(() => {
      if (this.target() !== null && this.can('view') && !this.saving() && !this.loading())
        void this.load(this.target()!);
    }, 15000);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
      if (this.timer) clearInterval(this.timer);
      this.clear();
    });
  }
  private clear() {
    this.raw.set(null);
    this.unavailable.set([]);
    this.loadedAt.set('');
    this.error.set('');
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls.clear();
  }
  can(action: string) {
    if (
      this.denied() ||
      !this.records.allowed() ||
      !this.records.access.can('care', 'rostering', 'read') ||
      !this.records.access.can('care', 'ecm', 'read')
    )
      return false;
    if (action === 'view') return true;
    if (action === 'manage') return this.records.access.can('care', 'ecm', 'edit');
    if (action === 'attendance') return this.records.access.can('care', 'ecm', 'create');
    if (action === 'export')
      return (
        this.records.access.can('care', 'ecm', 'export') &&
        this.records.access.can('care', 'records', 'export')
      );
    return this.records.access.can('care', 'ecm', action);
  }
  connect(date = '') {
    untracked(() => {
      this.denied.set(false);
      if (this.target() === date) {
        if (this.can('view')) void this.load(date);
      } else this.target.set(date);
    });
  }
  selectDate(date: string) {
    if (this.target() !== date) this.target.set(date);
  }
  private root() {
    return `/companies/${this.records.companyId()}/ecm`;
  }
  private current(scope: string) {
    return !this.destroyed && scope === this.scope() && this.can('view');
  }
  private check<T extends { company_id: string }>(value: T, scope: string): T {
    if (!this.current(scope) || value.company_id !== this.records.companyId())
      throw Error('The monitoring workspace changed. Reopen the board.');
    return value;
  }
  private async request<T>(
    path: string,
    body?: unknown,
    method?: 'POST' | 'PATCH',
    headers?: Record<string, string>,
    type: 'json' | 'blob' = 'json',
  ): Promise<T> {
    const scope = this.scope();
    try {
      return await this.auth.api<T>(path, body, method, headers, type);
    } catch (error) {
      if (scope === this.scope() && [401, 403].includes((error as any)?.status)) {
        this.clear();
        this.denied.set(true);
      }
      throw error;
    }
  }
  async load(date = this.target() || '', scope = this.scope()): Promise<boolean> {
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    try {
      const root = this.root(),
        query = new URLSearchParams({ page_size: '100' });
      if (date) query.set('date', date);
      let page = this.check(await this.request<EcmWorkspaceRead>(root + '?' + query), scope);
      if (generation !== this.generation) return false;
      const first = page,
        rows = [...page.results],
        seen = new Set<string>();
      if (page.count > 3000 || !first.context || !first.data)
        throw Error(
          'The monitoring response is incomplete. Narrow the date or service-user filter.',
        );
      while (page.next) {
        if (!page.next.startsWith(root + '?') || seen.has(page.next) || rows.length >= first.count)
          throw Error('Monitoring pagination is incomplete. Reload the board.');
        seen.add(page.next);
        page = this.check(await this.request<EcmWorkspaceRead>(page.next), scope);
        if (generation !== this.generation) return false;
        if (
          page.revision !== first.revision ||
          page.count !== first.count ||
          page.date !== first.date
        )
          throw Error('Monitoring data changed. Reload the board.');
        rows.push(...page.results);
      }
      if (rows.length !== first.count || new Set(rows.map((r) => r['id'])).size !== first.count)
        throw Error('Monitoring pagination is incomplete. Reload the board.');
      if (!this.current(scope) || generation !== this.generation) return false;
      const clientIds = new Set(((first.context as any)['clients'] || []).map((c: any) => c.id));
      if (
        rows.some(
          (r) =>
            r['company_id'] !== this.records.companyId() ||
            !clientIds.has(r['clientId']) ||
            r['state'] !== 'Published',
        )
      )
        throw Error('A visit belongs to another workspace or unavailable service user.');
      const data = first.data as unknown as EcmData;
      for (const e of data.evidence) {
        const asset = e as any;
        e.photo = asset.photoId ? 'attachment:' + asset.photoId : '';
        e.audio = asset.audioId ? 'attachment:' + asset.audioId : '';
      }
      const existing = this.raw()?.data?.evidence || [];
      for (const e of data.evidence) {
        const old = existing.find((r: any) => r.id === e.id);
        if (old) {
          if (old.photo?.startsWith('blob:') && (old as any).photoId === (e as any).photoId)
            e.photo = old.photo;
          if (old.audio?.startsWith('blob:') && (old as any).audioId === (e as any).audioId)
            e.audio = old.audio;
        }
      }
      this.raw.set({ ...first, results: rows, data });
      this.unavailable.set((first.meta['unavailable'] || []) as string[]);
      this.loadedAt.set(first.as_of);
      return true;
    } catch (error) {
      if (scope === this.scope() && generation === this.generation && !this.destroyed) {
        this.clear();
        this.error.set(
          error instanceof Error ? error.message : 'Live monitoring could not be loaded.',
        );
      }
      return false;
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  private visit(id: string) {
    const row = this.visits().find((v) => v.id === id);
    if (!row) throw Error('This published visit is no longer available. Refresh the board.');
    return row as RotaVisit & { version: number; etag: string };
  }
  beginEdit(kind: string, id = '') {
    this.endEdit();
    if (kind === 'Board settings') {
      const etag = this.raw()?.meta?.settings_etag;
      if (etag) this.editVersions.set('settings', etag);
    } else if (
      [
        'Record follow-up',
        'Reschedule visit',
        'Manual override',
        'Reallocate visit',
        'Record attendance',
        'Add evidence',
      ].includes(kind)
    ) {
      const row = this.visits().find((v) => v.id === id) as any;
      if (row?.etag) this.editVersions.set('visit:' + id, row.etag);
    }
  }
  endEdit() {
    this.editVersions.clear();
  }
  private visitEtag(id: string) {
    return this.editVersions.get('visit:' + id) || this.visit(id).etag;
  }
  private async mutate(
    path: string,
    body: unknown,
    etag?: string,
    method: 'POST' | 'PATCH' = 'POST',
  ): Promise<string | null> {
    if (this.saving()) return 'A monitoring request is already in progress.';
    if (!this.can('view')) return 'Monitoring access is unavailable.';
    const scope = this.scope(),
      generation = ++this.generation,
      full = this.root() + path,
      intent = scope + full + JSON.stringify(body);
    if (!this.intents.has(intent)) this.intents.set(intent, crypto.randomUUID());
    this.loading.set(false);
    this.saving.set(true);
    try {
      this.check(
        await this.request<EcmMutationRead>(full, body, method, {
          'Idempotency-Key': this.intents.get(intent)!,
          ...(etag ? { 'If-Match': etag } : {}),
        }),
        scope,
      );
      this.intents.delete(intent);
      if (generation !== this.generation)
        return 'The board changed while saving. Refresh to view the recorded result.';
      await this.load(this.target() || '', scope);
      return this.error() || null;
    } catch (error) {
      return error instanceof Error ? error.message : 'The monitoring change could not be saved.';
    } finally {
      this.saving.set(false);
    }
  }
  async attendance(
    id: string,
    personId: string,
    at: string,
    kind: 'Check in' | 'Check out',
    note: string,
  ) {
    try {
      return await this.mutate(
        `/visits/${id}/attendance`,
        { personId, at, kind, note },
        this.visitEtag(id),
      );
    } catch (e) {
      return (e as Error).message;
    }
  }
  async record(id: string, input: Omit<EcmRecord, 'id' | 'visitId' | 'at' | 'user'>) {
    try {
      const body = {
        ...input,
        contactAt: input.contactAt ? this.localInstant(input.contactAt) : null,
        eta: input.eta || null,
        ownerId: input.ownerId || null,
      };
      return await this.mutate(`/visits/${id}/follow-ups`, body, this.visitEtag(id));
    } catch (e) {
      return (e as Error).message;
    }
  }
  settings(input: EcmData) {
    return this.mutate(
      '/settings',
      {
        lateMinutes: input.lateMinutes,
        riskMinutes: input.riskMinutes,
        missedMinutes: input.missedMinutes,
        styles: input.styles,
      },
      this.editVersions.get('settings') || this.raw()?.meta.settings_etag,
      'PATCH',
    );
  }
  async reschedule(id: string, date: string, start: string, reason: string, accepted: boolean) {
    try {
      return await this.mutate(
        `/visits/${id}/reschedule`,
        { date, start, reason, accepted },
        this.visitEtag(id),
      );
    } catch (e) {
      return (e as Error).message;
    }
  }
  async override(id: string, staffIds: string[], reason: string, acknowledged: boolean) {
    try {
      return await this.mutate(
        `/visits/${id}/override`,
        { staffIds, reason, acknowledged },
        this.visitEtag(id),
      );
    } catch (e) {
      return (e as Error).message;
    }
  }
  private async allocate(id: string, staffIds: string[], allocation: string, reason: string) {
    try {
      const scope = this.scope();
      const row = this.visit(id) as any;
      const body: Record<string, unknown> = { staffIds, allocation, reason };
      for (const key of [
        'date',
        'start',
        'end',
        'carers',
        'skills',
        'tasks',
        'priority',
        'timeSensitive',
        'toleranceMinutes',
        'flexible',
        'location',
        'taskType',
        'mileage',
        'driverRequired',
        'travelMinutes',
      ])
        body[key] = row[key] ?? null;
      const result = await this.request<any>(
        `/companies/${this.records.companyId()}/roster/visits/${id}`,
        body,
        'PATCH',
        { 'If-Match': this.visitEtag(id) },
      );
      this.check(result, scope);
      await this.load();
      return this.error() || null;
    } catch (error) {
      return (error as Error).message;
    }
  }
  escalation(
    id: string,
    ownerId: string,
    state: EcmEscalation['state'],
    note: string,
    etag?: string,
  ) {
    const row = this.data().escalations.find((c) => c.id === id) as any;
    return row
      ? this.mutate(`/escalations/${id}`, { ownerId, state, note }, etag || row.etag)
      : Promise.resolve('This escalation is unavailable.');
  }
  delivery(id: string, state: 'Delivered' | 'Failed' | 'Queued') {
    if (state !== 'Queued')
      return Promise.resolve(
        'Delivery outcomes come from provider receipts; they cannot be manually simulated.',
      );
    const row = this.data().notifications.find((c) => c.id === id) as any;
    return row
      ? this.mutate(`/notifications/${id}/retry`, { state }, row.etag)
      : Promise.resolve('This notification is unavailable.');
  }
  canCaptureEvidence(id: string) {
    return this.can('create') && this.visits().some((v) => v.id === id);
  }
  async evidence(
    id: string,
    input: Pick<
      EcmEvidence,
      'type' | 'note' | 'photo' | 'photoName' | 'audio' | 'audioName' | 'transcript' | 'taskResults'
    >,
    consent: boolean,
  ): Promise<string | null> {
    if (!this.canCaptureEvidence(id))
      return 'Evidence capture is unavailable for this assigned visit.';
    const scope = this.scope();
    try {
      const photo = input.photo
        ? await this.upload(id, input.photo, input.photoName || 'photo.png', consent)
        : null;
      const audio = input.audio
        ? await this.upload(id, input.audio, input.audioName || 'voice-note.webm', false)
        : null;
      if (!this.current(scope)) throw Error('The workspace changed during the evidence upload.');
      return await this.mutate(
        `/visits/${id}/evidence`,
        {
          type: input.type,
          note: input.note,
          transcript: input.transcript || '',
          photo: photo?.id || null,
          audio: audio?.id || null,
          consent,
          taskResults: input.taskResults || [],
        },
        this.visitEtag(id),
      );
    } catch (error) {
      return (error as Error).message;
    }
  }
  reviewEvidence(id: string) {
    const row = this.data().evidence.find((e) => e.id === id) as any;
    return row
      ? this.mutate(
          `/evidence/${id}/review`,
          { reason: 'Reviewed the recorded visit evidence' },
          row.etag,
        )
      : Promise.resolve('This evidence is unavailable.');
  }
  async viewPhoto(id: string) {
    return this.openAsset(id, 'photo');
  }
  async viewAudio(id: string) {
    return this.openAsset(id, 'audio');
  }
  private async openAsset(id: string, kind: 'photo' | 'audio') {
    if (!this.can('export'))
      return 'ECM and service-user export permissions are required to open attachments.';
    const scope = this.scope(),
      e = this.data().evidence.find((e) => e.id === id) as any;
    if (!e?.[kind + 'Id']) return 'The attachment is unavailable.';
    try {
      const blob = await this.request<Blob>(
        this.root() + `/files/${e[kind + 'Id']}/content`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      if (!this.current(scope)) throw Error('The workspace changed while loading the attachment.');
      const url = URL.createObjectURL(blob);
      this.urls.add(url);
      e[kind] = url;
      this.raw.update((value) => (value ? { ...value, data: { ...value.data } } : value));
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  }
  private async upload(
    id: string,
    data: string,
    filename: string,
    consent: boolean,
  ): Promise<EcmMediaRead> {
    const scope = this.scope(),
      match = /^data:([^;,]+)(?:;codecs=[^;]+)?;base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!match) throw Error('Choose a supported recording or photograph.');
    const bytes = atob(match[2]);
    if (bytes.length > 2097152) throw Error('The attachment exceeds its upload limit.');
    const file = new File([Uint8Array.from(bytes, (c) => c.charCodeAt(0))], filename, {
        type: match[1],
      }),
      body = new FormData();
    body.append('file', file);
    body.append('consent', String(consent));
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())),
    )
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
    const path = this.root() + `/visits/${id}/files`,
      intent = scope + path + digest + filename + consent;
    if (!this.intents.has(intent)) this.intents.set(intent, crypto.randomUUID());
    let row = this.check(
      await this.request<EcmMediaRead>(path, body, 'POST', {
        'Idempotency-Key': this.intents.get(intent)!,
      }),
      scope,
    );
    for (let n = 0; row.state === 'quarantined' && n < 15; n++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (!this.current(scope)) throw Error('The workspace changed during the attachment scan.');
      row = this.check(await this.request<EcmMediaRead>(this.root() + `/files/${row.id}`), scope);
    }
    if (row.visitId !== id || row.state !== 'clean')
      throw Error(
        row.state === 'quarantined'
          ? 'The attachment is still being scanned. Retry the same submission when scanning finishes.'
          : 'The attachment did not pass the security scan.',
      );
    return row;
  }
  kpis(_date: string) {
    return (
      this.raw()?.meta.metrics || {
        expected: null,
        completed: null,
        late: null,
        missed: null,
        coverage: null,
        completion: null,
        hours: null,
      }
    );
  }
  createInvoices(_date: string) {
    return 'Billing requires configured source rates and a billing owner. No invoice was created.';
  }
  invoiceState(_id: string, _state: string) {
    return 'Billing integration is not configured.';
  }
  createPack(date: string) {
    return this.mutate('/packs', { date });
  }
  async downloadPack(id: string) {
    if (!this.can('export')) throw Error('Export permission is required.');
    const scope = this.scope();
    const body = await this.request<Blob>(
      this.root() + `/packs/${id}/content`,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (!this.current(scope)) throw Error('The workspace changed during the export.');
    this.saveBlob(body, 'care-evidence.json');
  }
  async exportReport(filters: Record<string, string>) {
    if (!this.can('export')) throw Error('Export permission is required.');
    const scope = this.scope();
    const body = await this.request<Blob>(
      this.root() +
        '/export?' +
        new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '')),
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (!this.current(scope)) throw Error('The workspace changed during the export.');
    this.saveBlob(body, 'ecm-exceptions.csv');
  }
  private saveBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private localInstant(value: string) {
    const [date, time] = value.split('T');
    const instant = londonInstant(date, time || '');
    if (!instant) throw Error('Enter an unambiguous actual UK contact time.');
    return instant;
  }
}
