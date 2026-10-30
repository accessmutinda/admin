import { Component, computed, input, output, signal } from '@angular/core';
import { QualityPanel } from './quality-dashboard.models';

@Component({
  selector: 'cv-quality-panel',
  templateUrl: './quality-dashboard-panel.html',
  styleUrl: './quality-dashboard-panel.css',
})
export class QualityDashboardPanel {
  readonly panel = input.required<QualityPanel>();
  readonly expanded = input(false);
  readonly location = input('All Locations');
  readonly query = input('');
  readonly view = output<QualityPanel>();
  readonly addEvidence = output<void>();
  readonly canCreate = input(false);
  readonly months = signal(12);
  readonly colors = ['#10b887', '#ffb52d', '#f23373', '#9872df'];
  readonly rows = computed(() => {
    const panel = this.panel();
    const branchColumn =
      panel.columns?.findIndex(
        (c) => /branch/i.test(c) || (c === 'Area' && panel.title === 'Predictive Alerts'),
      ) ?? -1;
    return (panel.rows ?? []).filter(
      (row) =>
        (this.location() === 'All Locations' ||
          branchColumn < 0 ||
          row[branchColumn]?.includes(this.location())) &&
        row.join(' ').toLowerCase().includes(this.query().toLowerCase()),
    );
  });
  readonly visibleRows = computed(() =>
    this.expanded() || this.panel().tall ? this.rows() : this.rows().slice(0, 10),
  );
  readonly labels = computed(() =>
    (this.panel().forecast
      ? ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
      : ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
    ).slice(this.months() === 6 && !this.panel().forecast ? -6 : 0),
  );
  readonly ticks = computed(() =>
    Array.from(
      { length: 5 },
      (_, i) =>
        (this.panel().min ?? 0) +
        (((this.panel().max ?? 100) - (this.panel().min ?? 0)) * (4 - i)) / 4,
    ),
  );
  readonly chartSeries = computed(() =>
    (this.panel().series ?? []).map((s) => ({
      ...s,
      values: this.months() === 6 && !this.panel().forecast ? s.values.slice(-6) : s.values,
    })),
  );
  readonly donut = computed(() => {
    let start = 0;
    const total = this.rows().reduce((n, r) => n + Number(r[1]), 0) || 1;
    const stops = this.rows().map((r, i) => {
      const end = start + (Number(r[1]) / total) * 100;
      const stop = `${this.colors[i % 4]} ${start}% ${end}%`;
      start = end;
      return stop;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });
  points(values: number[]): string {
    return values.map((v, i) => `${this.x(i, values.length)},${this.y(v)}`).join(' ');
  }
  x(i: number, count: number): number {
    return 42 + (i * 390) / Math.max(count - 1, 1);
  }
  y(value: number): number {
    return (
      174 -
      ((value - (this.panel().min ?? 0)) / ((this.panel().max ?? 100) - (this.panel().min ?? 0))) *
        150
    );
  }
  band(values: number[]): string {
    return [
      ...values.map(
        (v, i) =>
          `${this.x(i, values.length)},${this.y(Math.min(this.panel().max ?? 100, v + (this.panel().max ?? 100) * 0.13))}`,
      ),
      ...values
        .map(
          (v, i) =>
            `${this.x(i, values.length)},${this.y(Math.max(0, v - (this.panel().max ?? 100) * 0.13))}`,
        )
        .reverse(),
    ].join(' ');
  }
  radar(values: number[], radius = 110): string {
    return values
      .map((v, i) => {
        const a = ((i * 72 - 90) * Math.PI) / 180;
        return `${160 + (Math.cos(a) * radius * v) / 100},${140 + (Math.sin(a) * radius * v) / 100}`;
      })
      .join(' ');
  }
  tone(value: string): string {
    if (/^(High|Overdue|Urgent)$/.test(value)) return 'danger';
    if (/^(Medium|Due soon|At risk|In review|Pending)$/.test(value)) return 'warning';
    if (
      /^(Good|Approved|Completed|Complete|Covered|Resolved|On track|Accommodated|Low)$/.test(value)
    )
      return 'success';
    if (/^(Outstanding|In progress|Scheduled|Safe|Effective)$/.test(value)) return 'info';
    if (/^(Caring)$/.test(value)) return 'pink';
    if (/^(Responsive)$/.test(value)) return 'purple';
    if (/^(Well-led)$/.test(value)) return 'success';
    if (/^(Not started|Upcoming|Archived)$/.test(value)) return 'muted';
    return '';
  }
  heat(value: string, column: number): string {
    if (this.panel().kind !== 'heatmap' || !column || this.tone(value)) return '';
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return '';
    const heading = this.panel().columns?.[column] ?? '';
    if (/quality|cqc|compliance|coverage|score/i.test(heading))
      return n >= 90 ? 'heat-good' : n >= 80 ? 'heat-medium' : 'heat-high';
    if (/vacancy|sickness/i.test(heading))
      return n < 5 ? 'heat-good' : n < 7 ? 'heat-medium' : 'heat-high';
    if (/staff required|staff in post|total/i.test(heading)) return '';
    return n < 5 ? 'heat-good' : n < 8 ? 'heat-medium' : 'heat-high';
  }
  percent(value: string): number {
    return Math.max(0, Math.min(100, parseFloat(value) || 0));
  }
  areaIcon(value: string): string {
    return (
      (
        {
          Safe: 'verified_user',
          Effective: 'settings',
          Caring: 'favorite',
          Responsive: 'groups',
          'Well-led': 'bar_chart',
        } as Record<string, string>
      )[value] ?? ''
    );
  }
}
