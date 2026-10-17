import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HrService } from './hr.service';
import { today } from './hr.models';
@Component({
  selector: 'cv-hr-team',
  host: { class: 'module-page people-page hr-team-page' },
  imports: [MatSelectModule, CvSelect, FormsModule, RouterLink],
  styleUrls: ['./hr.css', './hr-directory.css', './hr-tables.css'],
  template: ` <nav class="hr-breadcrumb" aria-label="Breadcrumb">
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
    </div>
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
                <td colspan="5" class="hr-empty">No matching records.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="hr-footer">
        <span class="hr-muted" aria-live="polite">{{ records().length }} records</span>
      </div>
    </section>
    <section class="hr-panel">
      <div class="hr-panel-head">
        <h2>
          {{ mode === 'leave' ? 'Request leave for a team member' : 'Schedule or record a review' }}
        </h2>
      </div>
      <div class="hr-filters">
        <label
          >Staff member<mat-select
            cvSelect
            [ngModel]="selected()"
            (ngModelChange)="selected.set($event)"
          >
            <mat-option value="">Choose staff member</mat-option>
            @for (p of hr.staff(); track p.id) {
              <mat-option [value]="p.id">{{ p.name }} · {{ p.location }}</mat-option>
            }
          </mat-select></label
        >
        @if (selected()) {
          <a
            class="hr-button primary"
            [routerLink]="[
              '/manage/people/staff',
              selected(),
              mode === 'leave' ? 'availability' : 'reviews',
            ]"
            >Continue →</a
          >
        }
      </div>
    </section>`,
})
export class HrTeam {
  protected readonly hr = inject(HrService);
  protected readonly mode = inject(ActivatedRoute).snapshot.data['section'] as string;
  protected readonly title =
    this.mode === 'leave' ? 'Availability & Leave' : 'Supervision & Appraisals';
  protected readonly statuses =
    this.mode === 'leave'
      ? ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Legacy record']
      : ['Scheduled', 'Completed'];
  protected readonly today = today();
  protected readonly query = signal('');
  protected readonly status = signal('');
  protected readonly selected = signal('');
  protected readonly records = computed(() => {
    const rows =
      this.mode === 'leave'
        ? this.hr.store
            .data()
            .leaves.map((r) => ({ ...r, date: r.start, status: r.status ?? 'Legacy record' }))
        : this.hr.store.data().reviews.map((r) => ({ ...r, end: '' }));
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
    if (record.personId)
      return this.hr.staff().some((p) => p.id === record.personId) ? record.personId : '';
    const matches = this.hr.staff().filter((p) => p.name === record.person);
    return matches.length === 1 ? matches[0].id : '';
  }
}
