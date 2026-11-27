import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'cv-ecm-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabs" aria-label="Live Visits views">
      @for (view of views; track view.path) {
        <a
          [routerLink]="view.path"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{
            paths: 'exact',
            queryParams: 'ignored',
            matrixParams: 'ignored',
            fragment: 'ignored',
          }"
          ariaCurrentWhenActive="page"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{ view.icon }}</span>
          {{ view.label }}
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .tabs {
      display: flex;
      gap: 4px 8px;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--border);
    }
    a {
      display: inline-flex;
      min-height: 40px;
      align-items: center;
      gap: 6px;
      border-bottom: 2px solid transparent;
      padding: 6px 8px;
      font-weight: 700;
      text-decoration: none;
    }
    a.active {
      color: var(--co-navy);
      border-color: var(--accent);
    }
    a:hover {
      background: var(--color-teal-50);
    }

    @media (max-width: 520px) {
      :host-context(.operations-page) .tabs {
        gap: 0 4px;
      }
      a {
        padding-inline: 6px;
      }
      a .material-symbols-outlined {
        display: none;
      }
    }
  `,
})
export class EcmNavigation {
  protected readonly views = [
    { path: '/manage/ecm', label: 'Live Visits', icon: 'event_note' },
    { path: '/manage/ecm/geomap', label: 'Live GeoMap', icon: 'map' },
    { path: '/manage/ecm/operations', label: 'Operational Monitoring', icon: 'monitor_heart' },
    { path: '/manage/ecm/on-duty', label: 'On Duty', icon: 'work' },
    { path: '/manage/ecm/on-the-road', label: 'On the Road', icon: 'directions_car' },
  ];
}
