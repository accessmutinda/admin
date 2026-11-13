import { Component, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { StaffAccountsApi, StaffAccount, SecurityAction } from './staff-accounts-api.service';

const LABELS: Record<SecurityAction | 'provision', string> = {
  'reset-password': 'Reset password',
  'reset-mfa': 'Reset MFA',
  'set-mfa': 'Change MFA policy',
  suspend: 'Suspend account',
  activate: 'Reactivate account',
  'revoke-sessions': 'Sign out all sessions',
  provision: 'Create staff login',
};
interface SecurityDialogData {
  api: StaffAccountsApi;
  row: StaffAccount | null;
  action: SecurityAction | 'provision';
}

@Component({
  selector: 'cv-staff-security-dialog',
  styleUrls: ['./hr.css'],
  imports: [FormsModule, MatDialogModule],
  template: `<h2 mat-dialog-title>{{ label }}</h2>
    <form (ngSubmit)="save()">
      <mat-dialog-content>
        @if (data.row) {
          <p>
            <strong>{{ data.row.name }}</strong
            ><br />{{ data.row.email }}
          </p>
        }
        @if (data.action === 'reset-password') {
          <p>
            The initial password uses the staff member's first and last names followed by &#64;123.
            They must choose a new password at their next sign-in.
          </p>
        }
        @if (data.action === 'reset-mfa') {
          <p>
            This clears enrolled authenticators. If MFA is required, the user must enroll again at
            their next sign-in.
          </p>
        }
        @if (data.action === 'suspend') {
          <p>This blocks sign-in and revokes current sessions. The staff record is retained.</p>
        }
        @if (data.action === 'activate') {
          <p>This restores sign-in for staff with active employment.</p>
        }
        @if (data.action === 'provision') {
          <label
            >Find staff<input name="staffSearch" [(ngModel)]="staffSearch" maxlength="200"
          /></label>
          <button
            type="button"
            class="hr-button"
            [disabled]="data.api.saving()"
            (click)="data.api.staff(staffSearch)"
          >
            Find staff
          </button>
          <label
            >Staff member<select name="employment" required [(ngModel)]="employmentId">
              <option value="">Choose a staff member</option>
              @for (staff of data.api.choices(); track staff.employment_id) {
                <option [value]="staff.employment_id">{{ staff.name }}</option>
              }
            </select></label
          >
          <p>
            Existing login accounts are preserved. New users must change their initial password at
            sign-in.
          </p>
        }
        @if (data.action === 'set-mfa') {
          <label
            >MFA policy<select name="mfa" [(ngModel)]="mfa">
              <option value="inherit">Role default</option>
              <option value="required">Required</option>
              <option value="not-required">Off</option>
            </select></label
          >
        }
        @if (data.action !== 'provision') {
          <p>Current sessions will be signed out.</p>
        }
        <label
          >Reason<textarea
            name="reason"
            [(ngModel)]="reason"
            minlength="3"
            maxlength="255"
            required
            rows="3"
          ></textarea>
        </label>
        @if (data.api.error()) {
          <p role="alert" class="hr-error">{{ data.api.error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end"
        ><button
          type="button"
          class="hr-button"
          [disabled]="data.api.saving()"
          (click)="ref.close(false)"
        >
          Cancel</button
        ><button
          class="hr-button primary"
          type="submit"
          [disabled]="
            data.api.saving() ||
            reason.trim().length < 3 ||
            (data.action === 'provision' && !employmentId)
          "
        >
          {{ data.api.saving() ? 'Saving…' : label }}
        </button></mat-dialog-actions
      >
    </form>`,
  styles: [
    `
      :host {
        display: block;
        max-width: 540px;
      }
      label {
        display: grid;
        gap: 6px;
        margin: 16px 0;
        font-weight: 600;
      }
      input,
      select,
      textarea {
        font: inherit;
        padding: 10px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        width: 100%;
        box-sizing: border-box;
      }
      p {
        line-height: 1.6;
      }
      mat-dialog-actions {
        gap: 8px;
      }
      .hr-error {
        color: #b42318;
      }
    `,
  ],
})
export class StaffSecurityDialog {
  readonly data = inject<SecurityDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<StaffSecurityDialog>);
  readonly label = LABELS[this.data.action];
  readonly initialScope = this.data.api.scope();
  reason = '';
  mfa = this.data.row?.mfa_override ?? 'inherit';
  staffSearch = '';
  employmentId = '';
  constructor() {
    effect(() => {
      if (this.data.api.scope() !== this.initialScope) untracked(() => this.ref.close(false));
    });
    if (this.data.action === 'provision') void this.data.api.staff('');
  }
  async save(): Promise<void> {
    if (this.initialScope !== this.data.api.scope()) return;
    this.ref.disableClose = true;
    try {
      if (
        await this.data.api.save(
          this.data.row,
          this.data.action,
          this.reason,
          this.mfa,
          this.employmentId,
        )
      )
        this.ref.close(true);
    } finally {
      this.ref.disableClose = false;
    }
  }
}

@Component({
  selector: 'cv-staff-accounts',
  imports: [FormsModule, RouterLink, DatePipe, MatDialogModule],
  providers: [StaffAccountsApi],
  host: { class: 'module-page people-page staff-accounts-page' },
  templateUrl: './staff-accounts.html',
  styleUrls: ['./hr.css', './hr-directory.css', './hr-tables.css', './staff-accounts.css'],
})
export class StaffAccounts {
  protected readonly api = inject(StaffAccountsApi);
  private readonly dialog = inject(MatDialog);
  protected readonly offset = signal(0);
  protected readonly labels = LABELS;
  protected search = '';
  protected status = '';
  constructor() {
    effect(() => {
      this.api.scope();
      untracked(() => {
        this.offset.set(0);
        this.search = '';
        this.status = '';
      });
    });
  }
  protected reload(offset = this.offset()): void {
    this.offset.set(offset);
    void this.api.load(this.search.trim(), offset, this.status);
  }
  protected actions(row: StaffAccount): SecurityAction[] {
    return [
      'reset-password',
      'reset-mfa',
      'set-mfa',
      'revoke-sessions',
      row.status === 'suspended' ? 'activate' : 'suspend',
    ];
  }
  protected open(row: StaffAccount | null, action: SecurityAction | 'provision'): void {
    this.api.error.set('');
    const dialog = this.dialog.open(StaffSecurityDialog, {
      width: '540px',
      maxWidth: '95vw',
      data: { api: this.api, row, action },
    });
    dialog.afterClosed().subscribe((saved) => {
      if (saved) this.reload();
    });
  }
}
