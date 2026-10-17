import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { HrService } from './hr.service';
import { complianceRows } from './hr-queues.models';

@Component({
  selector: 'cv-hr-compliance',
  host: { class: 'module-page people-page hr-workspace-page' },
  imports: [FormsModule, RouterLink, MatSelectModule, CvSelect],
  templateUrl: './hr-compliance.html',
  styleUrls: ['./hr.css', './hr-directory.css', './hr-tables.css', './hr-queues.css'],
})
export class HrCompliance {
  protected readonly hr = inject(HrService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly q = computed(() => this.params().get('q') ?? '');
  protected readonly status = computed(() => this.params().get('check') ?? 'outstanding');
  protected readonly type = computed(() => this.params().get('checkType') ?? '');
  protected readonly branch = computed(() => this.params().get('branch') ?? '');
  protected readonly all = computed(() => complianceRows(this.hr.staff()));
  protected readonly types = computed(() =>
    [...new Set(this.all().map((row) => row.check.title))].sort(),
  );
  protected readonly branches = computed(() =>
    [...new Set(this.all().map((row) => row.person.location))].sort(),
  );
  protected readonly rows = computed(() =>
    this.all()
      .filter(
        (row) =>
          `${row.person.name} ${row.person.hr?.reference} ${row.check.title}`
            .toLowerCase()
            .includes(this.q().trim().toLowerCase()) &&
          (!this.type() || row.check.title === this.type()) &&
          (!this.branch() || row.person.location === this.branch()) &&
          (this.status() === 'all' ||
            (this.status() === 'outstanding'
              ? row.state !== 'Verified'
              : this.status() === 'Renewal required'
                ? ['Due soon', 'Expired'].includes(row.state)
                : this.status() === 'Awaiting review'
                  ? ['Pending', 'Recorded', 'Needs evidence'].includes(row.state)
                  : row.state === this.status())),
      )
      .sort((a, b) => {
        const priority = (state: string) =>
          [
            'Expired',
            'Due soon',
            'Needs evidence',
            'Not started',
            'Pending',
            'Recorded',
            'Verified',
          ].indexOf(state);
        return (
          priority(a.state) - priority(b.state) ||
          a.person.name.localeCompare(b.person.name) ||
          a.check.title.localeCompare(b.check.title)
        );
      }),
  );
  protected readonly pageSize = 10;
  protected readonly page = computed(() => Math.max(1, Number(this.params().get('page')) || 1));
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil(this.rows().length / this.pageSize)),
  );
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pages()));
  protected readonly visible = computed(() =>
    this.rows().slice((this.currentPage() - 1) * this.pageSize, this.currentPage() * this.pageSize),
  );
  protected readonly stats = computed(() => [
    {
      label: 'Checks Not Started',
      value: this.all().filter((row) => row.state === 'Not started').length,
      caption: 'Checks still to be completed',
      status: 'Not started',
      icon: 'fact_check',
      color: '#008afa',
    },
    {
      label: 'Awaiting Review',
      value: this.all().filter((row) =>
        ['Pending', 'Recorded', 'Needs evidence'].includes(row.state),
      ).length,
      caption: 'Evidence or verification needed',
      status: 'Awaiting review',
      icon: 'pending_actions',
      color: '#03a6c1',
    },
    {
      label: 'Expiring Soon',
      value: this.all().filter((row) => row.state === 'Due soon').length,
      caption: 'Renew within 60 days',
      status: 'Due soon',
      icon: 'event_upcoming',
      color: '#ff8a00',
    },
    {
      label: 'Expired Checks',
      value: this.all().filter((row) => row.state === 'Expired').length,
      caption: 'Renewal overdue',
      status: 'Expired',
      icon: 'warning',
      color: '#ff3047',
    },
  ]);
  protected set(key: string, value: string | number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value || null, ...(key === 'page' ? {} : { page: null }) },
      queryParamsHandling: 'merge',
    });
  }
  protected clear(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
  protected export(): void {
    this.hr.exportRows('workforce-compliance-checks.csv', [
      [
        'Staff reference',
        'Staff member',
        'Branch',
        'Check',
        'Status',
        'Completed',
        'Expiry',
        'Reviewer',
        'Evidence',
      ],
      ...this.rows().map((row) => [
        row.person.hr!.reference,
        row.person.name,
        row.person.location,
        row.check.title,
        row.state,
        row.check.completed,
        row.check.expiry,
        row.check.reviewer,
        row.evidence?.name ?? 'Missing',
      ]),
    ]);
  }
}
