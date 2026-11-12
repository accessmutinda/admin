import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import type {
  AcademyReportRead,
  AcademyReportFilters,
  AcademyReportExportQuery,
} from './academy.generated';

export type ReportFilters = AcademyReportFilters;
export type ReportKind = AcademyReportExportQuery['kind'];
@Injectable({ providedIn: 'root' })
export class AcademyReportsApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly store = inject(ManagementStore);
  readonly scope = inject(AcademyApi).scope;
  readonly available = computed(() =>
    ['reports', 'courses', 'assignments', 'results', 'certificates', 'governance'].every(
      (feature) => this.access.can('academy', feature, 'read'),
    ),
  );
  readonly canExport = computed(
    () => this.available() && this.access.can('academy', 'reports', 'export'),
  );
  private readonly source = signal<{ scope: string; value: AcademyReportRead } | null>(null);
  readonly data = computed(() => {
    const source = this.source();
    return this.available() && source?.scope === this.scope() ? source.value : null;
  });
  readonly error = signal('');
  readonly loading = signal(false);
  readonly exporting = signal(false);
  private ticket = 0;
  private exportTicket = 0;
  private fingerprint = '';
  constructor() {
    this.fingerprint = this.identity();
    effect(() => {
      this.identity();
      untracked(() => this.syncScope());
    });
  }
  private identity() {
    return JSON.stringify([this.scope(), this.available(), this.canExport()]);
  }
  private syncScope() {
    const current = this.identity();
    if (current !== this.fingerprint) {
      this.fingerprint = current;
      this.ticket++;
      this.exportTicket++;
      this.source.set(null);
      this.error.set('');
      this.loading.set(false);
      this.exporting.set(false);
    }
  }
  private root() {
    return `/companies/${this.store.companyId()}/academy/reports`;
  }
  private check(scope: string, exporting = false) {
    if (scope !== this.scope() || !(exporting ? this.canExport() : this.available()))
      throw Error('Training reports are unavailable for this workspace or access.');
  }
  private params(filters: ReportFilters, extra: Record<string, string | number>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...extra }))
      if (value !== undefined) params.set(key, String(value));
    return params.toString();
  }
  async load(filters: ReportFilters = {}, page = 1, auditPage = 1) {
    this.syncScope();
    const scope = this.scope(),
      ticket = ++this.ticket;
    this.source.set(null);
    this.error.set('');
    this.loading.set(true);
    try {
      this.check(scope);
      const value = await this.auth.api<AcademyReportRead>(
        this.root() + '?' + this.params(filters, { page, audit_page: auditPage }),
      );
      this.check(scope);
      if (value.meta.company_id !== this.store.companyId())
        throw Error('Report workspace mismatch.');
      if (ticket === this.ticket) this.source.set({ scope, value });
    } catch (error) {
      if (
        scope === this.scope() &&
        (ticket === this.ticket || [401, 403].includes((error as { status?: number }).status ?? 0))
      ) {
        if ([401, 403].includes((error as { status?: number }).status ?? 0)) {
          this.ticket++;
          this.exportTicket++;
          this.loading.set(false);
          this.exporting.set(false);
        }
        this.source.set(null);
        this.error.set((error as Error).message);
      }
    } finally {
      if (ticket === this.ticket) this.loading.set(false);
    }
  }
  async download(kind: ReportKind, filters: ReportFilters) {
    this.syncScope();
    if (this.exporting()) return false;
    const scope = this.scope(),
      ticket = ++this.exportTicket;
    this.exporting.set(true);
    this.error.set('');
    try {
      this.check(scope, true);
      const blob = await this.auth.api<Blob>(
        this.root() + '/export?' + this.params(filters, { kind }),
        undefined,
        undefined,
        undefined,
        'blob',
      );
      this.check(scope, true);
      if (ticket !== this.exportTicket) return false;
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `training-${kind}.${kind === 'evidence-pack' ? 'json' : 'csv'}`;
        link.click();
      } finally {
        URL.revokeObjectURL(url);
      }
      return true;
    } catch (error) {
      if (scope === this.scope() && ticket === this.exportTicket) {
        if ([401, 403].includes((error as { status?: number }).status ?? 0)) {
          this.ticket++;
          this.exportTicket++;
          this.loading.set(false);
          this.exporting.set(false);
        }
        this.source.set(null);
        this.error.set((error as Error).message);
      }
      return false;
    } finally {
      if (ticket === this.exportTicket) this.exporting.set(false);
    }
  }
}
