import { VisitsAttention } from './visits-attention';
import { QuickActions } from '../shared/quick-actions';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ModuleDesign } from '../shared/module-design';
import { AccessRequired } from '../shared/access-required';
import { VisitsNavigation } from './visits-navigation';
import { RotaService } from './rota.service';
import { addDays, londonDate } from './rota.models';
import { emptyEcm, liveVisit } from '../ecm/ecm.models';

@Component({
  selector: 'cv-visits-workspace',
  imports: [
    DatePipe,
    RouterLink,
    RouterOutlet,
    ModuleDesign,
    AccessRequired,
    VisitsNavigation,
    QuickActions,
    VisitsAttention,
  ],
  host: { class: 'module-page operations-page visits-workspace' },
  styleUrls: ['../care/care-shared.css', '../care/care-controls.css', './visits-workspace.css'],
  template: `
    <cv-module-design />
    <nav class="co-breadcrumb" aria-label="Breadcrumb">
      <a routerLink="/manage/rota">Care Delivery</a><span aria-hidden="true">›</span
      ><span>Visits & Rota</span>
    </nav>
    <div class="care-heading">
      <div>
        <h1>Visits & Rota</h1>
        <p>Plan care schedules, manage call packages and publish confirmed visits.</p>
      </div>
      <div class="care-actions">
        @if (service.can('view') && !showViews()) {
          <a class="care-button" routerLink="/manage/rota/overview"
            ><span class="material-symbols-outlined" aria-hidden="true">dashboard</span>All views</a
          >
        }
        @if (service.can('view') && service.can('manage')) {
          <a
            class="care-button primary"
            routerLink="/manage/rota/planner"
            [queryParams]="{ plan: 'true' }"
            ><span class="material-symbols-outlined" aria-hidden="true">add</span>Plan visits</a
          >
        }
      </div>
    </div>
    @if (service.can('view')) {
      <div class="care-stats" aria-label="Current week visit summary">
        @for (stat of stats(); track stat.label) {
          <section class="metric co-stat co-surface" [attr.data-tone]="stat.tone">
            <span class="co-stat-icon material-symbols-outlined" aria-hidden="true">{{
              stat.icon
            }}</span>
            <div>
              <h2>{{ stat.label }}</h2>
              <strong>{{ stat.value }}</strong
              ><small>{{ start | date: 'dd MMM' }} – {{ end | date: 'dd MMM' }}</small>
            </div>
          </section>
        }
      </div>
      @if (showViews()) {
        <div class="co-main-grid visits-overview-grid">
          <cv-visits-navigation />
          <aside class="co-right-column visits-overview-actions">
            <section cvQuickActions headingId="visits-actions-title" [actionCount]="5">
              <a
                class="co-primary"
                routerLink="/manage/rota/planner"
                [queryParams]="service.can('manage') ? { plan: 'true' } : {}"
              >
                <span class="material-symbols-outlined" aria-hidden="true">calendar_add_on</span
                >{{ service.can('manage') ? 'Plan Visits' : 'View Schedule'
                }}<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
              </a>
              <a routerLink="/manage/rota/planner" [queryParams]="{ allocation: 'Unallocated' }">
                <span class="material-symbols-outlined" aria-hidden="true">person_alert</span
                >Unallocated Visits<span class="material-symbols-outlined" aria-hidden="true"
                  >chevron_right</span
                >
              </a>
              <a routerLink="/manage/rota/publishing">
                <span class="material-symbols-outlined" aria-hidden="true">publish</span>Review
                Draft Visits<span class="material-symbols-outlined" aria-hidden="true"
                  >chevron_right</span
                >
              </a>
              <a routerLink="/manage/ecm">
                <span class="material-symbols-outlined" aria-hidden="true">monitor_heart</span>Live
                Visits / ECM<span class="material-symbols-outlined" aria-hidden="true"
                  >chevron_right</span
                >
              </a>
              <a routerLink="/manage/rota/call-packages">
                <span class="material-symbols-outlined" aria-hidden="true">event_repeat</span>Manage
                Call Packages<span class="material-symbols-outlined" aria-hidden="true"
                  >chevron_right</span
                >
              </a>
            </section>
          </aside>
        </div>
        <cv-visits-attention />
      }
      <div class="visits-view-content"><router-outlet /></div>
    } @else {
      <cv-access-required
        feature="Visits & Rota"
        module="Care delivery"
        viewPermission="View rota"
        permissionsTitle="Visits & Rota access"
      />
    }
  `,
})
export class VisitsWorkspace {
  private readonly router = inject(Router);
  protected readonly showViews = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split('?')[0] === '/manage/rota/overview'),
    ),
    { initialValue: this.router.url.split('?')[0] === '/manage/rota/overview' },
  );
  protected readonly service = inject(RotaService);
  private readonly today = londonDate();
  protected readonly start = addDays(
    this.today,
    -((new Date(this.today + 'T12:00:00Z').getUTCDay() + 6) % 7),
  );
  protected readonly end = addDays(this.start, 6);
  private readonly now = signal(Date.now());
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  private readonly visits = computed(() =>
    this.service
      .data()
      .visits.filter((v) => v.state !== 'Cancelled' && v.date >= this.start && v.date <= this.end),
  );
  protected readonly stats = computed(() => {
    const visits = this.visits();
    return [
      { label: 'Scheduled visits', value: visits.length, icon: 'calendar_month', tone: 'blue' },
      {
        label: 'Allocated',
        value: visits.filter((v) => v.staffIds.length === v.carers).length,
        icon: 'person_check',
        tone: 'green',
      },
      {
        label: 'Unallocated',
        value: visits.filter((v) => v.staffIds.length < v.carers).length,
        icon: 'person_alert',
        tone: 'red',
      },
      {
        label: 'Double-up visits',
        value: visits.filter((v) => v.carers === 2).length,
        icon: 'group',
        tone: 'blue',
      },
      {
        label: 'Staff on rota',
        value: new Set(visits.flatMap((v) => v.staffIds)).size,
        icon: 'groups',
        tone: 'blue',
      },
      {
        label: 'Late / at risk',
        value: visits.filter(
          (v) =>
            v.state === 'Published' &&
            ['Running late', 'Missed visit risk', 'Missed visit'].includes(
              liveVisit(v, this.now(), this.service.data().ecm ?? emptyEcm()).status,
            ),
        ).length,
        icon: 'warning',
        tone: 'red',
      },
    ];
  });
}

@Component({
  selector: 'cv-visits-landing',
  template: '',
})
export class VisitsLanding {}
