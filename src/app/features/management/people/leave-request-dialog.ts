import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { AvailabilityLeaveApi } from './availability-leave-api.service';
@Component({
  selector: 'cv-leave-request-dialog',
  imports: [FormsModule, MatDialogModule, MatSelectModule, CvSelect],
  styleUrls: ['./hr.css', './hr-forms.css'],
  template: ` <h2 mat-dialog-title>Request Leave</h2>
    <form (ngSubmit)="submit()">
      <mat-dialog-content>
        <p class="hr-muted">
          Request leave for a team member. An authorised reviewer will decide the request.
        </p>
        @if (api.optionError()) {
          <p class="hr-error" role="alert">{{ api.optionError() }}</p>
          <button class="hr-button" type="button" (click)="api.options()">Retry</button>
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
              required
              aria-label="Staff member"
              [disabled]="busy() || api.optionsLoading()"
              ><mat-option value="">Choose staff member</mat-option>
              @for (p of api.staff(); track p.id) {
                <mat-option [value]="p.id">{{ p.name }} · {{ p.branch }}</mat-option>
              }
            </mat-select></label
          >
          <label
            >Leave type<mat-select
              cvSelect
              name="type"
              [(ngModel)]="typeId"
              required
              aria-label="Leave type"
              [disabled]="busy() || api.optionsLoading()"
              ><mat-option value="">Choose leave type</mat-option>
              @for (t of api.types(); track t.id) {
                <mat-option [value]="t.id">{{ t.name }}</mat-option>
              }
            </mat-select></label
          >
          <label
            >From<input type="date" name="start" [(ngModel)]="start" required [disabled]="busy()"
          /></label>
          <label
            >To<input
              type="date"
              name="end"
              [(ngModel)]="end"
              [min]="start"
              required
              [disabled]="busy()"
          /></label>
          <label class="wide"
            >Reason (optional)<textarea
              name="reason"
              [(ngModel)]="reason"
              maxlength="2000"
              rows="3"
              [disabled]="busy()"
            ></textarea>
          </label>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end"
        ><button type="button" class="hr-button" (click)="close()" [disabled]="busy()">
          Cancel</button
        ><button
          type="submit"
          class="hr-button primary"
          [disabled]="busy() || api.optionsLoading() || !staffId || !typeId || !start || !end"
        >
          {{ busy() ? 'Submitting…' : 'Send Request' }}
        </button></mat-dialog-actions
      >
    </form>`,
})
export class LeaveRequestDialog {
  protected readonly api = inject(AvailabilityLeaveApi);
  private readonly dialog = inject(MatDialogRef<LeaveRequestDialog>);
  private readonly scope = this.api.scope();
  private readonly key = crypto.randomUUID();
  protected staffId = '';
  protected typeId = '';
  protected start = '';
  protected end = '';
  protected reason = '';
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  constructor() {
    effect(() => {
      if (this.api.scope() !== this.scope) untracked(() => this.dialog.close());
    });
    void this.api.options();
  }
  protected close(): void {
    if (!this.busy()) this.dialog.close();
  }
  protected async submit(): Promise<void> {
    if (this.busy()) return;
    if (!this.staffId || !this.typeId || !this.start || !this.end || this.end < this.start) {
      this.error.set('Choose a staff member, leave type and valid start and end dates.');
      return;
    }
    this.busy.set(true);
    this.dialog.disableClose = true;
    this.error.set('');
    try {
      const result = await this.api.request(
        {
          staff_id: this.staffId,
          type_id: this.typeId,
          start: this.start,
          end: this.end,
          reason: this.reason,
        },
        this.key,
      );
      this.dialog.close(result);
    } catch (error) {
      this.error.set(this.api.message(error));
    } finally {
      this.busy.set(false);
      this.dialog.disableClose = false;
    }
  }
}
