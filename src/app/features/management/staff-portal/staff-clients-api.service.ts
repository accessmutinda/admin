import {
  DestroyRef,
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { StaffDashboardApi } from './staff-dashboard-api.service';
import type {
  StaffClientContext,
  StaffClientDetail,
  StaffClientPage,
} from './staff-clients.generated';
import type { RotaClient } from '../rota/rota.models';
import type { ClientFile } from '../clients/client-file.models';
export const STAFF_CLIENTS = new InjectionToken<boolean>('staffClients');
export type StaffDirectoryClient = RotaClient & { photo_id?: string | null };
@Injectable()
export class StaffClientsApi {
  readonly access = inject(CompanyAccessService);
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(StaffDashboardApi);
  readonly companyId = this.access.companyId;
  readonly allowed = computed(
    () =>
      this.access.can('staff_portal', 'clients', 'read') &&
      this.access.can('care', 'records', 'read'),
  );
  readonly scope = computed(() => {
    const c = this.access.context();
    return JSON.stringify({
      company: this.companyId(),
      actor: this.auth.profile()?.id,
      context: c
        ? {
            active: c.company_active,
            platform: c.platform,
            revision: c.revision,
            permissions: [...c.permissions].sort(),
            modules: [...c.enabled_modules].sort(),
            roles: c.roles.map((r) => r.id).sort(),
          }
        : null,
    });
  });
  private readonly contextValue = signal<StaffClientContext | null>(null);
  readonly context = computed(() =>
    this.verified() === this.scope() ? this.contextValue() : null,
  );
  private readonly clientsValue = signal<StaffDirectoryClient[]>([]);
  readonly clients = computed(() => (this.staffReady() ? this.clientsValue() : []));
  readonly currentId = signal('');
  private readonly snapshotValue = signal<StaffClientDetail | null>(null);
  readonly snapshot = computed(() => (this.staffReady() ? this.snapshotValue() : null));
  readonly loading = signal(false);
  private readonly readyValue = signal(false);
  readonly ready = computed(() => this.staffReady() && this.readyValue());
  readonly error = signal('');
  readonly code = signal('');
  readonly busy = signal(false);
  private readonly verified = signal('');
  readonly staffReady = computed(() => !!this.context() && this.verified() === this.scope());
  private generation = 0;
  private destroyed = false;
  private active = false;
  private stopped = false;
  private pending?: Promise<void>;
  private intents = new Map<string, string>();
  private photoUrls = new Map<string, { photo: string; url: string }>();
  private timer?: ReturnType<typeof setInterval>;
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
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.clear();
      if (this.timer) clearInterval(this.timer);
    });
  }
  private clear() {
    this.generation++;
    this.verified.set('');
    this.pending = undefined;
    this.contextValue.set(null);
    this.clientsValue.set([]);
    this.snapshotValue.set(null);
    this.readyValue.set(false);
    this.loading.set(false);
    this.busy.set(false);
    this.error.set('');
    this.code.set('');
    this.intents.clear();
    for (const photo of this.photoUrls.values()) URL.revokeObjectURL(photo.url);
    this.photoUrls.clear();
  }
  private root() {
    return `/companies/${this.companyId()}/staff-portal/service-users`;
  }
  private current(scope: string, generation = this.generation) {
    return (
      !this.destroyed && !this.stopped && scope === this.scope() && generation === this.generation
    );
  }
  private validate(value: { company_id?: string }) {
    if (value.company_id !== this.companyId())
      throw Error('The service-user response does not match this workspace.');
  }
  start() {
    this.stopped = false;
    this.active = true;
    void this.load();
    this.timer ??= setInterval(() => {
      if (this.active && document.visibilityState !== 'hidden' && !this.busy()) void this.load();
    }, 15000);
  }
  stop() {
    this.active = false;
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.currentId.set('');
    this.clear();
  }
  select(id: string) {
    if (id !== this.currentId()) {
      this.currentId.set(id);
      this.generation++;
      this.pending = undefined;
      this.snapshotValue.set(null);
      this.readyValue.set(false);
    }
    this.start();
  }
  async detail(id: string, force = false): Promise<void> {
    if (this.stopped) return;
    if (force && id === this.currentId()) {
      this.generation++;
      this.pending = undefined;
    }
    this.select(id);
    await this.load();
  }
  async request<T>(
    path: string,
    body?: unknown,
    method?: 'POST' | 'PATCH',
    headers?: Record<string, string>,
    responseType: 'json' | 'blob' = 'json',
  ): Promise<T> {
    const scope = this.scope();
    try {
      return await this.auth.api<T>(path, body, method, headers, responseType);
    } catch (error) {
      if (this.current(scope) && [401, 403].includes((error as { status?: number }).status ?? 0)) {
        this.clear();
        this.code.set((error as { code?: string }).code ?? 'permission_denied');
        this.error.set(
          error instanceof Error ? error.message : 'Your staff service users are unavailable.',
        );
      }
      throw error;
    }
  }
  async load(): Promise<void> {
    if (this.destroyed || this.stopped) return;
    if (this.pending) return this.pending;
    const scope = this.scope(),
      generation = ++this.generation,
      id = this.currentId();
    this.loading.set(true);
    const promise = (async () => {
      try {
        const context = await this.request<StaffClientContext>(this.root() + '/context');
        if (!this.current(scope, generation) || id !== this.currentId()) return;
        this.validate(context);
        if (
          String(context.actor_id) !== String(this.auth.profile()?.id) ||
          context.company.id !== context.company_id ||
          !context.person_id ||
          !context.employment_id
        )
          throw Error('This service-user context does not belong to your staff account.');
        this.verified.set(scope);
        this.contextValue.set(context);
        this.dashboard.rememberCompany(context.company, context.actor_id);
        const clients: StaffDirectoryClient[] = [];
        let page: number | null = 1;
        while (page) {
          const result: StaffClientPage = await this.request<StaffClientPage>(
            this.root() + `?page=${page}&page_size=100`,
          );
          if (!this.current(scope, generation) || id !== this.currentId()) return;
          this.validate(result);
          clients.push(...result.results.map((row) => this.client(row)));
          page = result.next;
        }
        let detail: StaffClientDetail | null = null;
        if (id) {
          detail = await this.request<StaffClientDetail>(this.root() + '/' + id);
          if (!this.current(scope, generation) || id !== this.currentId()) return;
          this.validate(detail);
          if (detail.clientId !== id || detail.record.id !== id)
            throw Error('The response does not match the selected service user.');
          const record = this.client(detail.record);
          if (record.photo_id) {
            let photo = this.photoUrls.get(id);
            if (!photo || photo.photo !== record.photo_id) {
              const bytes = await this.request<Blob>(
                this.root() + '/' + id + '/photo',
                undefined,
                undefined,
                undefined,
                'blob',
              );
              if (!this.current(scope, generation)) return;
              if (photo) URL.revokeObjectURL(photo.url);
              photo = { photo: record.photo_id, url: URL.createObjectURL(bytes) };
              this.photoUrls.set(id, photo);
            }
            record.file!.photo = photo.url;
          }
          const index = clients.findIndex((row) => row.id === id);
          if (index < 0)
            throw Error('This service user is no longer assigned to your staff account.');
          clients[index] = record;
        }
        if (!this.current(scope, generation) || id !== this.currentId()) return;
        for (const [key, photo] of this.photoUrls)
          if (!clients.some((c) => c.id === key && c.photo_id === photo.photo)) {
            URL.revokeObjectURL(photo.url);
            this.photoUrls.delete(key);
          }
        this.clientsValue.set(clients);
        this.snapshotValue.set(detail);
        this.readyValue.set(true);
        this.error.set('');
        this.code.set('');
      } catch (error) {
        if (this.current(scope, generation)) {
          this.clientsValue.set([]);
          this.snapshotValue.set(null);
          this.readyValue.set(false);
          this.error.set(
            error instanceof Error ? error.message : 'Your service users could not be loaded.',
          );
          this.code.set((error as { code?: string }).code ?? 'unavailable');
        }
      } finally {
        if (this.current(scope, generation)) {
          this.loading.set(false);
          this.pending = undefined;
        }
      }
    })();
    this.pending = promise;
    return promise;
  }
  private client(
    row: StaffClientPage['results'][number] | StaffClientDetail['record'],
  ): StaffDirectoryClient {
    this.validate(row);
    const source = 'file' in row ? row.file : null;
    const file: ClientFile =
      source && typeof source === 'object'
        ? (source as unknown as ClientFile)
        : {
            details: Object.fromEntries(
              Object.entries(row.details).map(([key, value]) => [key, value ?? '']),
            ),
            sections: {},
            entries: {},
            updatedAt: '',
          };
    return {
      ...row,
      funding: row.funding as RotaClient['funding'],
      priority: row.priority as RotaClient['priority'],
      representative: row.representative
        ? {
            name: row.representative.name ?? '',
            relationship: row.representative.relationship ?? '',
            phone: row.representative.phone ?? '',
            email: row.representative.email ?? '',
          }
        : undefined,
      riskFlags: row.riskFlags as RotaClient['riskFlags'],
      file,
    };
  }
  available(source: string) {
    return this.snapshot()?.available[source] ?? this.context()?.available[source] ?? false;
  }
  async exportAudit(id: string, query: URLSearchParams) {
    const scope = this.scope();
    const blob = await this.request<Blob>(
      this.root() + '/' + id + '/audit/export?' + query,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (!this.current(scope)) throw Error('The workspace changed.');
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = 'communication-audit-' + id + '.csv';
      link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async allocation(
    client: string,
    body: unknown,
    path = '',
    method: 'POST' | 'PATCH' = 'POST',
    etag?: string,
  ) {
    if (this.busy()) return 'Wait for the current allocation change.';
    const scope = this.scope(),
      intent = JSON.stringify([client, body, path, method, etag]);
    const key = this.intents.get(intent) ?? crypto.randomUUID();
    this.intents.set(intent, key);
    this.busy.set(true);
    try {
      await this.request(this.root() + '/' + client + '/allocations' + path, body, method, {
        ...(etag ? { 'If-Match': etag } : {}),
        'Idempotency-Key': key,
      });
      if (!this.current(scope)) return 'The workspace changed.';
      this.intents.delete(intent);
      await this.load();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'The allocation could not be saved.';
    } finally {
      if (this.current(scope)) this.busy.set(false);
    }
  }
}
