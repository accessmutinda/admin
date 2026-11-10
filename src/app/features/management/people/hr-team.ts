import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { Component, computed, effect, untracked, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HrService } from './hr.service';
import { today } from './hr.models';
import { MatDialog } from '@angular/material/dialog';
import { AvailabilityLeaveApi } from './availability-leave-api.service';
import { StaffReviewsApi } from './staff-reviews-api.service';
import { ReviewRequestDialog } from './review-request-dialog';
import { LeaveRequestDialog } from './leave-request-dialog';
import { PageLoading } from '../../../shared/layouts/page-loading';
import { CompanyUnavailable } from '../shared/company-unavailable';
@Component({
  selector: 'cv-hr-team',
  host: { class: 'module-page people-page hr-team-page' },
  imports: [PageLoading, CompanyUnavailable, MatSelectModule, CvSelect, FormsModule, RouterLink],
  styleUrls: ['./hr.css', './hr-directory.css', './hr-tables.css'],
  template: `
    <nav class="hr-breadcrumb" aria-label="Breadcrumb">
      <a routerLink="/manage/people">People & HR</a>
      <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
      <span aria-current="page">{{ title }}</span>
    </nav>
    <div class="hr-heading">
      <div>
        <h1>{{ title }}</h1>
        <p>
          {{ hr.store.company()?.name }} · Open a staff record to record the details and manage
          follow-up.
        </p>
      </div>
      @if (mode === 'leave' && leaveApi.access.can('people', 'leave', 'create')) {
        <button class="hr-button primary" (click)="requestLeave()">
          <span class="material-symbols-outlined" aria-hidden="true">add</span>Request Leave
        </button>
      }
      @if (mode === 'reviews' && reviewApi.access.can('people', 'performance', 'create')) {
        <button class="hr-button primary" (click)="addReview()">
          <span class="material-symbols-outlined" aria-hidden="true">add</span>Add Review
        </button>
      }
    </div>
    @if (mode === 'reviews' && reviewApi.loading()) {
      <cv-page-loading url="/manage/reviews" />
    }
    @if (mode === 'reviews' && reviewApi.error()) {
      <cv-company-unavailable [message]="reviewApi.error()" (retry)="reload()" />
    }
    @if (mode === 'leave' && leaveApi.loading()) {
      <cv-page-loading url="/manage/leave" />
    }
    @if (mode === 'leave' && leaveApi.error()) {
      <cv-company-unavailable [message]="leaveApi.error()" (retry)="reload()" />
    }
    @if (notice()) {
      <p class="hr-notice" role="status">{{ notice() }}</p>
    }
    <section class="hr-panel">
      <div class="hr-filters">
        <label
          >Search records<input
            type="search"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            placeholder="Person, type, date or status" /></label
        ><label
          >Status<mat-select cvSelect [ngModel]="status()" (ngModelChange)="status.set($event)">
            <mat-option value="">All statuses</mat-option>
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select></label
        ><button class="hr-button" (click)="query.set(''); status.set('')">Clear filters</button>
      </div>
      <div class="hr-table-wrap">
        <table class="hr-table">
          <thead>
            <tr>
              <th scope="col">Staff member</th>
              <th scope="col">Type</th>
              <th scope="col">{{ mode === 'leave' ? 'From / To' : 'Date' }}</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (r of records(); track r.id) {
              <tr>
                <td>{{ r.person }}</td>
                <td>{{ r.type }}</td>
                <td>
                  {{ r.date }}
                  @if (r.end) {
                    – {{ r.end }}
                  }
                </td>
                <td>
                  <span
                    class="hr-badge"
                    [class.warn]="r.date < today && r.status === 'Scheduled'"
                    >{{ r.status }}</span
                  >
                </td>
                <td>
                  @if (personId(r); as id) {
                    <a
                      [routerLink]="[
                        '/manage/people/staff',
                        id,
                        mode === 'leave' ? 'availability' : 'reviews',
                      ]"
                      >Open staff record →</a
                    >
                  } @else {
                    <span class="hr-muted">Staff link needs review</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="hr-empty">
                  {{
                    mode === 'leave' && leaveApi.loading()
                      ? 'Loading leave records…'
                      : mode === 'leave' && leaveApi.error()
                        ? 'Leave records are unavailable.'
                        : 'No matching records.'
                  }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="hr-footer">
        <span class="hr-muted" aria-live="polite">{{ records().length }} records</span>
      </div>
    </section>
  `,
})
export class HrTeam {
  protected readonly hr = inject(HrService);
  protected readonly leaveApi = inject(AvailabilityLeaveApi);
  protected readonly reviewApi = inject(StaffReviewsApi);
  private readonly dialog = inject(MatDialog);
  protected readonly notice = signal('');
  constructor() {
    effect(() => {
      const q = this.query(),
        status = this.status(),
        api = this.mode === 'leave' ? this.leaveApi : this.reviewApi;
      api.scope();
      untracked(() => {
        this.notice.set('');
        void api.load(q, status);
      });
    });
  }
  protected reload(): void {
    void (this.mode === 'leave' ? this.leaveApi : this.reviewApi).load(this.query(), this.status());
  }
  protected addReview(): void {
    this.dialog
      .open(ReviewRequestDialog, {
        width: '720px',
        maxWidth: 'calc(100vw - 24px)',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.notice.set(
            result.status === 'Completed' ? 'Completed review recorded.' : 'Review scheduled.',
          );
          this.reload();
        }
      });
  }
  protected requestLeave(): void {
    this.dialog
      .open(LeaveRequestDialog, {
        width: '640px',
        maxWidth: 'calc(100vw - 24px)',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.notice.set('Leave request submitted.');
          this.reload();
        }
      });
  }

  protected readonly mode = inject(ActivatedRoute).snapshot.data['section'] as string;
  protected readonly title =
    this.mode === 'leave' ? 'Availability & Leave' : 'Supervision & Appraisals';
  protected readonly statuses =
    this.mode === 'leave'
      ? ['Draft', 'Pending', 'Approved', 'Rejected', 'Cancelled']
      : ['Scheduled', 'Completed'];
  protected get today(): string {
    return this.mode === 'leave' ? today() : this.reviewApi.localDate();
  }
  protected readonly query = signal('');
  protected readonly status = signal('');
  protected readonly selected = signal('');
  protected readonly records = computed(() => {
    const rows =
      this.mode === 'leave'
        ? this.leaveApi.rows().map((r) => ({ ...r, date: r.start }))
        : this.reviewApi.rows().map((r) => ({ ...r, end: '' }));
    return rows
      .filter(
        (r) =>
          `${r.person} ${r.type} ${r.date} ${r.status}`
            .toLowerCase()
            .includes(this.query().trim().toLowerCase()) &&
          (!this.status() || r.status === this.status()),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  });
  protected personId(record: { person: string; personId?: string }): string {
    return record.personId ?? '';
  }
}
