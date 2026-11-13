import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarePlanService } from './care-plan.service';
import { CarePlanApi } from './care-plan-api.service';
@Component({
  selector: 'cv-care-plan-register',
  imports: [FormsModule, DatePipe, RouterLink],
  styleUrl: './care-plan-register.css',
  templateUrl: './care-plan-register.html',
})
export class CarePlanRegister {
  protected readonly service = inject(CarePlanService);
  protected readonly api = this.service.connected ? (this.service as unknown as CarePlanApi) : null;
  constructor() {
    this.api?.connect();
  }
  protected readonly query = signal('');
  protected readonly status = signal('All');
  protected readonly rows = computed(() =>
    this.api
      ? this.api.registerRows()
      : this.service.care.clients().map((client) => {
          const versions = client.file?.carePlan?.versions || [];
          const current =
            versions.find((v) => ['Draft', 'In review'].includes(v.status)) ||
            versions.find((v) => v.status === 'Approved');
          const approved = versions.find((v) => v.status === 'Approved');
          return {
            client,
            current,
            approved,
            complete:
              current?.sections.filter(
                (s) =>
                  (!current.demoScope ||
                    ['About Me', 'Personal Care', 'Mobility'].includes(s.name)) &&
                  (s.complete || !s.required),
              ).length || 0,
            total: current?.demoScope ? 3 : 17,
            overdue: !!current?.review && current.review < new Date().toISOString().slice(0, 10),
          };
        }),
  );
  protected readonly awaiting = computed(() =>
    this.api
      ? (this.api.registerMetrics()?.awaiting ?? '—')
      : this.rows().filter((r) => r.current?.status === 'In review').length,
  );
  protected readonly overdue = computed(() =>
    this.api
      ? (this.api.registerMetrics()?.overdue ?? '—')
      : this.rows().filter((r) => r.overdue).length,
  );
  protected initials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('');
  }
  protected resetFilters() {
    this.query.set('');
    this.status.set('All');
  }
  protected readonly approved = computed(() =>
    this.api
      ? (this.api.registerMetrics()?.approved ?? '—')
      : this.rows().filter((r) => r.approved).length,
  );
  protected readonly filtered = computed(() =>
    this.rows().filter(
      (r) =>
        (!this.query() ||
          (r.client.name + ' ' + r.client.reference)
            .toLowerCase()
            .includes(this.query().toLowerCase())) &&
        (this.status() === 'All' ||
          (this.status() === 'Overdue'
            ? r.overdue
            : this.status() === (r.current?.status || 'Not started'))),
    ),
  );
}
