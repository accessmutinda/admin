import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ROLES } from '../../../core/auth/models/role';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore, Member } from '../shared/management.store';
import { validContactEmail } from './company-contacts.models';

export interface CompanyUserDialogData {
  companyId: string;
  mode: 'invite' | 'edit' | 'delete';
  member?: Member;
}
export const COMPANY_USER_ROLES = Object.values(ROLES)
  .filter((role) => !['PO', 'IN'].includes(role.code))
  .map((role) => role.label);

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
            Remove this user's membership from {{ companyName() }}? This removes the local
            membership record. It does not delete staff records or a connected sign-in account.
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
            @for (option of roles; track option) {
              <mat-option [value]="option">{{ option }}</mat-option>
            }
          </mat-select>
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
            <p>Changes update this company's local role and membership status.</p>
          } @else {
            <p class="cm-user-delivery-note">
              <span class="material-symbols-outlined" aria-hidden="true">info</span>Saves an
              invitation on this device. Email delivery is not connected.
            </p>
          }
        }
        @if (error()) {
          <p class="cm-user-dialog-error" role="alert">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" class="cm-user-dialog-button" (click)="dialog.close()">Cancel</button>
        <button
          type="submit"
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
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly roles = [
    ...new Set([...COMPANY_USER_ROLES, ...(this.data.member?.role ? [this.data.member.role] : [])]),
  ];
  protected readonly statuses = [
    ...new Set([
      'Active',
      'Invited',
      'Suspended',
      'Inactive',
      ...(this.data.member?.status ? [this.data.member.status] : []),
    ]),
  ];
  protected email = '';
  protected role = this.data.member?.role ?? 'Care Worker';
  protected status = this.data.member?.status ?? 'Invited';
  protected companyName(): string {
    return this.store.companies().find((c) => c.id === this.data.companyId)?.name ?? 'this company';
  }
  protected validEmail(): boolean {
    return this.email.trim().length <= 254 && validContactEmail(this.email.trim());
  }
  protected save(): void {
    this.submitted.set(true);
    this.error.set('');
    if (
      this.data.companyId !== this.store.companyId() ||
      !this.store.companies().some((c) => c.id === this.data.companyId)
    ) {
      this.error.set('Select this company’s workspace before changing its users.');
      return;
    }
    if (this.data.mode === 'invite' && !this.validEmail()) {
      this.error.set('Enter a valid email address.');
      return;
    }
    if (
      this.data.mode !== 'delete' &&
      (!this.roles.includes(this.role) || !this.statuses.includes(this.status))
    ) {
      this.error.set('Choose a valid role and status.');
      return;
    }
    const email = this.email.trim().toLowerCase();
    const saved = this.store.saveWorkspace((data) => {
      if (this.data.mode === 'invite') {
        if (data.members.some((m) => m.email.trim().toLowerCase() === email)) {
          this.error.set('A user or invitation with this email already exists in this company.');
          return data;
        }
        return {
          ...data,
          members: [
            ...data.members,
            { id: crypto.randomUUID(), name: '', email, role: this.role, status: 'Invited' },
          ],
        };
      }
      const member = data.members.find((m) => m.id === this.data.member?.id);
      if (!member) {
        this.error.set('This user no longer exists. Close the popup and refresh the table.');
        return data;
      }
      return {
        ...data,
        members:
          this.data.mode === 'delete'
            ? data.members.filter((m) => m.id !== member.id)
            : data.members.map((m) =>
                m.id === member.id ? { ...m, role: this.role, status: this.status } : m,
              ),
      };
    });
    if (this.error()) return;
    if (!saved) {
      this.error.set(
        'Changes could not be saved. Your edits are still here; free some browser storage and try again.',
      );
      return;
    }
    this.toast.success(
      this.data.mode === 'invite'
        ? 'Invitation recorded. Email delivery is not connected.'
        : this.data.mode === 'delete'
          ? 'Company membership removed.'
          : 'User role and status saved.',
    );
    this.dialog.close(true);
  }
}
