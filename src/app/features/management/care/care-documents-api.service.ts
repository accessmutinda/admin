import { Injectable, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CareDocument } from './care.models';
import { DocumentMetadata, documentVisibility } from './care-documents.models';
import { VisitNoteAudience } from './visit-notes.models';
import { CareDocumentRead, CareDocumentPage } from './care-documents.generated';

@Injectable()
export class CareDocumentsApi {
  readonly records = inject(ServiceUsersApi);
  private readonly auth = inject(AuthService);
  readonly scope = this.records.scope;
  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly error = signal('');
  readonly denied = signal(false);
  readonly documents = signal<CareDocument[]>([]);
  private generation = 0;
  private destroyed = false;
  private readonly intents = new Map<string, string>();
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => {
        this.generation++;
        this.documents.set([]);
        this.error.set('');
        this.denied.set(false);
        this.loading.set(false);
        this.ready.set(false);
        this.intents.clear();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
      this.documents.set([]);
    });
  }
  can(action: string): boolean {
    return (
      !this.denied() &&
      this.records.allowed() &&
      this.records.access.can('care', 'documents', 'read') &&
      this.records.access.can('care', 'documents', action) &&
      (action !== 'export' || this.records.access.can('care', 'records', 'export'))
    );
  }
  private root(id: string): string {
    if (!id || !this.can('read')) throw Error('Documents are unavailable.');
    return `/companies/${this.records.companyId()}/service-users/${id}/documents`;
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
        this.documents.set([]);
        this.denied.set(true);
        this.error.set(e instanceof Error ? e.message : 'Documents access is unavailable.');
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
      throw Error('The workspace or service user changed. Reopen Documents.');
    return row;
  }
  private project(row: CareDocumentRead): CareDocument {
    return { ...row, status: row.status as CareDocument['status'], data: '' };
  }
  private key(path: string, body: unknown): string {
    const intent = this.scope() + path + JSON.stringify(body);
    if (!this.intents.has(intent)) this.intents.set(intent, crypto.randomUUID());
    return this.intents.get(intent)!;
  }
  async load(id: string): Promise<void> {
    const scope = this.scope(),
      generation = ++this.generation;
    this.documents.set([]);
    this.loading.set(true);
    this.error.set('');
    try {
      const rows: CareDocument[] = [];
      let page: number | null = 1;
      while (page) {
        const value: CareDocumentPage = this.check(
          await this.request<CareDocumentPage>(this.root(id) + `?page=${page}&page_size=100`),
          id,
          scope,
        );
        rows.push(...value.results.map((r) => this.project(this.check(r, id, scope))));
        page = value.next;
        if (generation !== this.generation) return;
      }
      this.documents.set(rows);
    } catch (e) {
      if (generation === this.generation && scope === this.scope()) {
        this.documents.set([]);
        this.error.set(e instanceof Error ? e.message : 'Documents could not be loaded.');
      }
    } finally {
      if (generation === this.generation) {
        this.ready.set(true);
        this.loading.set(false);
      }
    }
  }
  async detail(id: string, document: string): Promise<CareDocument> {
    const scope = this.scope();
    const row = this.check(
      await this.request<CareDocumentRead>(this.root(id) + '/' + document),
      id,
      scope,
    );
    if (row.id !== document) throw Error('The document does not match this editor.');
    return this.project(row);
  }
  async save(
    id: string,
    metadata: DocumentMetadata,
    sharing: Record<VisitNoteAudience, boolean>,
    original: CareDocument | null,
    file: File | null,
  ): Promise<CareDocument> {
    const scope = this.scope(),
      path = this.root(id) + (original ? '/' + original.id : '');
    const body = {
      ...metadata,
      issueDate: metadata.issueDate || null,
      reviewDate: metadata.reviewDate || null,
      visibility: sharing,
      reason: original ? 'Correct document information' : 'Upload a service user document',
    };
    let data: unknown = body,
      headers: Record<string, string>;
    if (original) headers = { 'If-Match': original.etag! };
    else {
      if (!file) throw Error('Choose a document to upload.');
      const form = new FormData();
      form.append('file', file);
      form.append('metadata', JSON.stringify(body));
      data = form;
      const digest = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())),
      )
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
      if (this.destroyed || scope !== this.scope())
        throw Error('The workspace changed while preparing the upload.');
      headers = { 'Idempotency-Key': this.key(path, { ...body, filename: file.name, digest }) };
    }
    if (this.destroyed || scope !== this.scope() || !this.can(original ? 'edit' : 'create'))
      throw Error('The workspace or document access changed before saving.');
    const row = this.check(
      await this.request<CareDocumentRead>(path, data, original ? 'PATCH' : 'POST', headers),
      id,
      scope,
    );
    if (original && row.id !== original.id)
      throw Error('The saved document does not match this editor.');
    return this.project(row);
  }
  async visibility(id: string, document: CareDocument, audience: VisitNoteAudience): Promise<void> {
    const scope = this.scope(),
      path = this.root(id) + '/' + document.id + '/visibility';
    const body = {
      audience,
      value: !documentVisibility(document)[audience],
      reason: 'Update document visibility preference',
    };
    this.check(
      await this.request<CareDocumentRead>(path, body, 'POST', {
        'If-Match': document.etag!,
        'Idempotency-Key': this.key(path, body),
      }),
      id,
      scope,
    );
  }
  async remove(id: string, document: CareDocument): Promise<void> {
    const scope = this.scope(),
      path = this.root(id) + '/' + document.id,
      body = { reason: 'Remove document from the active service user register' };
    this.check(
      await this.request<{ company_id: string; service_user_id: string }>(path, body, 'DELETE', {
        'If-Match': document.etag!,
        'Idempotency-Key': this.key(path, body),
      }),
      id,
      scope,
    );
  }
  async content(id: string, document: CareDocument): Promise<Blob> {
    if (!this.can('export'))
      throw Error(
        'Service User Documents and Records export access is required to open or download files.',
      );
    const scope = this.scope();
    const blob = await this.request<Blob>(
      this.root(id) + '/' + document.id + '/content',
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (scope !== this.scope() || this.destroyed || !this.can('export'))
      throw Error('Document access changed before the file loaded.');
    return blob;
  }
}
