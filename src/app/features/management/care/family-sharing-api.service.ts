import { Injectable, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import type {
  FamilyAccessRead,
  FamilyAccessWrite,
  FamilyUpdateRead,
  FamilyUpdateWrite,
  FamilyMessageRead,
  FamilyMessageWrite,
  FamilyWorkspaceRead,
  FamilyPublicationOptions,
  FamilyPublicationRead,
  FamilyPublicationWrite,
  FamilyPortalRead,
  FamilyAccessPage,
  FamilyUpdatePage,
  FamilyMessagePage,
} from './family-sharing.generated';
export type FamilyRecord = FamilyPortalRead;
type FamilyListPage = FamilyAccessPage | FamilyUpdatePage | FamilyMessagePage;
export type FamilyChoice = {
  clientId: string;
  accessId: string;
  name: string;
  contact: string;
  preview: boolean;
};
export type SharingKind = 'access' | 'updates' | 'messages';
export type SharingRow = FamilyAccessRead | FamilyUpdateRead | FamilyMessageRead;

@Injectable()
export class FamilySharingApi {
  readonly records = inject(ServiceUsersApi);
  readonly auth = inject(AuthService);
  readonly scope = this.records.scope;
  readonly companyName = signal('');
  readonly loading = signal(false);
  readonly denied = signal(false);
  readonly error = signal('');
  readonly workspace = signal<FamilyWorkspaceRead | null>(null);
  readonly access = signal<FamilyAccessRead[]>([]);
  readonly updates = signal<FamilyUpdateRead[]>([]);
  readonly messages = signal<FamilyMessageRead[]>([]);
  readonly choices = signal<FamilyChoice[]>([]);
  readonly shared = signal<FamilyRecord | null>(null);
  private generation = 0;
  private destroyed = false;
  private readonly intents = new Map<string, string>();
  private urls: string[] = [];
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => this.clear());
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.clear();
    });
  }
  private clear() {
    this.generation++;
    this.workspace.set(null);
    this.access.set([]);
    this.updates.set([]);
    this.messages.set([]);
    this.choices.set([]);
    this.companyName.set('');
    this.shared.set(null);
    this.loading.set(false);
    this.denied.set(false);
    this.error.set('');
    this.intents.clear();
    this.revoke();
  }
  private revoke() {
    this.urls.forEach((url) => URL.revokeObjectURL(url));
    this.urls = [];
  }
  can(action: string) {
    return (
      !this.denied() && this.records.allowed() && this.records.access.can('care', 'family', action)
    );
  }
  private root(id: string) {
    if (!id || !this.can('read')) throw Error('Family sharing is unavailable.');
    return `/companies/${this.records.companyId()}/service-users/${id}/family-sharing`;
  }
  private portalRoot(id?: string, access?: string) {
    return (
      `/companies/${this.records.companyId()}/family-portal` +
      (id && access ? `/${id}/${access}` : '')
    );
  }
  private check<T extends { company_id: string; service_user_id?: string }>(
    value: T,
    id: string | undefined,
    scope: string,
  ): T {
    if (
      this.denied() ||
      this.destroyed ||
      scope !== this.scope() ||
      value.company_id !== this.records.companyId() ||
      (id && value.service_user_id !== id)
    )
      throw Error('The workspace or service user changed. Reopen Family Portal.');
    return value;
  }
  private async request<T>(
    path: string,
    body?: unknown,
    method?: 'POST' | 'PATCH' | 'DELETE',
    headers?: Record<string, string>,
    response: 'json' | 'blob' = 'json',
  ): Promise<T> {
    const scope = this.scope(),
      generation = this.generation;
    try {
      return await this.auth.api<T>(path, body, method, headers, response);
    } catch (e) {
      if (
        scope === this.scope() &&
        generation === this.generation &&
        [401, 403].includes((e as { status?: number }).status ?? 0)
      ) {
        this.generation++;
        this.loading.set(false);
        this.error.set(e instanceof Error ? e.message : 'Family access is unavailable.');
        this.workspace.set(null);
        this.access.set([]);
        this.messages.set([]);
        this.updates.set([]);
        this.shared.set(null);
        this.choices.set([]);
        this.revoke();
        this.denied.set(true);
      }
      throw e;
    }
  }
  private key(path: string, body: unknown) {
    const intent = this.scope() + path + JSON.stringify(body);
    if (!this.intents.has(intent)) this.intents.set(intent, crypto.randomUUID());
    return { intent, key: this.intents.get(intent)! };
  }
  async pages<T extends SharingRow>(id: string, kind: SharingKind, printing = false): Promise<T[]> {
    const scope = this.scope(),
      generation = this.generation,
      rows: T[] = [];
    let page: number | null = 1;
    while (page) {
      if (generation !== this.generation) throw Error('The selected record changed.');
      const value: FamilyListPage = this.check(
        await this.request<FamilyListPage>(
          this.root(id) + '/' + kind + (printing ? '/print' : '') + `?page=${page}&page_size=100`,
        ),
        id,
        scope,
      );
      if (generation !== this.generation) throw Error('The selected record changed.');
      rows.push(...value.results.map((r) => this.check(r as unknown as T, id, scope)));
      page = value.next;
    }
    return rows;
  }
  async load(id: string) {
    const scope = this.scope(),
      token = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    try {
      const workspace = this.check(
        await this.request<FamilyWorkspaceRead>(this.root(id)),
        id,
        scope,
      );
      const access = await this.pages<FamilyAccessRead>(id, 'access');
      const updates = await this.pages<FamilyUpdateRead>(id, 'updates');
      const messages = await this.pages<FamilyMessageRead>(id, 'messages');
      if (token !== this.generation) return;
      this.workspace.set(workspace);
      this.access.set(access);
      this.updates.set(updates);
      this.messages.set(messages);
    } catch (e) {
      if (token === this.generation) {
        this.workspace.set(null);
        this.access.set([]);
        this.updates.set([]);
        this.messages.set([]);
        this.error.set(e instanceof Error ? e.message : 'Family sharing could not be loaded.');
      }
    } finally {
      if (token === this.generation) this.loading.set(false);
    }
  }
  async detail(id: string, kind: SharingKind, row: string) {
    const scope = this.scope();
    const value = this.check(
      await this.request<SharingRow>(this.root(id) + '/' + kind + '/' + row),
      id,
      scope,
    );
    if (value.id !== row) throw Error('The record does not match this editor.');
    return value;
  }
  async save(
    id: string,
    kind: SharingKind,
    body: FamilyAccessWrite | FamilyUpdateWrite | FamilyMessageWrite,
    original: SharingRow | null,
  ) {
    const scope = this.scope(),
      path = this.root(id) + '/' + kind + (original ? '/' + original.id : ''),
      intent = this.key(path, body);
    const result = this.check(
      await this.request<SharingRow>(
        path,
        body,
        original ? 'PATCH' : 'POST',
        original ? { 'If-Match': original.etag } : { 'Idempotency-Key': intent.key },
      ),
      id,
      scope,
    );
    if (original && result.id !== original.id)
      throw Error('The saved record does not match this editor.');
    this.intents.delete(intent.intent);
    return result;
  }
  async permission(id: string, row: FamilyAccessRead, scopeName: string, enabled: boolean) {
    const scope = this.scope();
    const saved = this.check(
      await this.request<FamilyAccessRead>(
        this.root(id) + '/access/' + row.id + '/permissions',
        { scope: scopeName, enabled },
        'PATCH',
        { 'If-Match': row.etag },
      ),
      id,
      scope,
    );
    if (saved.id !== row.id) throw Error('The saved access does not match this permission.');
    this.access.update((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
    return saved;
  }
  async loadChoices(preview: boolean) {
    const scope = this.scope();
    const value = this.check(
      await this.request<{ company_id: string; companyName: string; results: FamilyChoice[] }>(
        this.portalRoot() + `?preview=${preview ? 1 : 0}`,
      ),
      undefined,
      scope,
    );
    this.companyName.set(value.companyName);
    this.choices.set(value.results);
    return value.results;
  }
  async loadShared(id: string, access: string, page: string, preview: boolean) {
    this.denied.set(false);
    const scope = this.scope(),
      token = ++this.generation;
    this.loading.set(true);
    this.shared.set(null);
    this.error.set('');
    this.revoke();
    try {
      const value = this.check(
        await this.request<FamilyRecord>(
          this.portalRoot(id, access) +
            `?preview=${preview ? 1 : 0}&page=${encodeURIComponent(page)}`,
        ),
        id,
        scope,
      );
      if (value.access.id !== access)
        throw Error('The returned access does not match this family account.');
      if (token !== this.generation) return;
      if (value.profilePhoto) {
        const blob = await this.sharedImage(id, access, preview);
        if (scope !== this.scope() || token !== this.generation) return;
        value.profile.photo = URL.createObjectURL(blob);
        this.urls.push(value.profile.photo);
      }
      if (page === 'photos')
        for (const photo of value.photos ?? []) {
          const blob = await this.sharedImage(id, access, preview, photo.id);
          if (scope !== this.scope() || token !== this.generation) return;
          photo.data = URL.createObjectURL(blob);
          this.urls.push(photo.data);
        }
      if (token === this.generation) this.shared.set(value);
    } catch (e) {
      if (token === this.generation) {
        this.shared.set(null);
        this.error.set(e instanceof Error ? e.message : 'Shared information is unavailable.');
      }
    } finally {
      if (token === this.generation) this.loading.set(false);
    }
  }
  async refreshMessages(id: string, access: string, preview: boolean) {
    const scope = this.scope(),
      generation = this.generation;
    try {
      const value = this.check(
        await this.request<FamilyRecord>(
          this.portalRoot(id, access) + `?preview=${preview ? 1 : 0}&page=messages`,
        ),
        id,
        scope,
      );
      if (value.access.id !== access)
        throw Error('The returned conversation does not match this family account.');
      if (generation !== this.generation) return;
      const current = this.shared();
      if (current?.service_user_id === id && current.access.id === access)
        this.shared.set({ ...current, access: value.access, messages: value.messages });
    } catch (e) {
      if (scope === this.scope() && generation === this.generation && !this.destroyed) {
        this.shared.set(null);
        this.error.set(e instanceof Error ? e.message : 'Messages could not be refreshed.');
      }
    }
  }
  async sharedImage(id: string, access: string, preview: boolean, photo?: string) {
    const scope = this.scope();
    const blob = await this.request<Blob>(
      this.portalRoot(id, access) +
        (photo ? `/photos/${photo}/content` : '/profile-photo') +
        `?preview=${preview ? 1 : 0}`,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (scope !== this.scope() || this.destroyed) throw Error('Photo access changed.');
    return blob;
  }
  async content(id: string, access: string, file: string, preview: boolean) {
    const scope = this.scope();
    const value = await this.request<Blob>(
      this.portalRoot(id, access) + `/documents/${file}/content?preview=${preview ? 1 : 0}`,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (scope !== this.scope() || this.destroyed) throw Error('File access changed.');
    return value;
  }
  async publicationOptions(id: string) {
    const scope = this.scope();
    return this.check(
      await this.request<FamilyPublicationOptions>(this.root(id) + '/publication-options'),
      id,
      scope,
    );
  }
  async publish(id: string, body: FamilyPublicationWrite, original: FamilyPublicationRead | null) {
    const scope = this.scope(),
      path = this.root(id) + '/publications' + (original ? '/' + original.id : ''),
      intent = this.key(path, body);
    const value = this.check(
      await this.request<FamilyPublicationRead>(
        path,
        body,
        original ? 'PATCH' : 'POST',
        original ? { 'If-Match': original.etag } : { 'Idempotency-Key': intent.key },
      ),
      id,
      scope,
    );
    if (original && value.id !== original.id)
      throw Error('The saved publication does not match this editor.');
    this.intents.delete(intent.intent);
    return value;
  }
  async unpublish(id: string, row: FamilyPublicationRead, reason: string) {
    const scope = this.scope(),
      path = this.root(id) + '/publications/' + row.id,
      body = { reason },
      intent = this.key(path, body);
    const value = this.check(
      await this.request<{ company_id: string; service_user_id: string }>(path, body, 'DELETE', {
        'If-Match': row.etag,
        'Idempotency-Key': intent.key,
      }),
      id,
      scope,
    );
    this.intents.delete(intent.intent);
    return value;
  }
  async exportVisits(id: string, access: string, preview: boolean) {
    const scope = this.scope();
    return this.check(
      await this.request<{
        company_id: string;
        service_user_id: string;
        visits: NonNullable<FamilyRecord['visits']>;
      }>(this.portalRoot(id, access) + `/visits/export?preview=${preview ? 1 : 0}`),
      id,
      scope,
    ).visits;
  }
  async send(id: string, access: string, text: string) {
    const scope = this.scope(),
      path = this.portalRoot(id, access) + '/messages',
      body = { accessId: access, text },
      intent = this.key(path, body);
    const row = this.check(
      await this.request<FamilyMessageRead>(path, body, 'POST', { 'Idempotency-Key': intent.key }),
      id,
      scope,
    );
    this.intents.delete(intent.intent);
    return row;
  }
}
