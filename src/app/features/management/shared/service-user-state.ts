import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Skeleton } from '../../../shared/ui/skeleton';

@Component({
  selector: 'cv-service-user-state',
  imports: [Skeleton, RouterLink],
  template: `
    @if (loading()) {
      <div class="su-loading" role="status" aria-label="Loading service user" aria-busy="true">
        <div aria-hidden="true">
          @if (identity()) {
            <section class="su-identity">
              <cv-skeleton sizeClass="h-24 w-20" />
              <div class="su-identity-details">
                <cv-skeleton sizeClass="mb-3 h-6 w-56 max-w-full" />
                <cv-skeleton sizeClass="mb-3 h-3 w-80 max-w-full" />
                <cv-skeleton sizeClass="h-3 w-64 max-w-full" />
              </div>
            </section>
            <div class="su-tabs">
              @for (tab of [0, 1, 2, 3, 4, 5]; track tab) {
                <cv-skeleton sizeClass="h-8 w-24" />
              }
            </div>
          }
          <section class="su-content">
            <cv-skeleton sizeClass="mb-5 h-5 w-48 max-w-full" />
            @for (row of [0, 1, 2, 3, 4, 5]; track row) {
              <cv-skeleton sizeClass="mb-4 h-4 w-full" />
            }
          </section>
        </div>
        <span class="sr-only">Loading the service user and tab content.</span>
      </div>
    } @else {
      <section class="cu-card" role="alert" [attr.aria-label]="title()">
        <span class="cu-icon material-symbols-outlined" aria-hidden="true">person_off</span>
        <div class="cu-content">
          <h2>{{ title() }}</h2>
          <p class="cu-message">
            {{ message() || 'We could not open this service user in the current workspace.' }}
          </p>
          <p class="cu-help">
            {{ help() }}
          </p>
        </div>
        <div class="cu-actions">
          <button type="button" class="cu-retry" (click)="retry.emit()">
            <span class="material-symbols-outlined" aria-hidden="true">refresh</span>Retry
          </button>
          <a class="su-back" routerLink="/manage/clients">Back to service users</a>
        </div>
      </section>
    }
  `,
  styleUrls: ['./company-unavailable.css'],
  styles: `
    .su-loading {
      min-width: 0;
    }
    .su-identity,
    .su-content {
      padding: 16px;
      border: 1px solid #e0e9ef;
      border-radius: 9px;
      background: #fff;
    }
    .su-identity {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .su-identity-details {
      flex: 1;
      min-width: 0;
    }
    .su-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 12px 0;
    }

    .su-back {
      color: #007bcc;
      font: 400 12px/1.5 var(--font-sans);
      text-underline-offset: 3px;
    }
    .su-back:focus-visible {
      outline: 2px solid #008bd9;
      outline-offset: 3px;
      border-radius: 3px;
    }
    @media (pointer: coarse) {
      .cu-retry,
      .su-back {
        min-height: 44px;
      }
      .su-back {
        display: inline-flex;
        align-items: center;
      }
    }
  `,
})
export class ServiceUserState {
  readonly title = input('Service user unavailable');
  readonly help = input('Try again, or return to Service Users to choose a record you can access.');
  readonly loading = input(false);
  readonly identity = input(true);
  readonly message = input('');
  readonly retry = output<void>();
}
