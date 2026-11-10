import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import type { WorkforceCompliancePage } from './workforce-compliance.generated';
@Injectable({ providedIn: 'root' })
export class WorkforceComplianceApi {
  private readonly auth = inject(AuthService);
  readonly access = inject(CompanyAccessService);
  readonly companyId = this.access.companyId;
  readonly page = signal<WorkforceCompliancePage | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly exportBusy = signal(false);
  readonly allowed = computed(
    () =>
      this.access.can('people', 'compliance', 'read') &&
      this.access.can('people', 'records', 'read'),
  );
  readonly scope = computed(
    () =>
      `${this.auth.profile()?.id ?? ''}:${this.companyId()}:${JSON.stringify(this.access.context())}`,
  );
  private generation = 0;
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => {
        this.generation++;
        this.page.set(null);
        this.error.set('');
        this.loading.set(false);
      });
    });
  }
  async load(query: string): Promise<void> {
    const scope = this.scope(),
      company = this.companyId(),
      generation = ++this.generation;
    this.page.set(null);
    this.error.set('');
    this.loading.set(true);
    if (!company || !this.allowed()) {
      this.loading.set(false);
      this.error.set('Workforce compliance access is unavailable.');
      return;
    }
    try {
      const result = await this.auth.api<WorkforceCompliancePage>(
        `/companies/${company}/hr/compliance?${query}`,
      );
      if (scope !== this.scope() || generation !== this.generation) return;
      if (result.meta.company_id !== company)
        throw Error('The compliance response does not match this company.');
      this.page.set(result);
    } catch (error) {
      if (scope === this.scope() && generation === this.generation)
        this.error.set(
          error instanceof Error ? error.message : 'Workforce compliance is unavailable.',
        );
    } finally {
      if (scope === this.scope() && generation === this.generation) this.loading.set(false);
    }
  }
  async export(query: string): Promise<void> {
    if (this.exportBusy() || !this.allowed() || !this.access.can('people', 'compliance', 'export'))
      return;
    const scope = this.scope(),
      company = this.companyId(),
      params = new URLSearchParams(query);
    params.delete('page');
    params.delete('page_size');
    this.exportBusy.set(true);
    this.error.set('');
    try {
      const blob = await this.auth.api<Blob>(
        `/companies/${company}/hr/compliance/export?${params}`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      if (scope !== this.scope()) return;
      const url = URL.createObjectURL(blob),
        anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'workforce-compliance-checks.csv';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      if (scope === this.scope())
        this.error.set(
          error instanceof Error ? error.message : 'Compliance export is unavailable.',
        );
    } finally {
      this.exportBusy.set(false);
    }
  }
}
