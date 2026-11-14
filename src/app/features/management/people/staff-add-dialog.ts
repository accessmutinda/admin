import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';

interface StaffSetup {
  company_id: string;
  local_date: string;
  branches: string[];
  employment_types: string[];
}
export interface AddedStaff {
  company_id: string;
  staff_id: string;
  employment_id: string;
  login_email: string;
  status: string;
}

@Component({
  selector: 'cv-staff-add-dialog',
  imports: [FormsModule, MatDialogModule],
  templateUrl: './staff-add-dialog.html',
  styleUrls: ['./hr.css', './staff-add-dialog.css'],
})
export class StaffAddDialog {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly dialog = inject(MatDialogRef<StaffAddDialog, AddedStaff>);
  private readonly companyId = this.access.companyId();
  private readonly actorId = this.auth.profile()?.id;
  protected readonly setup = signal<StaffSetup | null>(null);
  protected readonly step = signal(0);
  protected readonly busy = signal(false);
  protected readonly attempted = signal(false);
  protected readonly error = signal('');
  protected readonly steps = ['Personal details', 'Employment', 'Contact & preferences', 'Review'];
  protected readonly form = {
    first_name: '',
    middle_name: '',
    surname: '',
    email: '',
    phone: '',
    birth_date: '',
    reference: '',
    branch_name: '',
    job_title: '',
    start_date: '',
    employment_type: 'Full time',
    contract_end: '',
    is_driver: false,
  };
  protected readonly personal = {
    address: '',
    addressLine2: '',
    town: '',
    postcode: '',
    nationality: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    languages: '',
  };
  protected hours: number | null = null;
  protected readonly preferences = { areas: '', shifts: '', travel: '', notes: '' };
  private requestBody = '';
  private requestKey = '';
  constructor() {
    effect(() => {
      if (!this.inScope()) this.dialog.close();
    });
    void this.load();
  }
  private inScope(): boolean {
    return (
      !!this.companyId &&
      this.companyId === this.access.companyId() &&
      this.actorId === this.auth.profile()?.id &&
      this.access.can('people', 'records', 'create') &&
      this.access.can('people', 'onboarding', 'create')
    );
  }
  protected async load(): Promise<void> {
    this.error.set('');
    try {
      const setup = await this.auth.api<StaffSetup>(`/companies/${this.companyId}/staff/setup`);
      if (!this.inScope()) return;
      if (setup.company_id !== this.companyId)
        throw Error('Staff setup does not match the selected company.');
      this.setup.set(setup);
      this.form.start_date = setup.local_date;
    } catch (error) {
      if (this.inScope())
        this.error.set(error instanceof Error ? error.message : 'Unable to load staff setup.');
    }
  }
  protected cancel(): void {
    if (!this.busy()) this.dialog.close();
  }
  protected next(form: NgForm): void {
    this.attempted.set(true);
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.error.set('');
    if (
      this.step() === 0 &&
      this.form.birth_date &&
      this.form.birth_date >= this.setup()!.local_date
    ) {
      this.error.set('Date of birth must be in the past.');
      return;
    }
    if (
      this.step() === 1 &&
      this.form.contract_end &&
      this.form.contract_end < this.form.start_date
    ) {
      this.error.set('Contract end cannot precede the start date.');
      return;
    }
    this.step.update((value) => value + 1);
    this.attempted.set(false);
  }
  protected back(): void {
    this.attempted.set(false);
    this.error.set('');
    this.step.update((value) => Math.max(0, value - 1));
  }
  protected async save(): Promise<void> {
    if (this.busy() || !this.inScope() || !this.setup()) return;
    const payload = {
      ...this.form,
      birth_date: this.form.birth_date || null,
      contract_end: this.form.contract_end || null,
      facts: {
        personal: this.personal,
        employment: this.hours === null ? {} : { hours: this.hours },
        preferences: this.preferences,
      },
    };
    const serialized = JSON.stringify(payload);
    if (serialized !== this.requestBody) {
      this.requestBody = serialized;
      this.requestKey = crypto.randomUUID();
    }
    this.busy.set(true);
    this.dialog.disableClose = true;
    this.error.set('');
    try {
      const result = await this.auth.api<AddedStaff>(
        `/companies/${this.companyId}/staff`,
        payload,
        'POST',
        { 'Idempotency-Key': this.requestKey },
      );
      if (!this.inScope()) return;
      if (result.company_id !== this.companyId)
        throw Error('The staff record does not match the selected company.');
      this.dialog.close(result);
    } catch (error) {
      if (this.inScope())
        this.error.set(error instanceof Error ? error.message : 'Unable to add this staff member.');
    } finally {
      this.busy.set(false);
      this.dialog.disableClose = false;
    }
  }
}
