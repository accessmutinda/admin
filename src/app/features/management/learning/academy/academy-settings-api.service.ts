import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import type {
  AcademySettingsRead,
  AcademySettingsWrite,
  AcademySettingsReminderRead,
} from './academy.generated';
import type { AcademySettings } from './academy.models';

@Injectable({ providedIn: 'root' })
export class AcademySettingsApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly store = inject(ManagementStore);
  readonly scope = inject(AcademyApi).scope;
  readonly available = computed(() => this.access.can('academy', 'governance', 'read'));
  readonly canEdit = computed(
    () => this.available() && this.access.can('academy', 'governance', 'edit'),
  );
  readonly canRemind = computed(
    () =>
      this.available() &&
      this.access.can('academy', 'governance', 'create') &&
      ['assignments', 'courses', 'results', 'certificates'].every((feature) =>
        this.access.can('academy', feature, 'read'),
      ),
  );
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  private readonly saved = signal<{ scope: string; value: AcademySettingsRead } | null>(null);
  readonly record = computed(() =>
    this.available() && this.saved()?.scope === this.scope() ? this.saved()!.value : null,
  );
  readonly settings = computed<AcademySettings | null>(() => {
    const row = this.record();
    return row
      ? {
          ...row,
          logoId: row.logoId ?? '',
          backgroundId: row.backgroundId ?? '',
          signatureId: row.signatureId ?? '',
          adminRoles: [],
        }
      : null;
  });
  private ticket = 0;
  private retry?: { scope: string; signature: string; key: string };
  constructor() {
    let previous = this.scope();
    effect(() => {
      const scope = this.scope();
      if (previous !== scope) {
        previous = scope;
        untracked(() => {
          this.ticket++;
          this.saved.set(null);
          this.error.set('');
          this.retry = undefined;
          this.loading.set(false);
        });
      }
    });
  }
  private root() {
    return `/companies/${this.store.companyId()}/academy/settings`;
  }
  private check(scope: string) {
    if (scope !== this.scope() || !this.available())
      throw Error('The workspace or settings access changed. Reopen this page.');
  }
  private accept(value: AcademySettingsRead, scope: string) {
    this.check(scope);
    if (value.company_id !== this.store.companyId())
      throw Error('The returned settings belong to another workspace.');
    this.saved.set({ scope, value });
  }
  private failure(error: unknown, scope: string) {
    if (scope !== this.scope()) return;
    const status = (error as { status?: number }).status;
    if ([401, 403, 404].includes(status ?? 0)) {
      this.saved.set(null);
      this.access.invalidate();
    }
    this.error.set((error as Error).message);
  }
  async load(force = false) {
    if (this.saving()) throw Error('Wait for the current settings operation to finish.');
    const scope = this.scope();
    this.check(scope);
    if (this.record() && !force) return;
    const ticket = ++this.ticket;
    this.loading.set(true);
    this.saved.set(null);
    this.error.set('');
    try {
      const value = await this.auth.api<AcademySettingsRead>(this.root());
      this.check(scope);
      if (ticket === this.ticket) this.accept(value, scope);
    } catch (error) {
      if (ticket === this.ticket) this.failure(error, scope);
      throw error;
    } finally {
      if (ticket === this.ticket) this.loading.set(false);
    }
  }
  private key(scope: string, signature: string) {
    if (this.retry?.scope !== scope || this.retry.signature !== signature)
      this.retry = { scope, signature, key: crypto.randomUUID() };
    return this.retry!.key;
  }
  async save(value: AcademySettings, etag: string) {
    const scope = this.scope();
    this.check(scope);
    if (!this.canEdit()) throw Error('Academy settings edit permission is required.');
    if (this.saving()) throw Error('Wait for the current settings operation to finish.');
    const body: AcademySettingsWrite = {
      passMark: value.passMark,
      maxAttempts: value.maxAttempts,
      timeLimitMinutes: value.timeLimitMinutes,
      validityMonths: value.validityMonths,
      reminderDays: value.reminderDays,
      dueSoonDays: value.dueSoonDays,
      refresherDays: value.refresherDays,
      overdueDays: value.overdueDays,
      shuffleQuestions: value.shuffleQuestions,
      shuffleOptions: value.shuffleOptions,
      sequentialLessons: value.sequentialLessons,
      showFeedback: value.showFeedback,
      allowSelfEnrolment: value.allowSelfEnrolment,
      portalNotifications: value.portalNotifications,
      showSignatureDate: value.showSignatureDate,
      template: value.template,
      primary: value.primary,
      secondary: value.secondary,
      issuer: value.issuer,
      signatureName: value.signatureName,
      signatureRole: value.signatureRole,
      logoId: value.logoId || null,
      backgroundId: value.backgroundId || null,
      signatureId: value.signatureId || null,
      notificationTemplates: structuredClone(value.notificationTemplates),
    };
    const key = this.key(scope, JSON.stringify([body, etag]));
    this.saving.set(true);
    this.error.set('');
    ++this.ticket;
    this.loading.set(false);
    try {
      const saved = await this.auth.api<AcademySettingsRead>(this.root(), body, 'PATCH', {
        'If-Match': etag,
        'Idempotency-Key': key,
      });
      this.accept(saved, scope);
      this.retry = undefined;
    } catch (error) {
      this.failure(error, scope);
      throw error;
    } finally {
      this.saving.set(false);
    }
  }
  async brandingBlob(assetId: string): Promise<Blob | null> {
    const row = this.record();
    if (!row || ![row.logoId, row.backgroundId, row.signatureId].includes(assetId)) return null;
    const scope = this.scope();
    this.check(scope);
    try {
      const blob = await this.auth.api<Blob>(
        `${this.root()}/${row.id}/media/${assetId}/content`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      this.check(scope);
      return blob;
    } catch (error) {
      this.failure(error, scope);
      throw error;
    }
  }

  async reminders() {
    const scope = this.scope();
    this.check(scope);
    if (!this.canRemind()) throw Error('Reminder permissions are required.');
    if (this.saving()) throw Error('Wait for the current settings operation to finish.');
    const key = this.key(scope, 'reminders');
    this.saving.set(true);
    this.error.set('');
    try {
      const value = await this.auth.api<AcademySettingsReminderRead>(
        this.root() + '/reminders',
        {},
        'POST',
        { 'Idempotency-Key': key },
      );
      this.check(scope);
      if (value.company_id !== this.store.companyId())
        throw Error('The returned reminders belong to another workspace.');
      this.retry = undefined;
      return value.notificationIds.length;
    } catch (error) {
      this.failure(error, scope);
      throw error;
    } finally {
      this.saving.set(false);
    }
  }
}
