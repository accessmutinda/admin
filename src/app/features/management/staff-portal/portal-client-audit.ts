import { Component, computed, inject, signal, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { csv } from '../care/care.models';
import { PortalClientContext } from './portal-client-context';
import { PortalEvent } from './portal.models';
@Component({
  selector: 'cv-portal-client-audit',
  imports: [DatePipe, FormsModule, RouterLink, MatSelectModule, CvSelect],
  templateUrl: './portal-client-audit.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-audit.css'],
})
export class PortalClientAudit {
  protected readonly context = inject(PortalClientContext);
  protected readonly direction = signal('All');
  protected readonly query = signal('');
  protected readonly type = signal('All');
  protected readonly category = signal('All');
  protected readonly pageSize = signal(12);
  protected group(type: string): string {
    return ['Journal', 'Staff action', 'Concern', 'Allocation', 'Care record'].includes(type)
      ? type
      : 'Professional';
  }
  protected readonly groups = computed(() => [
    ...new Set(this.context.audit().map((e) => this.group(e.category))),
  ]);
  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.pages() }, (_, i) => i + 1),
  );
  protected readonly user = signal('All');
  protected readonly status = signal('All');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly page = signal(1);
  protected readonly selected = signal<PortalEvent | null>(null);
  protected readonly categories = computed(() => [
    ...new Set(this.context.audit().map((e) => e.category)),
  ]);
  protected readonly users = computed(() => [...new Set(this.context.audit().map((e) => e.actor))]);
  protected readonly statuses = computed(() => [
    ...new Set(this.context.audit().map((e) => e.status)),
  ]);
  protected readonly records = computed(() =>
    this.context
      .audit()
      .filter(
        (e) =>
          (!this.query() ||
            [e.action, e.detail, e.actor].some((v) =>
              v.toLowerCase().includes(this.query().toLowerCase()),
            )) &&
          (this.type() === 'All' || e.category === this.type()) &&
          (this.category() === 'All' || this.group(e.category) === this.category()) &&
          (this.direction() === 'All' || (e.direction ?? 'Internal') === this.direction()) &&
          (this.user() === 'All' || e.actor === this.user()) &&
          (this.status() === 'All' || e.status === this.status()) &&
          (!this.from() || e.at.slice(0, 10) >= this.from()) &&
          (!this.to() || e.at.slice(0, 10) <= this.to()),
      ),
  );
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil(this.records().length / this.pageSize())),
  );
  protected readonly activePage = computed(() => Math.min(this.page(), this.pages()));
  protected readonly visible = computed(() =>
    this.records().slice(
      (this.activePage() - 1) * this.pageSize(),
      this.activePage() * this.pageSize(),
    ),
  );
  protected readonly summary = computed(() => [
    { name: 'Total records', count: this.context.audit().length, icon: 'receipt_long' },
    ...[
      ['Emails', 'Email', 'mail'],
      ['Calls', 'Phone call', 'call'],
      ['Journal entries', 'Journal', 'forum'],
      ['GP notes', 'GP note', 'stethoscope'],
      ['District nurse', 'District nurse note', 'medical_services'],
      ['OT related', 'OT request', 'accessible'],
      ['Management', 'Management action', 'verified_user'],
    ].map(([name, category, icon]) => ({
      name,
      icon,
      count: this.context.audit().filter((e) => e.category === category).length,
    })),
  ]);
  protected readonly communication = computed(() =>
    this.context.communications().find((c) => c.id === this.selected()?.entityId),
  );
  private openedInitial = false;
  constructor() {
    effect(() => {
      const records = this.records();
      const selected = this.selected();
      if (!this.openedInitial && records.length) {
        this.openedInitial = true;
        this.selected.set(records[0]);
      } else if (selected && !records.some((e) => e.id === selected.id)) this.selected.set(null);
    });
  }
  protected reset(): void {
    this.category.set('All');
    this.direction.set('All');
    this.query.set('');
    this.type.set('All');
    this.user.set('All');
    this.status.set('All');
    this.from.set('');
    this.to.set('');
    this.page.set(1);
  }
  protected export(): void {
    const rows = [
      [
        'Date / time',
        'Type',
        'Subject / description',
        'User',
        'Contact / recipient',
        'Direction',
        'Status',
      ],
      ...this.records().map((e) => [
        e.at,
        e.category,
        e.action + ' · ' + e.detail,
        e.actor,
        e.recipient ?? '',
        e.direction ?? 'Internal',
        e.status,
      ]),
    ];
    const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'communication-audit-' + this.context.id() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
