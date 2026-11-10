import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { StaffReviewsApi } from './staff-reviews-api.service';
@Component({
  selector: 'cv-review-request-dialog',
  imports: [FormsModule, MatDialogModule, MatSelectModule, CvSelect],
  styleUrls: ['./hr.css', './hr-forms.css'],
  template: ` <h2 mat-dialog-title>Add Review</h2>
    <form (ngSubmit)="save()">
      <mat-dialog-content>
        <p class="hr-muted">Schedule a review or record a completed assessment.</p>
        @if (api.optionError()) {
          <p class="hr-error" role="alert">{{ api.optionError() }}</p>
          <button type="button" class="hr-button" (click)="api.options()">Retry</button>
        }
        @if (error()) {
          <p class="hr-error" role="alert">{{ error() }}</p>
        }
        <div class="hr-form">
          <label
            >Staff member<mat-select
              cvSelect
              name="staff"
              [(ngModel)]="staffId"
              aria-label="Staff member"
              [disabled]="busy() || api.optionsLoading()"
              required
              ><mat-option value="">Choose staff member</mat-option>
              @for (p of api.staff(); track p.id) {
                <mat-option [value]="p.id">{{ p.name }} · {{ p.branch }}</mat-option>
              }
            </mat-select></label
          >
          <label
            >Type<mat-select
              cvSelect
              name="type"
              [(ngModel)]="typeId"
              aria-label="Review type"
              [disabled]="busy() || api.optionsLoading()"
              required
              ><mat-option value="">Choose review type</mat-option>
              @for (t of api.types(); track t.id) {
                <mat-option [value]="t.id">{{ t.title }}</mat-option>
              }
            </mat-select></label
          >
          <label
            >Date<input type="date" name="date" [(ngModel)]="date" [disabled]="busy()" required
          /></label>
          <label
            >Assessor<input
              name="assessor"
              [(ngModel)]="assessor"
              maxlength="200"
              [disabled]="busy()"
              required
          /></label>
          @if (api.canComplete()) {
            <label class="hr-check wide"
              ><input
                type="checkbox"
                name="complete"
                [(ngModel)]="recordCompleted"
                [disabled]="busy()"
              />Record completed review</label
            >
          }
          @if (recordCompleted && api.canComplete()) {
            <label class="wide"
              >Discussion<textarea
                name="discussion"
                [(ngModel)]="discussion"
                maxlength="8000"
                rows="3"
                [disabled]="busy()"
                required
              ></textarea>
            </label>
            <label class="wide"
              >Outcome<textarea
                name="outcome"
                [(ngModel)]="outcome"
                maxlength="8000"
                rows="3"
                [disabled]="busy()"
                required
              ></textarea>
            </label>
            <label
              >Appraisal rating (1–5)<input
                type="number"
                name="rating"
                [(ngModel)]="rating"
                min="1"
                max="5"
                step="0.1"
                [disabled]="busy()"
                [required]="requiresRating()"
              /><small>Required for annual appraisals. Enter the assessor's rating.</small></label
            >
            @if (requiresRating()) {
              @for (d of api.dimensions(); track d.id) {
                <label
                  >{{ d.title }} (1–5)<input
                    type="number"
                    [name]="'dimension-' + d.id"
                    [(ngModel)]="ratings[d.title]"
                    min="1"
                    max="5"
                    step="0.1"
                    [disabled]="busy()"
                /></label>
              }
            }
          }
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end"
        ><button type="button" class="hr-button" [disabled]="busy()" (click)="close()">
          Cancel</button
        ><button
          type="submit"
          class="hr-button primary"
          [disabled]="
            busy() || api.optionsLoading() || !staffId || !typeId || !date || !assessor.trim()
          "
        >
          {{ busy() ? 'Saving…' : 'Save Review' }}
        </button></mat-dialog-actions
      >
    </form>`,
})
export class ReviewRequestDialog {
  protected readonly api = inject(StaffReviewsApi);
  private readonly dialog = inject(MatDialogRef<ReviewRequestDialog>);
  private readonly scope = this.api.scope();
  private readonly key = crypto.randomUUID();
  protected staffId = '';
  protected typeId = '';
  protected date = '';
  protected assessor = '';
  protected recordCompleted = false;
  protected discussion = '';
  protected outcome = '';
  protected rating: number | null = null;
  protected ratings: Record<string, number | null> = {};
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected requiresRating(): boolean {
    return !!this.api.types().find((t) => t.id === this.typeId)?.requires_rating;
  }
  constructor() {
    effect(() => {
      if (this.api.scope() !== this.scope) untracked(() => this.dialog.close());
    });
    void this.api.options();
  }
  protected close(): void {
    if (!this.busy()) this.dialog.close();
  }
  protected async save(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    const completing = this.recordCompleted && this.api.canComplete();
    const competencies = this.requiresRating()
      ? Object.entries(this.ratings)
          .filter(([, score]) => score !== null && score !== undefined)
          .map(([title, score]) => ({ title, score: score!, observation: '' }))
      : [];
    if (!this.staffId || !this.typeId || !this.date || !this.assessor.trim()) {
      this.error.set('Choose a staff member, review type, date and assessor.');
      return;
    }
    if (
      completing &&
      (!this.discussion.trim() ||
        !this.outcome.trim() ||
        this.date > this.api.localDate() ||
        (this.requiresRating() && this.rating === null) ||
        (this.rating !== null &&
          (!Number.isFinite(this.rating) || this.rating < 1 || this.rating > 5)) ||
        competencies.some((c) => !Number.isFinite(c.score) || c.score < 1 || c.score > 5))
    ) {
      this.error.set(
        'Record valid discussion, outcome and ratings for a review that has taken place.',
      );
      return;
    }
    this.busy.set(true);
    this.dialog.disableClose = true;
    try {
      let row = await this.api.create(
        {
          staff_id: this.staffId,
          type_id: this.typeId,
          date: this.date,
          assessor: this.assessor.trim(),
          reason: '',
        },
        this.key,
      );
      if (completing && row.status !== 'Completed')
        row = await this.api.complete(row, {
          discussion: this.discussion.trim(),
          outcome: this.outcome.trim(),
          score: this.rating === null ? null : String(this.rating),
          competencies: competencies.map((c) => ({ ...c, score: String(c.score) })),
          reason: 'Completed following recorded discussion and outcome.',
        });
      this.dialog.close(row);
    } catch (error) {
      this.error.set(this.api.message(error));
    } finally {
      this.busy.set(false);
      this.dialog.disableClose = false;
    }
  }
}
