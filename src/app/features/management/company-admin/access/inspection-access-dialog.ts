import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ApiError } from '../../../../core/auth/auth-api';
import { AuthService } from '../../../../core/auth/auth.service';
import type {
  InspectorEngagementPage,
  InspectorEngagementRead,
} from '../../../inspector/inspector-provider.generated';

export interface InspectionAccessData {
  companyId: string;
  membershipId: string;
  name: string;
}

@Component({
  selector: 'cv-inspection-access-dialog',
  imports: [DatePipe, FormsModule, MatDialogModule],
  templateUrl: './inspection-access-dialog.html',
  styleUrl: './inspection-access-dialog.css',
})
export class InspectionAccessDialog {
  readonly data = inject<InspectionAccessData>(MAT_DIALOG_DATA);
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly ref = inject(MatDialogRef<InspectionAccessDialog>);
  private readonly actor = this.auth.currentUser()?.id;
  private destroyed = false;
  private generation = 0;
  private attempt?: { body: string; key: string };
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly fields = signal<Record<string, string[]>>({});
  readonly records = signal<InspectorEngagementRead[]>([]);
  readonly revoking = signal<InspectorEngagementRead | null>(null);
  readonly now = signal(Date.now());
  readonly allowed = computed(
    () =>
      this.access.companyId() === this.data.companyId &&
      this.auth.currentUser()?.id === this.actor &&
      this.access.core('company.memberships.read') &&
      this.access.core('company.memberships.manage'),
  );
  readonly zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  starts = this.localTime(new Date());
  ends = this.localTime(new Date(Date.now() + 86400000));
  reason = '';
  revokeReason = '';

  constructor() {
    this.ref.disableClose = true;
    const timer = setInterval(() => this.now.set(Date.now()), 30000);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
      clearInterval(timer);
    });
    effect(() => {
      if (!this.allowed()) {
        this.records.set([]);
        this.ref.close();
      }
    });
    void this.load();
  }
  private localTime(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  private current(): boolean {
    return !this.destroyed && this.allowed();
  }
  private root(): string {
    return `/companies/${this.data.companyId}/inspector/engagements`;
  }
  state(row: InspectorEngagementRead): string {
    if (row.revoked_at) return 'Revoked';
    if (Date.parse(row.ends_at) <= this.now()) return 'Expired';
    return Date.parse(row.starts_at) > this.now() ? 'Scheduled' : 'Active';
  }
  async load(): Promise<void> {
    if (!this.current()) return;
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    try {
      const rows: InspectorEngagementRead[] = [];
      let count = 0;
      for (let page = 1; ; page++) {
        const result = await this.auth.api<InspectorEngagementPage>(
          `${this.root()}?page=${page}&page_size=100`,
        );
        if (!this.current() || generation !== this.generation) return;
        if (page === 1) count = result.count;
        if (
          result.count !== count ||
          result.results.some((row) => row.company_id !== this.data.companyId)
        )
          throw Error('Inspection access changed. Reload the current records.');
        rows.push(...result.results);
        if (new Set(rows.map((row) => row.id)).size !== rows.length || rows.length > count)
          throw Error('Inspection access could not be loaded completely. Retry.');
        if (rows.length === count) break;
        if (!result.next || !result.results.length)
          throw Error('Inspection access could not be loaded completely. Retry.');
      }
      this.records.set(rows.filter((row) => row.membership_id === this.data.membershipId));
    } catch (error) {
      if (this.current() && generation === this.generation) {
        this.records.set([]);
        this.fail(error);
      }
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  private fail(error: unknown): void {
    this.error.set(
      error instanceof Error ? error.message : 'Inspection access could not be saved.',
    );
    this.fields.set(error instanceof ApiError ? error.fieldErrors : {});
  }
  async create(): Promise<void> {
    if (!this.current() || this.busy() || this.loading()) return;
    const start = new Date(this.starts),
      end = new Date(this.ends);
    const errors: Record<string, string[]> = {};
    if (!this.starts || !Number.isFinite(start.getTime()))
      errors['starts_at'] = ['Choose a start date and time.'];
    if (!this.ends || !Number.isFinite(end.getTime()))
      errors['ends_at'] = ['Choose an end date and time.'];
    else if (end <= start) errors['ends_at'] = ['The end must be after the start.'];
    if (!this.reason.trim())
      errors['reason'] = ['Record why this inspection access is authorised.'];
    this.fields.set(errors);
    this.error.set('');
    this.notice.set('');
    if (Object.keys(errors).length) return;
    const body = {
      membership_id: this.data.membershipId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      reason: this.reason.trim(),
    };
    const signature = JSON.stringify(body);
    if (this.attempt?.body !== signature)
      this.attempt = { body: signature, key: crypto.randomUUID() };
    this.busy.set(true);
    try {
      await this.auth.api(this.root(), body, 'POST', { 'Idempotency-Key': this.attempt.key });
      if (!this.current()) return;
      this.attempt = undefined;
      this.reason = '';
      await this.load();
      if (this.current() && !this.error()) this.notice.set('Inspection access saved.');
    } catch (error) {
      if (this.current()) this.fail(error);
    } finally {
      this.busy.set(false);
    }
  }
  chooseRevoke(row: InspectorEngagementRead): void {
    if (!this.current() || this.busy() || row.revoked_at) return;
    this.revokeReason = '';
    this.fields.set({});
    this.error.set('');
    this.notice.set('');
    this.revoking.set(row);
  }
  async revoke(): Promise<void> {
    const row = this.revoking();
    if (!row || !this.current() || this.busy() || this.loading()) return;
    if (!this.revokeReason.trim()) {
      this.fields.set({ reason: ['Record why access is being revoked.'] });
      return;
    }
    this.busy.set(true);
    this.fields.set({});
    this.error.set('');
    try {
      await this.auth.api(
        `${this.root()}/${row.id}/revoke`,
        { reason: this.revokeReason.trim() },
        'POST',
        { 'If-Match': row.etag },
      );
      if (!this.current()) return;
      this.revoking.set(null);
      await this.load();
      if (this.current() && !this.error()) this.notice.set('Inspection access revoked.');
    } catch (error) {
      if (this.current()) {
        this.fail(error);
        if (error instanceof ApiError && error.status === 412) this.revoking.set(null);
      }
    } finally {
      this.busy.set(false);
    }
  }
  close(): void {
    if (!this.busy()) this.ref.close();
  }
}
