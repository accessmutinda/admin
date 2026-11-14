import { Injectable, computed, effect, inject, signal, untracked, DestroyRef } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';

export interface StaffAccount {
  id: string;
  user_id: number;
  employee_id: string;
  company_id: string;
  name: string;
  email: string;
  status: string;
  account_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  password_changed_at: string | null;
  mfa_override: string;
  mfa_required: boolean;
  mfa_enrolled: boolean;
  active_sessions: number;
  version: number;
  etag: string;
}
export type SecurityAction =
  'reset-password' | 'reset-mfa' | 'set-mfa' | 'suspend' | 'activate' | 'revoke-sessions';
interface AccountPage {
  count: number;
  results: StaffAccount[];
}
interface StaffChoice {
  id: string;
  employment_id: string;
  company_id: string;
  name: string;
}

@Injectable()
export class StaffAccountsApi {
  readonly access = inject(CompanyAccessService);
  private readonly auth = inject(AuthService);
  readonly companyId = this.access.companyId;
  readonly canRead = computed(() => this.access.can('people', 'users', 'read'));
  readonly canManage = computed(() => this.access.can('people', 'users', 'manage_users'));
  readonly scope = computed(
    () => `${this.auth.profile()?.id}:${this.companyId()}:${this.canRead()}:${this.canManage()}`,
  );
  readonly page = signal<AccountPage>({ count: 0, results: [] });
  readonly choices = signal<StaffChoice[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  private generation = 0;
  private choiceGeneration = 0;
  private currentScope = '';
  constructor() {
    effect(() => {
      const scope = this.scope();
      untracked(() => {
        if (scope === this.currentScope) return;
        this.currentScope = scope;
        this.generation++;
        this.choiceGeneration++;
        this.page.set({ count: 0, results: [] });
        this.choices.set([]);
        this.error.set('');
        this.notice.set('');
        this.saving.set(false);
        void this.load();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.generation++;
      this.choiceGeneration++;
    });
  }
  isSelf(row: StaffAccount): boolean {
    return String(row.user_id) === String(this.auth.profile()?.id);
  }
  private endpoint(): string {
    return `/companies/${this.companyId()}/hr/users`;
  }
  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'User management is unavailable.';
  }
  async load(q = '', offset = 0, status = ''): Promise<void> {
    const generation = ++this.generation,
      scope = this.scope(),
      company = this.companyId();
    this.error.set('');
    this.page.set({ count: 0, results: [] });
    this.loading.set(true);
    try {
      if (!company || !this.canRead()) return;
      const query = new URLSearchParams({
        q,
        offset: String(offset),
        limit: '50',
        ...(status ? { status } : {}),
      });
      if (!q) query.delete('q');
      const page = await this.auth.api<AccountPage>(this.endpoint() + '?' + query);
      if (scope !== this.scope() || generation !== this.generation) return;
      if (page.results.some((row) => row.company_id !== company))
        throw Error('The account list does not match the selected company.');
      this.page.set(page);
    } catch (error) {
      if (scope === this.scope() && generation === this.generation)
        this.error.set(this.message(error));
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async staff(q: string): Promise<void> {
    const scope = this.scope(),
      company = this.companyId(),
      generation = ++this.choiceGeneration;
    this.choices.set([]);
    if (!this.canManage() || !this.access.can('people', 'records', 'read')) return;
    const query = new URLSearchParams({ q, page_size: '50' });
    if (!q) query.delete('q');
    try {
      const page = await this.auth.api<{ results: StaffChoice[] }>(
        `/companies/${company}/staff?${query}`,
      );
      if (scope !== this.scope() || generation !== this.choiceGeneration) return;
      if (page.results.some((row) => row.company_id !== company))
        throw Error('The staff list does not match the selected company.');
      this.choices.set(page.results);
    } catch (error) {
      if (scope === this.scope() && generation === this.choiceGeneration)
        this.error.set(this.message(error));
    }
  }
  async save(
    row: StaffAccount | null,
    action: SecurityAction | 'provision',
    reason: string,
    mfaOverride = 'inherit',
    employmentId = '',
  ): Promise<boolean> {
    if (this.saving() || !this.canManage() || !this.canRead() || reason.trim().length < 3)
      return false;
    const scope = this.scope(),
      company = this.companyId();
    if (row && (row.company_id !== company || this.isSelf(row))) return false;
    this.error.set('');
    this.notice.set('');
    this.saving.set(true);
    try {
      const value = await this.auth.api<StaffAccount>(
        this.endpoint() + (row ? '/' + row.id : ''),
        action === 'provision'
          ? { employment_id: employmentId, reason: reason.trim() }
          : {
              action,
              reason: reason.trim(),
              ...(action === 'set-mfa' ? { mfa_override: mfaOverride } : {}),
            },
        'POST',
        row ? { 'If-Match': row.etag } : undefined,
      );
      if (scope !== this.scope()) return false;
      if (value.company_id !== company)
        throw Error('The saved account does not match the selected company.');
      this.notice.set(
        action === 'provision'
          ? `Login account ready: ${value.email}.`
          : `Security settings updated for ${value.name}.`,
      );
      return true;
    } catch (error) {
      if (scope === this.scope()) this.error.set(this.message(error));
      return false;
    } finally {
      if (scope === this.scope()) this.saving.set(false);
    }
  }
}
