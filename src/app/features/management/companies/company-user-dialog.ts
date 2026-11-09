import { CompanyAccessService, CompanyRole } from '../../../core/access/company-access.service';
import { AuthService } from '../../../core/auth/auth.service';

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';

import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore, Member } from '../shared/management.store';
import { validContactEmail } from './company-contacts.models';

export interface CompanyUserDialogData {
  companyId: string;
  mode: 'invite' | 'edit' | 'delete';
  initialRole?: string;
  member?: Member;
}
@Component({
  selector: 'cv-company-user-dialog',
  imports: [FormsModule, MatDialogModule, MatSelectModule, CvSelect],
  template: `<div class="cm-user-dialog">
    <div class="cm-user-dialog-heading">
      <span
        class="material-symbols-outlined"
        [class.cm-user-danger]="data.mode === 'delete'"
        aria-hidden="true"
        >{{
          data.mode === 'invite'
            ? 'person_add'
            : data.mode === 'delete'
              ? 'person_remove'
              : 'manage_accounts'
        }}</span
      >
      <h2 mat-dialog-title>
        {{
          data.mode === 'invite'
            ? 'Invite User'
            : data.mode === 'delete'
              ? 'Delete User'
              : 'Edit User'
        }}
      </h2>
    </div>
    <form (ngSubmit)="save()" novalidate>
      <mat-dialog-content>
        @if (data.mode === 'invite') {
          <p>Invite a user to {{ companyName() }}.</p>
          <label for="cm-user-email">Email address <span aria-hidden="true">*</span></label>
          <input
            id="cm-user-email"
            name="email"
            type="email"
            autocomplete="email"
            maxlength="254"
            required
            [(ngModel)]="email"
            [attr.aria-invalid]="submitted() && !validEmail()"
            aria-describedby="cm-user-email-help"
          />
          <small id="cm-user-email-help"
            >The email address cannot be changed after invitation.</small
          >
        } @else {
          <div class="cm-user-identity">
            <strong>{{ data.member?.name || 'Invited user' }}</strong
            ><span>{{ data.member?.email }}</span>
          </div>
          <small>Email address is read-only.</small>
        }
        @if (data.mode === 'delete') {
          <p class="cm-user-delete-note">
            Remove this user's membership from {{ companyName() }}? This revokes their company
            access. It does not delete staff records or a connected sign-in account.
          </p>
        } @else {
          <label for="cm-user-role">Role <span aria-hidden="true">*</span></label>
          <mat-select
            cvSelect
            id="cm-user-role"
            name="role"
            aria-label="User role"
            [(ngModel)]="role"
            required
          >
            @for (option of roles(); track option.id) {
              <mat-option [value]="option.code">{{ option.name }}</mat-option>
            }
          </mat-select>
          <label for="cm-user-mfa">MFA policy</label>
          <mat-select
            cvSelect
            id="cm-user-mfa"
            name="mfaPolicy"
            aria-label="User MFA policy"
            [ngModel]="data.member?.mfaPolicy ?? 'inherit'"
            [disabled]="true"
            title="Managed through the company security policy"
          >
            <mat-option value="inherit">Use role default</mat-option>
            <mat-option value="required">Require MFA for this user</mat-option>
            <mat-option value="not-required">Do not require MFA for this user</mat-option>
          </mat-select>
          <small>MFA follows the saved role and company security policies.</small>
          @if (data.mode === 'edit') {
            <label for="cm-user-status">Status</label>
            <mat-select
              cvSelect
              id="cm-user-status"
              name="status"
              aria-label="User status"
              [(ngModel)]="status"
            >
              @for (option of statuses; track option) {
                <mat-option [value]="option">{{ option }}</mat-option>
              }
            </mat-select>
            <p>Changes update this company's role and membership status.</p>
          } @else {
            <p class="cm-user-delivery-note">
              <span class="material-symbols-outlined" aria-hidden="true">info</span>Queues a company
              invitation for email delivery.
            </p>
          }
        }
        @if (error()) {
          <p class="cm-user-dialog-error" role="alert">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button
          type="button"
          class="cm-user-dialog-button"
          [disabled]="saving()"
          (click)="dialog.close()"
        >
          Cancel
        </button>
        <button
          type="submit"
          [disabled]="saving() || loading()"
          class="cm-user-dialog-button"
          [class.cm-user-dialog-primary]="data.mode !== 'delete'"
          [class.cm-user-dialog-delete]="data.mode === 'delete'"
        >
          {{
            data.mode === 'invite'
              ? 'Send Invite'
              : data.mode === 'delete'
                ? 'Delete User'
                : 'Save Changes'
          }}
        </button>
      </mat-dialog-actions>
    </form>
  </div>`,
})
export class CompanyUserDialog {
  protected readonly data = inject<CompanyUserDialogData>(MAT_DIALOG_DATA);
  protected readonly dialog = inject(MatDialogRef<CompanyUserDialog>);
  private readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  private readonly access = inject(CompanyAccessService);
  protected readonly roles = signal<CompanyRole[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly statuses = ['Active', 'Suspended'];
  protected email = '';
  protected role = '';
  protected status = this.data.member?.status === 'Active' ? 'Active' : 'Suspended';
  private readonly invitationKey = crypto.randomUUID();
  constructor() {
    this.dialog.disableClose = false;
    void this.access
      .roles(this.data.companyId)
      .then((value) => {
        this.roles.set(value.results);
        this.role =
          this.data.member?.roleCode ??
          value.results.find((r) => r.name === (this.data.member?.role ?? this.data.initialRole))
            ?.code ??
          value.results.find((role) => role.code === 'CW')?.code ??
          '';
      })
      .catch((error) =>
        this.error.set(error instanceof Error ? error.message : 'Company roles unavailable.'),
      )
      .finally(() => this.loading.set(false));
  }
  protected companyName(): string {
    return this.store.companies().find((c) => c.id === this.data.companyId)?.name ?? 'this company';
  }
  protected validEmail(): boolean {
    return this.email.trim().length <= 254 && validContactEmail(this.email.trim());
  }
  protected async save(): Promise<void> {
    if (this.saving() || this.loading()) return;
    this.submitted.set(true);
    this.error.set('');
    if (this.data.companyId !== this.access.companyId()) {
      this.error.set('Select this company’s workspace before changing its users.');
      return;
    }
    if (this.data.mode === 'invite' && !this.validEmail()) {
      this.error.set('Enter a valid email address.');
      return;
    }
    if (this.data.mode !== 'delete' && !this.roles().some((r) => r.code === this.role)) {
      this.error.set('Choose a company role.');
      return;
    }
    const base = `/companies/${this.data.companyId}`;
    this.saving.set(true);
    this.dialog.disableClose = true;
    try {
      if (this.data.mode === 'invite') {
        await this.auth.api(
          `${base}/invitations`,
          { email: this.email.trim().toLowerCase(), role_code: this.role },
          'POST',
          { 'Idempotency-Key': this.invitationKey },
        );
      } else {
        const member = this.data.member;
        if (!member?.version)
          throw new Error('Reload the company membership before changing access.');
        const headers = { 'If-Match': `"v${member.version}"` };
        if (this.data.mode === 'delete') {
          await this.auth.api(`${base}/memberships/${member.id}/revoke`, {}, 'POST', headers);
        } else {
          await this.auth.api(
            `${base}/memberships/${member.id}`,
            { role_code: this.role, status: this.status.toLowerCase() },
            'PATCH',
            headers,
          );
        }
      }
      await this.access.refresh();
      this.toast.success(
        this.data.mode === 'invite'
          ? 'Invitation queued.'
          : this.data.mode === 'delete'
            ? 'Company membership removed.'
            : 'Company membership saved.',
      );
      this.dialog.close(true);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Changes could not be saved.');
    } finally {
      this.saving.set(false);
      this.dialog.disableClose = false;
    }
  }
}
