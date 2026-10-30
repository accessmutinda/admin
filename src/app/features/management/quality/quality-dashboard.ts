import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { QualityService } from './quality.service';
import { AccessRequired } from '../shared/access-required';
import { QualityDashboardPanel } from './quality-dashboard-panel';
import { QUALITY_DASHBOARDS, QualityPanel } from './quality-dashboard.models';
import { ToastService } from '../../../shared/ui/toast.service';

@Component({
  selector: 'cv-quality-dashboard',
  imports: [
    FormsModule,
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    A11yModule,
    AccessRequired,
    QualityDashboardPanel,
  ],
  templateUrl: './quality-dashboard.html',
  styleUrl: './quality-dashboard.css',
  host: { class: 'quality-dashboard-page' },
})
export class QualityDashboardPage {
  protected readonly service = inject(QualityService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly toast = inject(ToastService);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly dashboard = computed(() =>
    QUALITY_DASHBOARDS.find((p) => p.slug === (this.params().get('dashboard') ?? '')),
  );
  protected readonly month = signal('2025-04-01');
  protected readonly location = signal('All Locations');
  protected readonly locations = [
    'All Locations',
    'London',
    'Manchester',
    'Birmingham',
    'Bristol',
    'Leeds',
    'Liverpool',
    'Nottingham',
    'Sheffield',
    'Newcastle',
    'Brighton',
  ];
  protected readonly detail = signal<QualityPanel | null>(null);
  protected readonly query = signal('');
  protected readonly evidenceOpen = signal(false);
  protected readonly savedEvidence = signal<string[][]>([]);
  protected readonly evidenceError = signal('');
  protected evidenceTitle = '';
  protected evidenceArea = 'Safe';
  protected evidenceStatement = '';
  protected evidenceOwner = '';
  protected readonly isSnapshot = computed(() => this.month() === '2025-04-01');
  protected readonly panels = computed(() =>
    (this.dashboard()?.panels ?? []).map((p) =>
      p.title === 'Evidence Library'
        ? { ...p, rows: [...this.savedEvidence(), ...(p.rows ?? [])] }
        : p,
    ),
  );
  constructor() {
    effect(() => {
      this.title.setTitle((this.dashboard()?.title ?? 'Quality & Compliance') + ' · CareVerity');
      this.params();
      this.detail.set(null);
      this.query.set('');
    });
    effect(() => {
      const company = this.service.store.company()?.id;
      try {
        const saved: unknown = JSON.parse(
          localStorage.getItem('cv-quality-evidence:' + company) ?? '[]',
        );
        this.savedEvidence.set(
          Array.isArray(saved)
            ? saved.filter(
                (row) =>
                  Array.isArray(row) &&
                  row.length === 7 &&
                  row.every((cell) => typeof cell === 'string'),
              )
            : [],
        );
      } catch {
        this.savedEvidence.set([]);
      }
    });
  }
  protected moveMonth(offset: number): void {
    const date = new Date(this.month() + 'T12:00:00Z');
    date.setUTCMonth(date.getUTCMonth() + offset);
    this.month.set(date.toISOString().slice(0, 10));
  }
  protected openDetail(panel: QualityPanel): void {
    this.query.set('');
    this.detail.set(panel);
  }
  protected openEvidence(): void {
    if (!this.service.can('create')) return;
    this.evidenceTitle = '';
    this.evidenceArea = 'Safe';
    this.evidenceStatement = '';
    this.evidenceOwner = this.service.auth.currentUser()?.name ?? '';
    this.evidenceError.set('');
    this.evidenceOpen.set(true);
  }
  protected saveEvidence(): void {
    if (!this.service.can('create')) return;
    if (
      !this.evidenceTitle.trim() ||
      !this.evidenceStatement.trim() ||
      !this.evidenceOwner.trim()
    ) {
      this.evidenceError.set('Enter a title, quality statement and owner.');
      return;
    }
    const date = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Europe/London',
    }).format(new Date());
    const rows = [
      [
        this.evidenceTitle.trim(),
        this.evidenceArea,
        this.evidenceStatement.trim(),
        this.evidenceOwner.trim(),
        'Pending',
        'v1.0',
        date,
      ],
      ...this.savedEvidence(),
    ];
    try {
      localStorage.setItem(
        'cv-quality-evidence:' + this.service.store.company()?.id,
        JSON.stringify(rows),
      );
      this.savedEvidence.set(rows);
      this.evidenceOpen.set(false);
      if (this.detail()?.title === 'Evidence Library')
        this.detail.set(this.panels().find((p) => p.title === 'Evidence Library') ?? null);
      this.toast.success('Evidence record saved for review.');
    } catch {
      this.evidenceError.set(
        'Could not save the record. Check available browser storage and try again.',
      );
    }
  }
  protected exportPanel(): void {
    if (!this.service.can('export')) return;
    const panel = this.detail();
    if (!panel) return;
    const branchColumn =
      panel.columns?.findIndex(
        (c) => /branch/i.test(c) || (c === 'Area' && panel.title === 'Predictive Alerts'),
      ) ?? -1;
    const rows = (
      panel.rows ??
      panel.series?.map((s) => [s.label, ...s.values.map(String)]) ??
      []
    ).filter(
      (row) =>
        (this.location() === 'All Locations' ||
          branchColumn < 0 ||
          row[branchColumn]?.includes(this.location())) &&
        row.join(' ').toLowerCase().includes(this.query().toLowerCase()),
    );
    const safe = (value: string) =>
      '"' + (/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"';
    const csv = [panel.columns ?? (panel.series ? ['Series', 'Values'] : []), ...rows]
      .map((row) => row.map(safe).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = panel.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
