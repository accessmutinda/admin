import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';

import type { WorkforceStaff, WorkforceSummary, WorkforcePage } from './workforce.generated';
export type DirectoryStaff = WorkforceStaff;
export type { WorkforceSummary, WorkforcePage } from './workforce.generated';
@Injectable({ providedIn: 'root' })
export class PeopleApiService {
  readonly access = inject(CompanyAccessService);
  private readonly auth = inject(AuthService);
  readonly summary = signal<WorkforceSummary | null>(null);
  readonly directory = signal<WorkforcePage | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly exportBusy = signal(false);
  readonly companyId = this.access.companyId;
  readonly allowed = computed(() => this.access.can('people', 'records', 'read'));
  private generation = 0;
  private scope = '';
  constructor() {
    effect(() => {
      const scope = `${this.auth.profile()?.id ?? ''}:${this.companyId()}:${this.allowed()}`;
      untracked(() => {
        if (scope !== this.scope) {
          this.scope = scope;
          this.reset();
        }
      });
    });
  }
  reset(): void {
    this.generation++;
    this.summary.set(null);
    this.directory.set(null);
    this.error.set('');
    this.loading.set(true);
  }
  async load(query: string): Promise<void> {
    const id = this.companyId();
    const generation = ++this.generation;
    this.summary.set(null);
    this.directory.set(null);
    this.error.set('');
    this.loading.set(true);
    if (!id || !this.allowed()) {
      this.loading.set(false);
      return;
    }
    try {
      const [summary, page] = await Promise.all([
        this.auth.api<WorkforceSummary>(`/companies/${id}/hr/summary`),
        this.auth.api<WorkforcePage>(`/companies/${id}/staff?${query}`),
      ]);
      if (generation !== this.generation || id !== this.companyId() || !this.allowed()) return;
      if (
        summary.company_id !== id ||
        page.meta.company_id !== id ||
        page.results.some((row) => row.company_id !== id)
      )
        throw new Error('The returned workforce does not match this company.');
      this.summary.set(summary);
      this.directory.set(page);
    } catch (error) {
      if (generation === this.generation && id === this.companyId())
        this.error.set(
          error instanceof Error ? error.message : 'Workforce information is unavailable.',
        );
    } finally {
      if (generation === this.generation && id === this.companyId()) this.loading.set(false);
    }
  }
  async export(query: string, ids: string[] = []): Promise<void> {
    const company = this.companyId();
    const actor = this.auth.profile()?.id;
    if (!this.allowed()) return;
    if (this.exportBusy() || !company || !this.access.can('people', 'records', 'export')) return;
    if (ids.length > 100) {
      this.error.set('Select up to 100 staff records for one export.');
      return;
    }
    const args = new URLSearchParams(query);
    args.delete('page');
    args.delete('page_size');
    if (ids.length) args.set('ids', ids.join(','));
    this.exportBusy.set(true);
    this.error.set('');
    try {
      const blob = await this.auth.api<Blob>(
        `/companies/${company}/staff/export?${args}`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      if (
        actor !== this.auth.profile()?.id ||
        company !== this.companyId() ||
        !this.allowed() ||
        !this.access.can('people', 'records', 'export')
      )
        return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'staff-directory.csv';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      if (company === this.companyId())
        this.error.set(error instanceof Error ? error.message : 'Staff export is unavailable.');
    } finally {
      this.exportBusy.set(false);
    }
  }
}
