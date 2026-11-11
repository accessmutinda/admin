import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import type {
  RiskRead,
  RiskWrite,
  RiskWorkspace,
  RiskVoiceRead,
  RiskReviewRead,
  RiskDecisionRead,
} from './risk.generated';
@Injectable()
export class RiskApi {
  readonly records = inject(ServiceUsersApi);
  readonly auth = inject(AuthService);
  readonly scope = this.records.scope;
  readonly access = this.records.access;
  can(action: string): boolean {
    return (
      this.records.allowed() &&
      this.access.can('care', 'risks', 'read') &&
      this.access.can('care', 'risks', action) &&
      (action !== 'export' || this.access.can('care', 'records', 'export'))
    );
  }
  private root(id: string): string {
    if (!id || !this.can('read')) throw Error('Risk assessments are unavailable.');
    return `/companies/${this.records.companyId()}/service-users/${id}/risk-assessments`;
  }
  private check<T extends { company_id: string; service_user_id: string }>(
    value: T,
    id: string,
    scope: string,
  ): T {
    if (
      scope !== this.scope() ||
      !this.can('read') ||
      value.company_id !== this.records.companyId() ||
      value.service_user_id !== id
    )
      throw Error('The workspace changed. Reopen this assessment.');
    return value;
  }
  async load(id: string, printing = false): Promise<RiskWorkspace> {
    const scope = this.scope();
    const value = this.check(
      await this.auth.api<RiskWorkspace>(this.root(id) + (printing ? '/print' : '')),
      id,
      scope,
    );
    for (const assessment of value.assessments) this.check(assessment, id, scope);
    for (const history of value.history) this.check(history.assessment, id, scope);
    return value;
  }
  async detail(id: string, record: string): Promise<RiskRead> {
    const scope = this.scope();
    const value = this.check(
      await this.auth.api<RiskRead>(`${this.root(id)}/${record}`),
      id,
      scope,
    );
    if (value.id !== record) throw Error('The returned assessment does not match this editor.');
    return value;
  }
  async save(
    id: string,
    body: RiskWrite,
    original: RiskRead | null,
    key: string,
  ): Promise<RiskRead> {
    const scope = this.scope();
    return this.check(
      await this.auth.api<RiskRead>(
        this.root(id) + (original ? '/' + original.id : ''),
        body,
        original ? 'PATCH' : 'POST',
        original ? { 'If-Match': original.etag } : { 'Idempotency-Key': key },
      ),
      id,
      scope,
    );
  }
  async command(
    id: string,
    record: RiskRead,
    command: 'submit' | 'return' | 'approve' | 'review',
    reason: string,
    key: string,
  ): Promise<RiskRead> {
    const scope = this.scope();
    return this.check(
      await this.auth.api<RiskRead>(
        `${this.root(id)}/${record.id}/${command}`,
        { reason },
        'POST',
        { 'If-Match': record.etag, 'Idempotency-Key': key },
      ),
      id,
      scope,
    );
  }

  async saveVoice(
    id: string,
    transcript: string,
    domain: string,
    file: File | null,
    key: string,
  ): Promise<RiskVoiceRead> {
    const scope = this.scope(),
      form = new FormData();
    form.append('transcript', transcript);
    form.append('domain', domain);
    if (file) form.append('file', file);
    return this.check(
      await this.auth.api<RiskVoiceRead>(this.root(id) + '/voice-notes', form, 'POST', {
        'Idempotency-Key': key,
      }),
      id,
      scope,
    );
  }
  async voice(id: string, voice: string): Promise<RiskVoiceRead> {
    const scope = this.scope();
    return this.check(
      await this.auth.api<RiskVoiceRead>(`${this.root(id)}/voice-notes/${voice}`),
      id,
      scope,
    );
  }
  async review(id: string): Promise<RiskReviewRead> {
    const scope = this.scope();
    return this.check(await this.auth.api<RiskReviewRead>(this.root(id) + '/review'), id, scope);
  }
  async decide(
    id: string,
    suggestion: string,
    decision: 'accepted' | 'dismissed',
    reason: string,
    key: string,
  ): Promise<RiskDecisionRead> {
    const scope = this.scope();
    return this.check(
      await this.auth.api<RiskDecisionRead>(
        this.root(id) + '/review-decisions',
        { suggestion_id: suggestion, decision, reason },
        'POST',
        { 'Idempotency-Key': key },
      ),
      id,
      scope,
    );
  }
  async downloadVoice(id: string, voice: string): Promise<void> {
    if (!this.can('export')) throw Error('Risk and records export access is required.');
    const scope = this.scope();
    const blob = await this.auth.api<Blob>(
      `${this.root(id)}/voice-notes/${voice}/content`,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (scope !== this.scope() || !this.can('export')) return;
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download =
      'risk-recording.' +
      (blob.type === 'audio/webm'
        ? 'webm'
        : blob.type === 'audio/ogg'
          ? 'ogg'
          : blob.type === 'audio/wav'
            ? 'wav'
            : 'm4a');
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
