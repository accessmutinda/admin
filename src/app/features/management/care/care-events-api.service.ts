import { Injectable, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CareEventRead, CareEventPage, CareEventWrite } from './care-events.generated';
export type EventKind = CareEventRead['kind'];

@Injectable()
export class CareEventsApi {
  readonly records = inject(ServiceUsersApi);
  private readonly auth = inject(AuthService);
  readonly scope = this.records.scope;
  readonly loading = signal(false);
  readonly today = signal('');
  readonly error = signal('');
  readonly denied = signal(false);
  readonly entries = signal<CareEventRead[]>([]);
  private generation = 0;
  private destroyed = false;
  private readonly intents = new Map<string, string>();
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => {
        this.generation++;
        this.entries.set([]);
        this.today.set('');
        this.error.set('');
        this.denied.set(false);
        this.loading.set(false);
        this.intents.clear();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.today.set('');
      this.generation++;
      this.entries.set([]);
    });
  }
  can(action: string): boolean {
    return (
      !this.denied() &&
      this.records.allowed() &&
      this.records.access.can('care', 'incidents', 'read') &&
      this.records.access.can('care', 'incidents', action) &&
      (action !== 'export' || this.records.access.can('care', 'records', 'export'))
    );
  }
  private root(id: string): string {
    if (!id || !this.can('read')) throw Error('Records are unavailable.');
    return `/companies/${this.records.companyId()}/service-users/${id}/care-events`;
  }
  private async request<T>(
    path: string,
    body?: unknown,
    method?: 'POST' | 'PATCH' | 'DELETE',
    headers?: Record<string, string>,
    responseType: 'json' | 'blob' = 'json',
  ): Promise<T> {
    const scope = this.scope();
    try {
      return await this.auth.api<T>(path, body, method, headers, responseType);
    } catch (e) {
      if (scope === this.scope() && [401, 403].includes((e as { status?: number })?.status ?? 0)) {
        this.entries.set([]);
        this.denied.set(true);
        this.error.set(e instanceof Error ? e.message : 'Records access is unavailable.');
      }
      throw e;
    }
  }
  private check<T extends { company_id: string; service_user_id: string }>(
    row: T,
    id: string,
    scope: string,
  ): T {
    if (
      this.destroyed ||
      scope !== this.scope() ||
      !this.can('read') ||
      row.company_id !== this.records.companyId() ||
      row.service_user_id !== id
    )
      throw Error('The workspace or service user changed. Reopen Records.');
    return row;
  }
  private key(path: string, body: unknown): string {
    const intent = this.scope() + path + JSON.stringify(body);
    if (!this.intents.has(intent)) this.intents.set(intent, crypto.randomUUID());
    return this.intents.get(intent)!;
  }
  async load(id: string, kind: EventKind, exporting = false): Promise<CareEventRead[]> {
    const scope = this.scope(),
      generation = ++this.generation;
    if (!exporting) this.entries.set([]);
    this.loading.set(true);
    this.error.set('');
    try {
      const rows: CareEventRead[] = [];
      let page: number | null = 1;
      while (page) {
        const value: CareEventPage = this.check(
          await this.request<CareEventPage>(
            this.root(id) +
              (exporting ? '/print' : '') +
              `?kind=${kind}&page=${page}&page_size=100`,
          ),
          id,
          scope,
        );
        if (typeof value.meta['today'] === 'string') this.today.set(value.meta['today']);
        rows.push(...value.results.map((r) => this.check(r, id, scope)));
        page = value.next;
        if (generation !== this.generation) return [];
      }
      if (!exporting) this.entries.set(rows);
      return rows;
    } catch (e) {
      if (generation === this.generation && scope === this.scope()) {
        this.entries.set([]);
        this.error.set(e instanceof Error ? e.message : 'Records could not be loaded.');
      }
      return [];
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async detail(id: string, record: string): Promise<CareEventRead> {
    const scope = this.scope();
    const row = this.check(
      await this.request<CareEventRead>(this.root(id) + '/' + record),
      id,
      scope,
    );
    if (row.id !== record) throw Error('The record does not match this editor.');
    return row;
  }
  async save(
    id: string,
    draft: CareEventWrite,
    original: CareEventRead | null,
  ): Promise<CareEventRead> {
    const scope = this.scope(),
      path = this.root(id) + (original ? '/' + original.id : '');
    const row = this.check(
      await this.request<CareEventRead>(
        path,
        draft,
        original ? 'PATCH' : 'POST',
        original ? { 'If-Match': original.etag } : { 'Idempotency-Key': this.key(path, draft) },
      ),
      id,
      scope,
    );
    if (original && row.id !== original.id)
      throw Error('The returned record does not match this editor.');
    return row;
  }
  async history(id: string, record: string): Promise<CareEventRead[]> {
    const scope = this.scope();
    const value = this.check(
      await this.request<{
        company_id: string;
        service_user_id: string;
        revisions: CareEventRead[];
      }>(this.root(id) + '/' + record + '/history'),
      id,
      scope,
    );
    return value.revisions.map((row) => {
      this.check(row, id, scope);
      if (row.id !== record) throw Error('History does not match this record.');
      return row;
    });
  }
  async remove(id: string, record: CareEventRead, reason: string): Promise<void> {
    const scope = this.scope(),
      path = this.root(id) + '/' + record.id,
      body = { reason };
    this.check(
      await this.request<{ company_id: string; service_user_id: string }>(path, body, 'DELETE', {
        'If-Match': record.etag,
        'Idempotency-Key': this.key(path, body),
      }),
      id,
      scope,
    );
  }
}
