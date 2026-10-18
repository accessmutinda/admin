import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RotaService } from './rota.service';
import { RotaVisit, addDays, completedVisit, londonDate, londonInstant } from './rota.models';

@Component({
  selector: 'cv-visits-attention',
  imports: [DatePipe, RouterLink],
  template: `
    @if (service.can('view')) {
      <section class="co-surface attention-panel" aria-labelledby="visits-attention-title">
        <div class="attention-heading">
          <h2 id="visits-attention-title">
            <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>Needs
            attention
          </h2>
          <small>Upcoming care · UK visit times</small>
        </div>
        <div class="attention-grid">
          @for (group of groups(); track group.key) {
            <article [attr.aria-labelledby]="'attention-' + group.key">
              <div class="attention-group-heading">
                <span
                  class="material-symbols-outlined"
                  [class.has-issues]="group.rows.length > 0"
                  aria-hidden="true"
                  >{{ group.icon }}</span
                >
                <div>
                  <h3 [id]="'attention-' + group.key">{{ group.title }}</h3>
                  <small>{{ group.period }}</small>
                </div>
                <span class="attention-count">{{ group.rows.length }}</span>
              </div>
              @for (
                row of expanded().includes(group.key) ? group.rows : group.rows.slice(0, 3);
                track row.visit.id
              ) {
                <div class="attention-row">
                  <div class="attention-copy">
                    <strong>{{ row.visit.clientName }}</strong>
                    <small
                      >{{ row.visit.date | date: 'dd MMM' }} · {{ row.visit.start }}–{{
                        row.visit.end
                      }}
                      · {{ row.visit.callName }}</small
                    >
                    <p>{{ row.detail }}</p>
                    @if (group.key === 'unallocated' && row.visit.timeSensitive) {
                      <span class="attention-sensitive">Time-sensitive call</span>
                    }
                  </div>
                  <a
                    [routerLink]="
                      group.key === 'drafts' ? '/manage/rota/publishing' : '/manage/rota/planner'
                    "
                    [queryParams]="
                      group.key === 'drafts'
                        ? {
                            visit: row.visit.id,
                            client: row.visit.clientId,
                            from: row.visit.date,
                            to: row.visit.date,
                          }
                        : { visit: row.visit.id }
                    "
                    [attr.aria-label]="
                      row.action +
                      ': ' +
                      row.visit.clientName +
                      ', ' +
                      row.visit.date +
                      ' ' +
                      row.visit.start
                    "
                    >{{ row.action
                    }}<span class="material-symbols-outlined" aria-hidden="true"
                      >chevron_right</span
                    ></a
                  >
                </div>
              } @empty {
                <p class="attention-empty">
                  <span class="material-symbols-outlined" aria-hidden="true">check_circle</span
                  >{{ group.empty }}
                </p>
              }
              @if (group.rows.length > 3) {
                <button
                  class="attention-more"
                  (click)="toggle(group.key)"
                  [attr.aria-expanded]="expanded().includes(group.key)"
                >
                  {{
                    expanded().includes(group.key) ? 'Show fewer' : 'Show all ' + group.rows.length
                  }}<span class="sr-only"> {{ group.title }}</span>
                </button>
              }
            </article>
          }
        </div>
      </section>
    }
  `,
  styleUrl: './visits-attention.css',
})
export class VisitsAttention {
  protected readonly service = inject(RotaService);
  private readonly now = signal(Date.now());
  protected readonly expanded = signal<string[]>([]);
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  private readonly upcoming = computed(() => {
    if (!this.service.can('view')) return [];
    const now = this.now();
    const horizon = now + 7 * 86400000;
    const today = londonDate(new Date(now));
    return this.service
      .data()
      .visits.filter((v) => {
        if (v.state === 'Cancelled' || completedVisit(v)) return false;
        const instant = londonInstant(v.date, v.start);
        return instant
          ? Date.parse(instant) >= now && Date.parse(instant) <= horizon
          : v.date >= today && v.date <= addDays(today, 7);
      })
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  });
  protected readonly groups = computed(() => {
    const visits = this.upcoming();
    const cutoff = this.now() + 86400000;
    const unallocated = visits.filter((v) => {
      const instant = londonInstant(v.date, v.start);
      return v.staffIds.length < v.carers && !!instant && Date.parse(instant) <= cutoff;
    });
    const conflicts = visits
      .map((visit) => ({ visit, issues: this.service.conflicts(visit) }))
      .filter((row) => row.issues.length > 0);
    return [
      {
        key: 'unallocated',
        title: 'Visits needing cover',
        period: 'Next 24 hours',
        icon: 'person_alert',
        empty: 'No visits need cover in the next 24 hours.',
        rows: unallocated.map((visit) => ({
          visit,
          detail: `${visit.carers - visit.staffIds.length} carer place(s) still needed`,
          action: this.service.can('manage') ? 'Assign staff' : 'Review visit',
        })),
      },
      {
        key: 'drafts',
        title: 'Unpublished drafts',
        period: 'Next 7 days',
        icon: 'edit_calendar',
        empty: 'No upcoming drafts awaiting publication.',
        rows: visits
          .filter((v) => v.state === 'Draft')
          .map((visit) => ({
            visit,
            detail: 'Draft visit · not yet published',
            action: 'Review draft',
          })),
      },
      {
        key: 'conflicts',
        title: 'Allocation conflicts',
        period: 'Next 7 days',
        icon: 'event_busy',
        empty: 'No recorded allocation conflicts for upcoming visits.',
        rows: conflicts.map(({ visit, issues }) => ({
          visit,
          detail: [...new Set(issues)].join(' '),
          action: 'Review conflict',
        })),
      },
    ];
  });
  protected toggle(key: string): void {
    this.expanded.update((keys) =>
      keys.includes(key) ? keys.filter((value) => value !== key) : [...keys, key],
    );
  }
}
