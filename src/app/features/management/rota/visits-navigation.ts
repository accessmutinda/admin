import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'cv-visits-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <section class="co-surface visits-views" aria-labelledby="visits-views-title">
      <div class="co-section-header">
        <h2 id="visits-views-title">
          <span class="material-symbols-outlined" aria-hidden="true">dashboard</span>Visits & Allocation
          views
        </h2>
      </div>
      <nav class="co-check-grid" aria-label="Visits & Allocation views">
        @for (item of items; track item.path) {
          <a
            class="co-check-card"
            [routerLink]="item.path"
            routerLinkActive="selected"
            ariaCurrentWhenActive="page"
          >
            <span
              class="co-check-icon material-symbols-outlined"
              [attr.data-tone]="item.tone"
              aria-hidden="true"
              >{{ item.icon }}</span
            >
            <div>
              <h3>{{ item.label }}</h3>
              <p>{{ item.description }}</p>
            </div>
          </a>
        }
      </nav>
    </section>
  `,
  styleUrl: './visits-navigation.css',
})
export class VisitsNavigation {
  readonly items = [
    {
      path: '/manage/rota/planner',
      label: 'Schedule',
      description: 'Weekly and monthly visits, staff allocation and coverage.',
      icon: 'calendar_month',
      tone: 'blue',
    },
    {
      path: '/manage/rota/call-packages',
      label: 'Call packages',
      description: 'Recurring care calls, requirements and preferred carers.',
      icon: 'event_repeat',
      tone: 'teal',
    },
    {
      path: '/manage/rota/publishing',
      label: 'Publishing',
      description: 'Review drafts, resolve issues and publish the rota.',
      icon: 'publish',
      tone: 'orange',
    },
    {
      path: '/manage/ecm',
      label: 'Live Visits / ECM',
      description: 'Monitor attendance, running visits, delays and missed calls.',
      icon: 'monitor_heart',
      tone: 'teal',
    },
    {
      path: '/manage/rota/history',
      label: 'History & audit',
      description: 'Past visits, recorded attendance and allocation changes.',
      icon: 'history',
      tone: 'cyan',
    },
  ];
}
