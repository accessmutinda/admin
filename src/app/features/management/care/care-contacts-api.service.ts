import { Injectable, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import type {
  ProfessionalContactRead,
  ProfessionalContactWrite,
  ProfessionalContacts,
} from '../staff-portal/professional.generated';

@Injectable()
export class CareContactsApi {
  readonly records = inject(ServiceUsersApi);
  private readonly auth = inject(AuthService);
  readonly scope = this.records.scope;
  readonly loading = signal(false);
  readonly denied = signal(false);
  readonly error = signal('');
  readonly rows = signal<ProfessionalContactRead[]>([]);
  readonly contacts = computed(() =>
    this.can('read') ? this.rows().filter((row) => row.source === 'contact') : [],
  );
  readonly representative = computed(() =>
    this.can('read') ? this.rows().find((row) => row.source === 'representative') : undefined,
  );
  private generation = 0;
  private destroyed = false;
  private readonly intents = new Map<string, string>();
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => {
        this.generation++;
        this.rows.set([]);
        this.denied.set(false);
        this.loading.set(false);
        this.error.set('');
        this.intents.clear();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
      this.rows.set([]);
    });
  }
  can(action: string) {
    return (
      !this.denied() && this.records.allowed() && this.records.access.can('care', 'records', action)
    );
  }
  private root(id: string) {
    if (!id || !this.can('read')) throw Error('Contacts are unavailable.');
    return `/companies/${this.records.companyId()}/service-users/${id}/contacts`;
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
      throw Error('The workspace or service user changed. Reopen Contacts.');
    return row;
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
    } catch (e) {
      if (scope === this.scope() && [401, 403].includes((e as { status?: number })?.status ?? 0)) {
        this.rows.set([]);
        this.denied.set(true);
        this.error.set(e instanceof Error ? e.message : 'Contacts access is unavailable.');
      }
      throw e;
    }
  }
  async load(id: string, exporting = false): Promise<ProfessionalContactRead[]> {
    if (exporting && !this.can('export'))
      throw Error('Service User Records export access is required.');
    const scope = this.scope(),
      generation = ++this.generation;
    if (!exporting) this.rows.set([]);
    this.loading.set(true);
    this.error.set('');
    try {
      let page: number | null = 1;
      const rows: ProfessionalContactRead[] = [];
      while (page) {
        const response: ProfessionalContacts = this.check(
          await this.request<ProfessionalContacts>(
            this.root(id) + (exporting ? '/print' : '') + `?page=${page}&page_size=100`,
          ),
          id,
          scope,
        );
        rows.push(...response.contacts.map((row) => this.check(row, id, scope)));
        page = response.next;
        if (generation !== this.generation) return [];
      }
      if (!exporting) this.rows.set(rows);
      return rows;
    } catch (e) {
      if (scope === this.scope() && generation === this.generation) {
        this.rows.set([]);
        this.error.set(e instanceof Error ? e.message : 'Contacts could not be loaded.');
      }
      return [];
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async detail(id: string, contact: string) {
    const scope = this.scope();
    const row = this.check(
      await this.request<ProfessionalContactRead>(this.root(id) + '/' + contact),
      id,
      scope,
    );
    if (row.id !== contact || row.source !== 'contact')
      throw Error('The returned contact does not match this editor.');
    return row;
  }
  async save(
    id: string,
    draft: ProfessionalContactWrite,
    original: ProfessionalContactRead | null,
  ) {
    const scope = this.scope(),
      path = this.root(id) + (original ? '/' + original.id : ''),
      intent = scope + path + JSON.stringify(draft);
    if (!original && !this.intents.has(intent)) this.intents.set(intent, crypto.randomUUID());
    const row = this.check(
      await this.request<ProfessionalContactRead>(
        path,
        draft,
        original ? 'PATCH' : 'POST',
        original ? { 'If-Match': original.etag } : { 'Idempotency-Key': this.intents.get(intent)! },
      ),
      id,
      scope,
    );
    if (original && row.id !== original.id)
      throw Error('The saved contact does not match this editor.');
    if (!original) this.intents.delete(intent);
    return row;
  }
}
