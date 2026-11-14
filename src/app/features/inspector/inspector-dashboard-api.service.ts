import { AuthService } from '../../core/auth/auth.service';
import { download } from './inspector-download';
import { Injectable, computed, inject } from '@angular/core';
import { InspectorReportsApi } from './inspector-reports-api.service';
import { InspectorDashboardRead, InspectorReportRead } from './inspector-provider.generated';

@Injectable({ providedIn: 'root' })
export class InspectorDashboardApi extends InspectorReportsApi {
  protected override root() {
    return `/companies/${this.companyId()}/inspector/dashboard`;
  }
  private readonly dashboardAuth = inject(AuthService);
  readonly canPack = computed(
    () => !!this.dashboard()?.capabilities['download'] && this.packDocuments().length > 0,
  );
  readonly packDocuments = computed(() => this.documents().filter((d) => d.downloadable));
  async pack(): Promise<void> {
    if (!this.canPack()) throw Error('Downloading evidence packs is not permitted.');
    const rows = this.packDocuments();
    if (rows.length > 50)
      throw Error('Select up to 50 files in Documents & Evidence to download a pack.');
    await this.binary(
      `/companies/${this.companyId()}/inspector/documents/pack`,
      'inspection-evidence.zip',
      'application/zip',
      () =>
        this.canPack() &&
        rows.every((row) =>
          this.packDocuments().some(
            (current) => current.id === row.id && current.source_version === row.source_version,
          ),
        ),
      { documents: rows.map((r) => ({ id: r.id, source_version: r.source_version })) },
    );
  }
  override async export(filters: Record<string, string> = {}): Promise<void> {
    if (!this.canDownload()) throw Error('Exporting the dashboard is not permitted.');
    await this.binary(
      this.root() + '/export?' + new URLSearchParams(filters).toString(),
      'inspection-dashboard.csv',
      'text/csv;charset=utf-8',
      () => this.canDownload(),
    );
  }
  private async binary(
    path: string,
    filename: string,
    mime: string,
    permitted: () => boolean,
    body?: unknown,
  ) {
    const lifecycle = this.lifecycle,
      scope = this.scope();
    try {
      const blob = await this.dashboardAuth.api<Blob>(
        path,
        body,
        body ? 'POST' : undefined,
        undefined,
        'blob',
      );
      if (!this.ready() || scope !== this.scope() || lifecycle !== this.lifecycle) return;
      if (!permitted())
        throw Error(
          'This download is no longer permitted. Review current access and evidence, then retry.',
        );
      download(blob, filename, mime);
    } catch (error) {
      if (scope !== this.scope() || lifecycle !== this.lifecycle) return;
      await this.load();
      if (!this.ready() || scope !== this.scope() || lifecycle !== this.lifecycle) return;
      throw error;
    }
  }
  protected override validate(value: InspectorReportRead) {
    super.validate(value);
    const data = value as InspectorDashboardRead;
    if (
      !data.summary ||
      !data.preparation ||
      Object.values(data.summary).some((n) => n !== null && (!Number.isInteger(n) || n < 0)) ||
      [
        'service_users',
        'staff_records',
        'open_findings',
        'evidence_documents',
        'expired_evidence',
      ].some((k) => !(k in data.summary)) ||
      [
        'registration_recorded',
        'evidence_covered',
        'findings_resolved',
        'questions_assessed',
        'summary_recorded',
      ].some((k) => !(k in data.preparation))
    )
      throw Error('The dashboard response is incomplete. Please retry.');
  }
  readonly dashboard = computed(() => this.value() as InspectorDashboardRead | null);
}
