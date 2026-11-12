import { Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { AcademyDate } from './academy-date';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyReportsApi, ReportKind } from './academy-reports-api.service';
@Component({
  host: { class: 'module-page academy-page' },
  selector: 'cv-academy-reports',
  imports: [
    AcademyDate,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
  ],
  templateUrl: './academy-reports.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-workflows.css'],
})
export class AcademyReports {
  protected readonly api = inject(AcademyReportsApi);
  protected from = '';
  protected to = '';
  protected branch = 'All';
  protected role = 'All';
  protected heatmapPage = 1;
  protected auditPage = 1;
  protected readonly error = this.api.error;
  protected readonly notice = signal('');
  private request = 0;
  private destroyed = false;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.request++;
    });
    effect(() => {
      this.api.scope();
      this.api.available();
      untracked(() => {
        this.from = this.to = '';
        this.branch = this.role = 'All';
        this.heatmapPage = this.auditPage = 1;
        this.notice.set('');
        void this.reload(true);
      });
    });
  }
  private filters() {
    return {
      from_date: this.from || undefined,
      to_date: this.to || undefined,
      branch: this.branch,
      role: this.role,
    };
  }
  protected async reload(initial = false) {
    const request = ++this.request,
      scope = this.api.scope();
    await this.api.load(initial ? {} : this.filters(), this.heatmapPage, this.auditPage);
    if (request !== this.request || scope !== this.api.scope()) return;
    const data = this.api.data();
    if (data) {
      const heatmap = Math.max(1, Math.ceil(data.count / 8));
      const audit = Math.max(1, Math.ceil(data.audit.count / 8));
      if (this.heatmapPage > heatmap || this.auditPage > audit) {
        this.heatmapPage = Math.min(this.heatmapPage, heatmap);
        this.auditPage = Math.min(this.auditPage, audit);
        await this.reload(initial);
        return;
      }
    }
    const filters = this.api.data()?.meta.filters;
    if (filters) {
      this.from = filters.from_date ?? '';
      this.to = filters.to_date ?? '';
    }
  }
  protected filtersChanged() {
    this.heatmapPage = this.auditPage = 1;
    this.notice.set('');
    void this.reload();
  }
  protected paginate(kind: 'heatmap' | 'audit', change: number) {
    if (kind === 'heatmap') this.heatmapPage += change;
    else this.auditPage += change;
    void this.reload();
  }
  protected branches() {
    return this.api.data()?.branches ?? [];
  }
  protected roles() {
    return this.api.data()?.roles ?? [];
  }
  protected stats() {
    return this.api.data()?.stats ?? [];
  }
  protected months() {
    return this.api.data()?.months ?? [];
  }
  protected breakdown(key: 'location' | 'role') {
    return (key === 'location' ? this.api.data()?.byBranch : this.api.data()?.byRole) ?? [];
  }
  protected risk() {
    return this.api.data()?.risk ?? [];
  }
  protected heatmapCourses() {
    return this.api.data()?.results ?? [];
  }
  protected heatmapPages() {
    return Math.max(1, Math.ceil((this.api.data()?.count ?? 0) / 8));
  }
  protected cell(courseId: string, branch: string) {
    return (
      this.heatmapCourses()
        .find((c) => c.id === courseId)
        ?.cells.find((c) => c.branch === branch)?.percent ?? null
    );
  }
  protected eventRows() {
    return this.api.data()?.audit.results ?? [];
  }
  protected auditPages() {
    return Math.max(1, Math.ceil((this.api.data()?.audit.count ?? 0) / 8));
  }
  protected async export(kind: ReportKind) {
    this.notice.set('');
    const scope = this.api.scope(),
      filters = this.filters();
    const completed = await this.api.download(kind, filters);
    if (
      completed &&
      !this.destroyed &&
      scope === this.api.scope() &&
      JSON.stringify(filters) === JSON.stringify(this.filters())
    )
      this.notice.set('Report prepared from saved workspace records.');
  }
}
