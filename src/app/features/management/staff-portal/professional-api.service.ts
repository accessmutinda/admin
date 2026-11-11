import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import type {
  ProfessionalWorkspace,
  ProfessionalRead,
  ProfessionalWrite,
  ProfessionalContactRead,
  ProfessionalContactWrite,
} from './professional.generated';
import { JournalAttachment } from '../journal/journal.models';
@Injectable()
export class ProfessionalApi {
  readonly records = inject(ServiceUsersApi);
  readonly access = this.records.access;
  readonly scope = this.records.scope;
  private readonly auth = inject(AuthService);
  can(action: string): boolean {
    return (
      this.records.allowed() &&
      this.access.can('care', 'communications', 'read') &&
      this.access.can('care', 'communications', action) &&
      (action !== 'export' || this.access.can('care', 'records', 'export'))
    );
  }
  canContact(action: string): boolean {
    return this.records.allowed() && this.access.can('care', 'records', action);
  }
  private root(id: string): string {
    if (!this.can('read') || !id) throw Error('Professional communications are unavailable.');
    return `/companies/${this.records.companyId()}/service-users/${id}`;
  }
  private check<T extends { company_id: string }>(value: T, scope: string): T {
    if (
      scope !== this.scope() ||
      !this.can('read') ||
      value.company_id !== this.records.companyId()
    )
      throw Error('The workspace changed. Reopen the communication.');
    return value;
  }
  async load(id: string, query: URLSearchParams, printing = false): Promise<ProfessionalWorkspace> {
    const scope = this.scope();
    const value = this.check(
      await this.auth.api<ProfessionalWorkspace>(
        `${this.root(id)}/professional-communications${printing ? '/print' : ''}?${query}`,
      ),
      scope,
    );
    if (
      value.clientId !== id ||
      value.records.some((r) => r.company_id !== value.company_id || r.clientId !== id) ||
      value.contacts.some((c) => c.company_id !== value.company_id || c.service_user_id !== id)
    )
      throw Error('The response does not match this service user.');
    return value;
  }
  async detail(id: string, record: string): Promise<ProfessionalRead> {
    const scope = this.scope();
    const value = this.check(
      await this.auth.api<ProfessionalRead>(
        `${this.root(id)}/professional-communications/${record}`,
      ),
      scope,
    );
    if (value.clientId !== id || value.id !== record)
      throw Error('The returned communication does not match this editor.');
    return value;
  }
  async save(
    id: string,
    body: ProfessionalWrite,
    original: ProfessionalRead | null,
    key: string,
  ): Promise<void> {
    const scope = this.scope();
    this.check(
      await this.auth.api<ProfessionalRead>(
        `${this.root(id)}/professional-communications${original ? '/' + original.id : ''}`,
        body,
        original ? 'PATCH' : 'POST',
        original ? { 'If-Match': original.etag } : { 'Idempotency-Key': key },
      ),
      scope,
    );
  }
  async contact(id: string, contact: string): Promise<ProfessionalContactRead> {
    const scope = this.scope();
    const value = this.check(
      await this.auth.api<ProfessionalContactRead>(`${this.root(id)}/contacts/${contact}`),
      scope,
    );
    if (value.service_user_id !== id || value.id !== contact)
      throw Error('The returned contact does not match this service user.');
    return value;
  }
  async saveContact(
    id: string,
    body: ProfessionalContactWrite,
    original: ProfessionalContactRead | null,
    key: string,
  ): Promise<void> {
    const scope = this.scope();
    this.check(
      await this.auth.api<ProfessionalContactRead>(
        `${this.root(id)}/contacts${original ? '/' + original.id : ''}`,
        body,
        original ? 'PATCH' : 'POST',
        original ? { 'If-Match': original.etag } : { 'Idempotency-Key': key },
      ),
      scope,
    );
  }
  async upload(id: string, file: File, key: string): Promise<JournalAttachment> {
    const scope = this.scope(),
      form = new FormData();
    form.append('file', file);
    return {
      ...this.check(
        await this.auth.api<JournalAttachment & { company_id: string }>(
          `${this.root(id)}/professional-communications/files`,
          form,
          'POST',
          { 'Idempotency-Key': key },
        ),
        scope,
      ),
      content: '',
    };
  }
  async checkFile(id: string, file: string): Promise<JournalAttachment> {
    const scope = this.scope();
    const value = this.check(
      await this.auth.api<JournalAttachment & { company_id: string }>(
        `${this.root(id)}/professional-communications/files/${file}`,
      ),
      scope,
    );
    if (value.id !== file) throw Error('The returned attachment does not match.');
    return { ...value, content: '' };
  }
  async download(id: string, file: JournalAttachment): Promise<void> {
    const scope = this.scope();
    if (!this.can('export'))
      throw Error('Downloading attachments requires communications and records export access.');
    const blob = await this.auth.api<Blob>(
      `${this.root(id)}/professional-communications/files/${file.id}/content`,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (scope !== this.scope() || !this.can('export'))
      throw Error('The workspace changed. Retry the download.');
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
