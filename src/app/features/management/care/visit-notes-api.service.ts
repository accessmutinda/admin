import { Injectable, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import type {
  VisitNoteRead,
  VisitNoteWrite,
  VisitNotePage,
  VisitNoteOptions,
  VisitNoteFileRead,
} from './visit-notes.generated';
import type {
  VisitNote,
  VisitNoteAttachment,
  VisitNoteDraft,
  VisitNoteAudience,
} from './visit-notes.models';

@Injectable()
export class VisitNotesApi {
  readonly records = inject(ServiceUsersApi);
  private readonly auth = inject(AuthService);
  readonly scope = this.records.scope;
  readonly access = this.records.access;
  readonly page = signal<VisitNotePage | null>(null);
  readonly options = signal<VisitNoteOptions | null>(null);
  readonly loading = signal(false);
  readonly denied = signal(false);
  readonly error = signal('');
  private generation = 0;
  private optionsGeneration = 0;
  private destroyed = false;
  private readonly intents = new Map<string, string>();
  private readonly fileIntents = new Map<string, string>();
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => {
        this.generation++;
        this.optionsGeneration++;
        this.page.set(null);
        this.options.set(null);
        this.error.set('');
        this.intents.clear();
        this.fileIntents.clear();
        this.denied.set(false);
        this.loading.set(false);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
      this.optionsGeneration++;
      this.page.set(null);
      this.options.set(null);
    });
  }
  can(action: string): boolean {
    return (
      !this.denied() &&
      this.records.allowed() &&
      this.access.can('care', 'recording', 'read') &&
      this.access.can('care', 'recording', action) &&
      (action !== 'export' || this.access.can('care', 'records', 'export'))
    );
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
    } catch (error) {
      if (
        scope === this.scope() &&
        [401, 403].includes((error as { status?: number })?.status ?? 0)
      ) {
        this.page.set(null);
        this.options.set(null);
        this.denied.set(true);
        this.error.set(
          error instanceof Error ? error.message : 'Visit notes access is unavailable.',
        );
      }
      throw error;
    }
  }
  private root(id: string): string {
    if (!id || !this.can('read')) throw Error('Visit notes are unavailable.');
    return `/companies/${this.records.companyId()}/service-users/${id}/visit-notes`;
  }
  private check<T extends { company_id: string; service_user_id: string }>(
    value: T,
    id: string,
    scope: string,
  ): T {
    if (
      this.destroyed ||
      scope !== this.scope() ||
      !this.can('read') ||
      value.company_id !== this.records.companyId() ||
      value.service_user_id !== id
    )
      throw Error('The workspace or service user changed. Reopen Visit Notes.');
    return value;
  }
  project(row: VisitNoteRead): VisitNote {
    return {
      ...row,
      visitId: row.visitId ?? '',
      status: row.status as VisitNote['status'],
      attachments: row.attachments.map((file) => ({ ...file, data: '' })),
      revisions: [],
    };
  }
  readonly notes = computed(() =>
    this.can('read') ? (this.page()?.results ?? []).map((row) => this.project(row)) : [],
  );
  private key(path: string, body: unknown): string {
    const intent = this.scope() + path + JSON.stringify(body);
    if (!this.intents.has(intent)) this.intents.set(intent, crypto.randomUUID());
    return this.intents.get(intent)!;
  }
  async load(id: string, query: string): Promise<boolean> {
    const scope = this.scope(),
      generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    this.page.set(null);
    try {
      const value = this.check(
        await this.request<VisitNotePage>(this.root(id) + (query ? '?' + query : '')),
        id,
        scope,
      );
      for (const row of value.results) this.check(row, id, scope);
      if (generation !== this.generation) return false;
      this.page.set(value);
      return true;
    } catch (e) {
      if (generation === this.generation && scope === this.scope()) {
        this.page.set(null);
        this.error.set(e instanceof Error ? e.message : 'Visit notes could not be loaded.');
      }
      return false;
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async loadOptions(id: string, query = ''): Promise<boolean> {
    const scope = this.scope(),
      generation = ++this.optionsGeneration;
    this.options.set(null);
    try {
      const value = this.check(
        await this.request<VisitNoteOptions>(
          this.root(id) + '/options' + (query ? '?' + query : ''),
        ),
        id,
        scope,
      );
      if (generation !== this.optionsGeneration) return false;
      this.options.set(value);
      return true;
    } catch (e) {
      if (generation === this.optionsGeneration && scope === this.scope())
        this.error.set(e instanceof Error ? e.message : 'Visit note options are unavailable.');
      return false;
    }
  }
  async detail(id: string, note: string): Promise<VisitNote> {
    const scope = this.scope();
    const row = this.check(
      await this.request<VisitNoteRead>(this.root(id) + '/' + note),
      id,
      scope,
    );
    if (row.id !== note) throw Error('The returned note does not match this editor.');
    return this.project(row);
  }
  async save(id: string, draft: VisitNoteDraft, original: VisitNote | null): Promise<VisitNote> {
    const scope = this.scope();
    const body: VisitNoteWrite = {
      visitId: draft.visitId || null,
      date: draft.date,
      start: draft.start,
      end: draft.end,
      carerId: draft.carerId,
      visitType: draft.visitType,
      body: draft.body,
      status: draft.status,
      visibility: { ...draft.visibility },
      attachment_ids: draft.attachments.map((a) => a.id),
      reason: original
        ? 'Correct the recorded visit note'
        : 'Record care provided and observations',
    };
    const path = this.root(id) + (original ? '/' + original.id : '');
    const row = this.check(
      await this.request<VisitNoteRead>(
        path,
        body,
        original ? 'PATCH' : 'POST',
        original ? { 'If-Match': original.etag! } : { 'Idempotency-Key': this.key(path, body) },
      ),
      id,
      scope,
    );
    if (original && row.id !== original.id)
      throw Error('The saved note does not match this editor.');
    return this.project(row);
  }
  async visibility(id: string, note: VisitNote, audience: VisitNoteAudience): Promise<VisitNote> {
    const scope = this.scope(),
      path = this.root(id) + '/' + note.id + '/visibility';
    const body = {
      audience,
      value: !note.visibility[audience],
      reason: 'Update the recorded note sharing preference',
    };
    return this.project(
      this.check(
        await this.request<VisitNoteRead>(path, body, 'POST', {
          'If-Match': note.etag!,
          'Idempotency-Key': this.key(path, body),
        }),
        id,
        scope,
      ),
    );
  }
  async upload(id: string, file: File): Promise<VisitNoteAttachment> {
    const scope = this.scope(),
      path = this.root(id) + '/files',
      form = new FormData();
    form.append('file', file);
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())),
    )
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const signature = { name: file.name, size: file.size, mime: file.type, hash };
    const intent = this.scope() + path + JSON.stringify(signature);
    let row = this.check(
      await this.request<VisitNoteFileRead>(path, form, 'POST', {
        'Idempotency-Key': this.key(path, signature),
      }),
      id,
      scope,
    );
    this.fileIntents.set(row.id, intent);
    for (let attempt = 0; row.state === 'quarantined' && attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (this.destroyed || scope !== this.scope())
        throw Error('The workspace changed during attachment scanning.');
      row = this.check(await this.request<VisitNoteFileRead>(path + '/' + row.id), id, scope);
    }
    if (row.state === 'quarantined')
      throw Error('The attachment is still being scanned. Retry this upload to check its status.');
    if (row.state !== 'clean')
      throw Error('This attachment did not pass its security scan. Choose another file.');
    return { ...row, data: '' };
  }
  async discard(id: string, file: VisitNoteAttachment): Promise<void> {
    const scope = this.scope(),
      path = this.root(id) + '/files/' + file.id,
      body = { reason: 'Discard an unused attachment' };
    this.check(
      await this.request<{ company_id: string; service_user_id: string }>(path, body, 'DELETE', {
        'If-Match': file.etag!,
        'Idempotency-Key': this.key(path, body),
      }),
      id,
      scope,
    );
    const intent = this.fileIntents.get(file.id);
    if (intent) this.intents.delete(intent);
    this.fileIntents.delete(file.id);
  }
  async download(id: string, note: VisitNote, file: VisitNoteAttachment): Promise<void> {
    if (!this.can('export'))
      throw Error('Care Recording and Service User Records export access is required.');
    const scope = this.scope();
    const current = await this.detail(id, note.id);
    if (!current.attachments.some((f) => f.id === file.id))
      throw Error('This attachment is no longer linked to the selected note.');
    const blob = await this.request<Blob>(
      this.root(id) + '/files/' + file.id + '/content',
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (scope !== this.scope() || this.destroyed || !this.can('export'))
      throw Error('The workspace changed before the download completed.');
    const url = URL.createObjectURL(blob),
      anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async print(id: string, query: string): Promise<VisitNote[]> {
    if (!this.can('export'))
      throw Error('Care Recording and Service User Records export access is required.');
    const scope = this.scope(),
      value = this.check(
        await this.request<VisitNotePage>(this.root(id) + '/print' + (query ? '?' + query : '')),
        id,
        scope,
      );
    return value.results.map((row) => this.project(this.check(row, id, scope)));
  }
}
