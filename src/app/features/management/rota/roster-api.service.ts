import { Injectable, computed, effect, inject, signal, untracked, DestroyRef } from '@angular/core';
import { ApiError } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import {
  RotaCall,
  RotaClient,
  RotaData,
  RotaVisit,
  RecurringAllocationOptions,
  addDays,
  londonDate,
} from './rota.models';
import type {
  RosterWorkspace,
  RosterPublishingRead,
  RosterPackagePage,
  RosterOverviewRead,
  RosterVisitRead,
  RosterCallRead,
  RosterCandidates,
  RosterMutation,
  RosterSuggestionRead,
  RosterInputs,
  RosterHistoryPage,
  RosterHistoryAuditPage,
  RosterHistoryEvent,
} from './roster.generated';

@Injectable()
export class RosterApi {
  readonly records = inject(ServiceUsersApi);
  private readonly auth = inject(AuthService);
  readonly scope = this.records.scope;
  readonly access = this.records.access;
  readonly raw = signal<RosterWorkspace | null>(null);
  readonly overview = signal<RosterOverviewRead | null>(null);
  readonly publishing = signal<RosterPublishingRead | null>(null);
  readonly packageMeta = signal<RosterPackagePage['meta'] | null>(null);
  readonly historyMeta = signal<RosterHistoryPage['meta'] | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly denied = signal(false);
  readonly readable = computed(() => this.can('view'));
  readonly candidateRows = signal<RosterCandidates['candidates']>([]);
  private period: {
    start: string;
    end: string;
    client: string;
    overview?: Record<string, string>;
    packages?: string;
    publishing?: boolean;
    history?: Record<string, string>;
  } = { start: londonDate(), end: addDays(londonDate(), 30), client: '' };
  private generation = 0;
  private candidateGeneration = 0;
  private destroyed = false;
  private readonly intents = new Map<string, string>();
  readonly data = computed<RotaData>(() => {
    const r = this.can('view') ? this.raw() : null;
    return {
      clients: (r?.clients ?? []).map((c) => ({
        ...c,
        funding: c.funding as RotaClient['funding'],
        priority: c.priority as RotaClient['priority'],
        ...(this.records.selected()?.id === c.id ? this.records.selected() : {}),
      })),
      calls: (r?.calls ?? []).map((c) => this.callProjection(c)),
      visits: (r?.visits ?? []).map((v) => this.visitProjection(v)),
      audit: (r?.audit ?? []).map((a) => ({ ...a, clientId: a.clientId ?? undefined })),
      travelMinutes: r?.travelMinutes ?? 0,
    };
  });
  readonly staff = computed(() =>
    (this.can('view') ? (this.raw()?.staff ?? []) : []).map((p) => ({
      id: p.id,
      name: p.name,
      role: '',
      progress: {} as Record<string, number>,
      hr: {
        personal: { gender: p.gender, driver: p.driver },
        employment: { hours: p.hours === null ? null : Number(p.hours) },
        training: p.training,
        availabilityRecorded: p.availabilityRecorded,
        availableDays: p.availableDays,
      },
    })),
  );
  readonly store = {
    companyId: this.records.companyId,
    staff: this.staff,
    data: computed(() => ({
      people: this.staff(),
      leaves: (this.raw()?.leaves ?? []).map((l) => ({ ...l, person: l.personId })),
    })),
    initials: (name: string) =>
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join(''),
    download: (name: string, content: string, type: string) => {
      const url = URL.createObjectURL(new Blob([content], { type }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => {
        this.generation++;
        this.candidateGeneration++;
        this.raw.set(null);
        this.overview.set(null);
        this.publishing.set(null);
        this.packageMeta.set(null);
        this.historyMeta.set(null);
        this.candidateRows.set([]);
        this.error.set('');
        this.intents.clear();
        this.denied.set(false);
        this.loading.set(false);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
      this.candidateGeneration++;
      this.raw.set(null);
      this.overview.set(null);
      this.publishing.set(null);
      this.packageMeta.set(null);
      this.historyMeta.set(null);
    });
  }
  can(action: string): boolean {
    if (this.denied() || !this.records.allowed() || !this.access.can('care', 'rostering', 'read'))
      return false;
    if (action === 'view') return true;
    if (action === 'manage') return this.can('create') || this.can('edit');
    if (action === 'attendance')
      return (
        this.can('edit') &&
        this.access.can('care', 'ecm', 'read') &&
        this.access.can('care', 'ecm', 'create')
      );
    return (
      this.access.can('care', 'rostering', action) &&
      (action !== 'export' || this.access.can('care', 'records', 'export'))
    );
  }
  private async request<T>(
    path: string,
    body?: unknown,
    method?: 'POST' | 'PATCH' | 'DELETE',
    headers?: Record<string, string>,
  ): Promise<T> {
    const scope = this.scope();
    try {
      return await this.auth.api<T>(path, body, method, headers);
    } catch (error) {
      if (
        scope === this.scope() &&
        [401, 403].includes((error as { status?: number })?.status ?? 0)
      ) {
        this.raw.set(null);
        this.overview.set(null);
        this.publishing.set(null);
        this.packageMeta.set(null);
        this.historyMeta.set(null);
        this.candidateRows.set([]);
        this.denied.set(true);
        this.error.set(error instanceof Error ? error.message : 'Roster access is unavailable.');
      }
      throw error;
    }
  }
  private root(companyWide = false): string {
    if (!this.can('view')) throw Error('Visits and allocations are unavailable.');
    const company = `/companies/${this.records.companyId()}`;
    return this.period.client && !companyWide
      ? `${company}/service-users/${this.period.client}/visits`
      : `${company}/roster`;
  }
  private current(scope: string): boolean {
    return !this.destroyed && scope === this.scope() && this.can('view');
  }
  private check<T extends { company_id: string }>(value: T, scope: string): T {
    if (!this.current(scope) || value.company_id !== this.records.companyId())
      throw Error('The workspace changed. Reopen this form.');
    return value;
  }
  private visitProjection(v: RosterVisitRead): RotaVisit {
    return {
      ...v,
      carers: v.carers ?? 0,
      state: v.state as RotaVisit['state'],
      allocation: v.allocation as RotaVisit['allocation'],
      priority: v.priority as RotaVisit['priority'],
      location: v.location as RotaVisit['location'],
      mileage: v.mileage === null ? undefined : Number(v.mileage),
      backupStaffId: v.backupStaffId ?? undefined,
      travelMinutes: v.travelMinutes ?? undefined,
      toleranceMinutes: v.toleranceMinutes ?? undefined,
    };
  }
  private callProjection(c: RosterCallRead): RotaCall {
    return {
      ...c,
      carers: c.carers ?? 0,
      priority: c.priority as RotaCall['priority'],
      location: c.location as RotaCall['location'],
      mileage: c.mileage === null ? undefined : Number(c.mileage),
      backupStaffId: c.backupStaffId ?? undefined,
      travelMinutes: c.travelMinutes ?? undefined,
      toleranceMinutes: c.toleranceMinutes ?? undefined,
    };
  }
  async load(
    start: string,
    end: string,
    client = '',
    exporting = false,
    overview?: Record<string, string>,
    publishing = false,
  ): Promise<boolean> {
    if (!exporting) this.period = { start, end, client, overview, publishing };
    const scope = this.scope(),
      generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    if (!exporting) {
      this.raw.set(null);
      this.overview.set(null);
      this.publishing.set(null);
      this.packageMeta.set(null);
      this.historyMeta.set(null);
    }
    try {
      const query = new URLSearchParams({ start, end, ...overview });
      const value = this.check(
        await this.request<RosterWorkspace>(
          this.root() +
            (publishing
              ? exporting
                ? '/publishing/export'
                : '/publishing'
              : overview
                ? exporting
                  ? '/overview/export'
                  : '/overview'
                : exporting
                  ? '/export'
                  : '') +
            '?' +
            query,
        ),
        scope,
      );
      if (generation !== this.generation) return false;
      if (
        client &&
        (value.clients.some((row) => row.id !== client) ||
          value.calls.some((row) => row.clientId !== client) ||
          value.visits.some((row) => row.clientId !== client))
      )
        throw Error('The schedule does not match this service user. Reopen Visits & Allocation.');
      this.raw.set(value);
      this.overview.set(overview ? (value as RosterOverviewRead) : null);
      this.publishing.set(publishing ? (value as RosterPublishingRead) : null);
      return true;
    } catch (e) {
      if (this.current(scope) && generation === this.generation) {
        this.raw.set(null);
        this.overview.set(null);
        this.publishing.set(null);
        this.packageMeta.set(null);
        this.error.set(this.message(e));
      }
      return false;
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async loadPackages(client = ''): Promise<boolean> {
    const scope = this.scope(),
      generation = ++this.generation;
    this.period = { start: londonDate(), end: londonDate(), client: '', packages: client };
    this.raw.set(null);
    this.overview.set(null);
    this.publishing.set(null);
    this.packageMeta.set(null);
    this.historyMeta.set(null);
    this.error.set('');
    this.loading.set(true);
    try {
      const root = this.root(true) + '/call-packages/workspace';
      const query = new URLSearchParams({ page_size: '100' });
      if (client) query.set('client', client);
      let page = this.check(await this.request<RosterPackagePage>(root + '?' + query), scope);
      const context = page.context,
        meta = page.meta,
        count = page.count;
      if (!context || context.company_id !== this.records.companyId())
        throw Error('Call package sources are unavailable. Reload the register.');
      if (client && count > 2000)
        throw Error('Select a service user with at most 2000 call packages.');
      const calls = client ? [...page.results] : [];
      const visited = new Set<string>();
      while (client && page.next) {
        if (generation !== this.generation) return false;
        if (!page.next.startsWith(root + '?') || visited.has(page.next))
          throw Error('Call package pagination is invalid. Reload the register.');
        visited.add(page.next);
        if (calls.length > 2000)
          throw Error('Select a service user with at most 2000 call packages.');
        page = this.check(await this.request<RosterPackagePage>(page.next), scope);
        if (page.meta.revision !== meta.revision || page.count !== count)
          throw Error('Call packages changed. Reload the register before continuing.');
        calls.push(...page.results);
      }
      if (generation !== this.generation) return false;
      if (
        client &&
        (calls.length !== count ||
          new Set(calls.map((c) => c.id)).size !== count ||
          calls.some((c) => c.clientId !== client || c.company_id !== this.records.companyId()))
      )
        throw Error('The call packages do not match this service user. Reload the register.');
      this.raw.set({ ...context, calls });
      this.packageMeta.set(meta);
      return true;
    } catch (e) {
      if (this.current(scope) && generation === this.generation) {
        this.raw.set(null);
        this.packageMeta.set(null);
        this.error.set(this.message(e));
      }
      return false;
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async refresh(exporting = false): Promise<boolean> {
    const p = this.period;
    if (p.history) return this.loadHistory(p.history, exporting);
    if (p.packages !== undefined) {
      if (exporting) {
        this.error.set('Package exports are unavailable from this view.');
        return false;
      }
      return this.loadPackages(p.packages);
    }
    return this.load(p.start, p.end, p.client, exporting, p.overview, p.publishing);
  }
  async loadHistory(filters: Record<string, string>, exporting = false): Promise<boolean> {
    const scope = this.scope(),
      generation = ++this.generation;
    if (!exporting)
      this.period = {
        start: filters['start'] || '',
        end: filters['end'] || '',
        client: '',
        history: { ...filters },
      };
    this.raw.set(null);
    this.overview.set(null);
    this.publishing.set(null);
    this.packageMeta.set(null);
    this.historyMeta.set(null);
    this.error.set('');
    this.loading.set(true);
    try {
      const audit = filters['view'] === 'audit';
      if (audit && exporting) throw Error('Use visit history to export recorded visits.');
      const root =
        this.root(true) + (exporting ? '/history/export' : audit ? '/history/audit' : '/history');
      const query = new URLSearchParams({ page_size: '100' });
      for (const [key, value] of Object.entries(filters))
        if (value && key !== 'view') query.set(key, value);
      let page = this.check(
        await this.request<RosterHistoryPage | RosterHistoryAuditPage>(root + '?' + query),
        scope,
      );
      const context = page.context,
        meta = page.meta,
        count = page.count;
      if (!context || context.company_id !== this.records.companyId())
        throw Error('History sources are unavailable. Reload the register.');
      if (count > 5000) throw Error('Narrow the history dates to at most 5000 records.');
      const results: (RosterVisitRead | RosterHistoryEvent)[] = [...page.results];
      const visited = new Set<string>();
      while (page.next) {
        if (generation !== this.generation) return false;
        if (!page.next.startsWith(root + '?') || visited.has(page.next))
          throw Error('History pagination is invalid. Reload the register.');
        visited.add(page.next);
        if (results.length >= count)
          throw Error('History pagination is incomplete. Reload the register.');
        page = this.check(
          await this.request<RosterHistoryPage | RosterHistoryAuditPage>(page.next),
          scope,
        );
        if (
          page.meta.revision !== meta.revision ||
          page.meta.as_of !== meta.as_of ||
          page.count !== count
        )
          throw Error('History changed. Reload the register before continuing.');
        results.push(...page.results);
      }
      if (generation !== this.generation) return false;
      if (results.length !== count || new Set(results.map((row) => row.id)).size !== count)
        throw Error('History pagination is incomplete. Reload the register.');
      if (
        !audit &&
        results.some((row) => (row as RosterVisitRead).company_id !== this.records.companyId())
      )
        throw Error('History does not match this company. Reload the register.');
      this.raw.set({
        ...context,
        visits: audit ? [] : (results as RosterVisitRead[]),
        audit: audit ? (results as RosterHistoryEvent[]) : [],
      });
      this.historyMeta.set(meta);
      return true;
    } catch (error) {
      if (this.current(scope) && generation === this.generation) {
        this.raw.set(null);
        this.historyMeta.set(null);
        this.error.set(this.message(error));
      }
      return false;
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async detailVisit(id: string): Promise<RotaVisit> {
    const scope = this.scope();
    const value = this.check(
      await this.request<RosterVisitRead>(this.root() + '/visits/' + id),
      scope,
    );
    if (value.id !== id) throw Error('The visit does not match this editor.');
    this.raw.update((r) =>
      r ? { ...r, visits: r.visits.map((v) => (v.id === id ? value : v)) } : r,
    );
    return this.visitProjection(value);
  }
  async detailCall(id: string): Promise<RotaCall> {
    const scope = this.scope();
    const value = this.check(
      await this.request<RosterCallRead>(this.root() + '/call-packages/' + id),
      scope,
    );
    if (value.id !== id) throw Error('The call does not match this editor.');
    this.raw.update((r) =>
      r ? { ...r, calls: r.calls.map((c) => (c.id === id ? value : c)) } : r,
    );
    return this.callProjection(value);
  }
  private message(e: unknown): string {
    if (e instanceof ApiError && e.status === 404 && e.code === 'request_failed')
      return 'Visits & Allocation could not be opened. Try again, or contact your administrator if the problem continues.';
    return e instanceof Error ? e.message : 'The request could not be completed. Please retry.';
  }
  private key(path: string, body: unknown): string {
    const intent = this.scope() + path + JSON.stringify(body);
    if (!this.intents.has(intent)) this.intents.set(intent, crypto.randomUUID());
    return this.intents.get(intent)!;
  }
  private async mutate(
    path: string,
    body: unknown,
    method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
    etag?: string,
    companyWide = false,
    reloadOnConflict = false,
  ): Promise<string | null> {
    if (this.saving()) return 'A roster change is already in progress.';
    const scope = this.scope();
    const period = { ...this.period };
    const intent = scope + path + JSON.stringify(body);
    this.saving.set(true);
    try {
      const headers: Record<string, string> = { 'Idempotency-Key': this.key(path, body) };
      if (etag) headers['If-Match'] = etag;
      this.check(
        await this.request<RosterMutation>(this.root(companyWide) + path, body, method, headers),
        scope,
      );
      if (JSON.stringify(period) === JSON.stringify(this.period))
        if (!(await this.refresh()))
          throw Error(
            'The change was saved, but the schedule could not be reloaded. Refresh the page before editing again.',
          );
      if (!this.current(scope)) throw Error('The workspace changed. Reopen the roster.');
      this.intents.delete(intent);
      return null;
    } catch (e) {
      const message = this.message(e);
      if (
        reloadOnConflict &&
        this.current(scope) &&
        [409, 412].includes((e as { status?: number })?.status ?? 0)
      )
        await this.refresh();
      return message;
    } finally {
      this.saving.set(false);
    }
  }
  private inputs(v: RotaCall | RotaVisit): RosterInputs {
    return {
      carers: v.carers,
      skills: v.skills,
      tasks: v.tasks,
      priority: v.priority ?? 'Standard',
      timeSensitive: v.timeSensitive ?? false,
      toleranceMinutes: v.toleranceMinutes ?? 0,
      flexible: v.flexible ?? false,
      location: v.location || 'Home',
      taskType: v.taskType ?? '',
      mileage: v.mileage === undefined ? null : Number(v.mileage).toFixed(2),
      driverRequired: v.driverRequired ?? false,
      travelMinutes: v.travelMinutes ?? null,
    };
  }
  private visitBody(v: RotaVisit, reason: string) {
    return {
      ...this.inputs(v),
      date: v.date,
      start: v.start,
      end: v.end,
      staffIds: v.staffIds,
      allocation: v.allocation,
      reason,
    };
  }
  async updateVisit(
    v: RotaVisit,
    company: string,
    original: string,
    reason: string,
  ): Promise<string | null> {
    if (company !== this.records.companyId()) return 'The workspace changed. Reopen the visit.';
    const source = JSON.parse(original) as RotaVisit;
    return this.mutate('/visits/' + v.id, this.visitBody(v, reason), 'PATCH', source.etag);
  }
  async generate(
    clientId: string,
    callIds: string[],
    start: string,
    end: string,
    staffIds: string[] | null,
    allocation: 'Regular' | 'Temporary',
    options?: RecurringAllocationOptions,
  ): Promise<string | null> {
    return this.mutate('/generate', {
      clientId,
      callIds,
      start,
      end,
      staffIds,
      allocation,
      weekdays: null,
      options: options ? { ...options, backupStaffId: options.backupStaffId || null } : {},
      reason: 'Plan visits and record allocation requirements',
    });
  }
  async saveCall(c: RotaCall): Promise<string | null> {
    const existing = !!c.etag;
    return this.mutate(
      '/call-packages' + (existing ? '/' + c.id : ''),
      {
        ...this.inputs(c),
        clientId: c.clientId,
        name: c.name,
        start: c.start,
        end: c.end,
        weekdays: c.weekdays,
        regularStaffIds: c.regularStaffIds,
        backupStaffId: c.backupStaffId || null,
        active: c.active,
        reason: 'Save call package configuration',
      },
      existing ? 'PATCH' : 'POST',
      c.etag,
    );
  }
  async saveClient(c: RotaClient): Promise<string | null> {
    try {
      const original = this.records.selected()?.id === c.id ? this.records.selected() : null;
      const scope = this.scope();
      const saved = await this.records.save(c, original, scope);
      if (!this.current(scope)) throw Error('The workspace changed. Reopen the register.');
      c.id = saved.id;
      if (!(await this.refresh()))
        throw Error(
          'The service user was saved, but call packages could not be reloaded. Reload the register before continuing.',
        );
      return null;
    } catch (e) {
      return this.message(e);
    }
  }
  async allocate(
    id: string,
    staffIds: string[],
    allocation: 'Regular' | 'Temporary',
    reason: string,
  ): Promise<string | null> {
    const row = this.data().visits.find((v) => v.id === id);
    if (!row) return 'Reopen this visit.';
    return this.mutate(
      '/visits/' + id,
      this.visitBody({ ...row, staffIds, allocation }, reason),
      'PATCH',
      row.etag,
    );
  }
  async bulkAllocate(
    plans: { id: string; staffIds: string[]; original: string }[],
    company: string,
    reason: string,
  ): Promise<string | null> {
    if (company !== this.records.companyId()) return 'The workspace changed. Reopen allocations.';
    return this.mutate('/allocations', {
      plans: plans.map((p) => ({
        id: p.id,
        staffIds: p.staffIds,
        etag: JSON.parse(p.original).etag,
      })),
      reason,
    });
  }
  async publish(ids: string[], versions?: Record<string, string>): Promise<string | null> {
    return this.mutate(
      '/publish',
      {
        visits: ids.map((id) => ({
          id,
          etag: versions ? versions[id] : this.data().visits.find((v) => v.id === id)?.etag,
        })),
        reason: 'Publish reviewed visit allocations',
      },
      'POST',
      undefined,
      false,
      true,
    );
  }
  async cancel(id: string, reason: string): Promise<string | null> {
    return this.mutate(
      '/visits/' + id + '/cancel',
      { reason },
      'POST',
      this.data().visits.find((v) => v.id === id)?.etag,
    );
  }
  async copyWeek(source: string, target: string): Promise<string | null> {
    return this.mutate('/copy-week', {
      source,
      target,
      reason: 'Copy planned visits to the selected week',
    });
  }
  async saveTravel(travelMinutes: number): Promise<string | null> {
    return this.mutate(
      '/settings',
      { travelMinutes, reason: 'Update roster travel buffer' },
      'PATCH',
      this.raw()?.settings_etag || undefined,
      true,
      true,
    );
  }
  async recordAttendance(
    id: string,
    personId: string,
    start: string,
    end: string,
    note: string,
  ): Promise<string | null> {
    return this.mutate(
      '/visits/' + id + '/attendance',
      { personId, start, end, note },
      'POST',
      this.data().visits.find((v) => v.id === id)?.etag,
    );
  }
  sendToPayroll(_from: string): string {
    return 'Payroll transfer is unavailable until the payroll service is connected.';
  }
  conflicts(v: RotaVisit, _all?: RotaVisit[]): string[] {
    if (v.state === 'Cancelled') return [];
    if (this.publishing()) {
      const review = this.publishing()!.reviews[v.id];
      return review?.etag === v.etag
        ? review.issues
        : ['Publishing review is unavailable or stale. Reload before continuing.'];
    }
    return [
      ...(!v.requirementsRecorded ? ['Carer requirements have not been recorded.'] : []),
      ...(v.carers > v.staffIds.length ? ['Carer allocation is incomplete.'] : []),
    ];
  }
  candidates(_v: RotaVisit) {
    return this.candidateRows();
  }
  async loadCandidates(v: RotaVisit): Promise<void> {
    const scope = this.scope(),
      generation = ++this.candidateGeneration;
    this.candidateRows.set([]);
    if (!v.requirementsRecorded) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (generation !== this.candidateGeneration || !this.current(scope)) return;
    try {
      const result = this.check(
        await this.request<RosterCandidates>(
          this.root() + '/visits/' + v.id + '/candidates',
          this.visitBody(v, 'Review allocation candidates'),
          'POST',
        ),
        scope,
      );
      if (generation === this.candidateGeneration) this.candidateRows.set(result.candidates);
    } catch (e) {
      if (this.current(scope) && generation === this.candidateGeneration)
        this.error.set(this.message(e));
    }
  }
  async suggest(ids: string[], staffIds: string[]) {
    const scope = this.scope();
    const result = this.check(
      await this.request<RosterSuggestionRead>(
        this.root() + '/suggestions',
        {
          visits: ids.map((id) => ({
            id,
            etag: this.data().visits.find((v) => v.id === id)?.etag,
          })),
          staffIds,
        },
        'POST',
      ),
      scope,
    );
    return {
      plans: result.plans.map((p) => ({ ...p, original: JSON.stringify({ etag: p.etag }) })),
      unfilled: result.unfilled,
    };
  }
}
