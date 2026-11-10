import {
  Component,
  DestroyRef,
  ElementRef,
  ChangeDetectorRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CvSelect } from '../../../shared/ui/select';
import { ApiError } from '../../../core/auth/auth-api';
import { DirectoryUser, ServiceUsersApi } from './service-users-api.service';

interface Field {
  key: string;
  label: string;
  type?: 'date' | 'email' | 'textarea';
  options?: string[];
  readonly?: boolean;
  hint?: string;
}
export type OverviewCard = 'health' | 'support' | 'communication' | 'preferences' | 'contact';
const FIELDS: Record<OverviewCard, Field[]> = {
  health: [
    { key: 'primary_diagnosis', label: 'Primary diagnosis' },
    { key: 'other_conditions', label: 'Other conditions', type: 'textarea' },
    { key: 'equipment', label: 'Equipment' },
    {
      key: 'mobility_support',
      label: 'Assistance required',
      options: ['', 'Independent', 'One person', 'Two people', 'Specialist assessment required'],
    },
    { key: 'mobility_instructions', label: 'Transfer and mobility instructions', type: 'textarea' },
    {
      key: 'capacity_status',
      label: 'Capacity summary',
      options: ['', 'Has capacity', 'Lacks capacity', 'Fluctuates', 'Not assessed'],
    },
    { key: 'capacity_assessed_on', label: 'Last assessed', type: 'date' },
    { key: 'capacity_reason', label: 'Findings, decision and best interests', type: 'textarea' },
    { key: 'welfare_lpa', label: 'Health & Welfare attorney and contact' },
    { key: 'finance_lpa', label: 'Property & Finance attorney and contact' },
    { key: 'allergies', label: 'Allergies, reactions and response guidance', type: 'textarea' },
    {
      key: 'medication_reference',
      label: 'Medication and support information',
      type: 'textarea',
      hint: 'Historical medication information. Structured prescriptions and administration belong in Medication & MAR.',
    },
    { key: 'diet', label: 'Dietary needs', type: 'textarea' },
    { key: 'ongoing', label: 'Ongoing healthcare', type: 'textarea' },
  ],
  support: [
    { key: 'personal', label: 'Personal care', type: 'textarea' },
    { key: 'nutrition', label: 'Nutrition and hydration', type: 'textarea' },
    { key: 'mobility_instructions', label: 'Transfer and mobility instructions', type: 'textarea' },
    { key: 'continence', label: 'Continence', type: 'textarea' },
    { key: 'safety', label: 'Safety and mental wellbeing', type: 'textarea' },
    { key: 'behaviour', label: 'Behaviour and reassuring approaches', type: 'textarea' },
    { key: 'continuity', label: 'Continuity notes', type: 'textarea' },
  ],
  communication: [
    { key: 'communication', label: 'How to communicate with me', type: 'textarea' },
    { key: 'language', label: 'Preferred language' },
    { key: 'hearing', label: 'Hearing needs and aids', type: 'textarea' },
    { key: 'vision', label: 'Vision needs and aids', type: 'textarea' },
    { key: 'sensory', label: 'Other sensory support / existing notes', type: 'textarea' },
    {
      key: 'decision_support',
      label: 'Support to understand and communicate decisions',
      type: 'textarea',
    },
  ],
  preferences: [
    { key: 'likes', label: 'Likes', type: 'textarea' },
    { key: 'dislikes', label: 'Dislikes', type: 'textarea' },
    { key: 'about', label: 'What matters to me', type: 'textarea' },
  ],
  contact: [
    { key: 'name', label: 'Contact name' },
    { key: 'relationship', label: 'Relationship' },
    { key: 'phone', label: 'Contact phone' },
    { key: 'email', label: 'Contact email', type: 'email' },
  ],
};
@Component({
  selector: 'cv-service-user-overview-dialog',
  imports: [FormsModule, MatDialogModule, MatSelectModule, CvSelect],
  host: { class: 'module-page clients-page' },
  styleUrls: ['./client-files.css', './client-profile-editor.css'],
  template: `<div class="client-files">
    <h2 mat-dialog-title>{{ title }}</h2>
    <form class="client-profile-editor" (ngSubmit)="save()" [inert]="busy()">
      <mat-dialog-content>
        <div class="form-grid">
          @for (field of fields; track field.key) {
            <label
              >{{ field.label }}
              @if (field.options) {
                <mat-select
                  cvSelect
                  [name]="field.key"
                  [(ngModel)]="draft[field.key]"
                  [disabled]="field.readonly || busy()"
                  [attr.aria-label]="field.label"
                  [attr.aria-invalid]="!!errors()[field.key]"
                  [attr.aria-describedby]="
                    errors()[field.key] ? 'overview-' + field.key + '-error' : null
                  "
                  (ngModelChange)="clearError(field.key)"
                >
                  @for (option of field.options; track option) {
                    <mat-option [value]="option">{{ option || 'Not recorded' }}</mat-option>
                  }
                </mat-select>
              } @else if (field.type === 'textarea') {
                <textarea
                  [name]="field.key"
                  [attr.name]="field.key"
                  [(ngModel)]="draft[field.key]"
                  [readonly]="field.readonly"
                  rows="3"
                  [attr.aria-invalid]="!!errors()[field.key]"
                  [attr.aria-describedby]="
                    errors()[field.key] ? 'overview-' + field.key + '-error' : null
                  "
                  (ngModelChange)="clearError(field.key)"
                ></textarea>
              } @else {
                <input
                  [name]="field.key"
                  [attr.name]="field.key"
                  [type]="field.type || 'text'"
                  [(ngModel)]="draft[field.key]"
                  [readonly]="field.readonly"
                  [attr.aria-invalid]="!!errors()[field.key]"
                  [attr.aria-describedby]="
                    errors()[field.key] ? 'overview-' + field.key + '-error' : null
                  "
                  (ngModelChange)="clearError(field.key)"
                />
              }
              @if (errors()[field.key]) {
                <small class="client-field-error" [id]="'overview-' + field.key + '-error'">{{
                  errors()[field.key]
                }}</small>
              }
              @if (field.hint) {
                <small>{{ field.hint }}</small>
              }
            </label>
          }
        </div>
        @if (error()) {
          <p class="client-error" role="alert">{{ error() }}</p>
        }</mat-dialog-content
      ><mat-dialog-actions align="end"
        ><button class="button" type="button" (click)="cancel()" [disabled]="busy()">Discard</button
        ><button class="button primary" type="submit" [disabled]="busy()">
          {{ busy() ? 'Saving…' : 'Save changes' }}
        </button></mat-dialog-actions
      >
    </form>
  </div>`,
})
export class ServiceUserOverviewDialog {
  private readonly data = inject<{
    card: OverviewCard;
    person: DirectoryUser;
    api: ServiceUsersApi;
  }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ServiceUserOverviewDialog>);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly errors = signal<Record<string, string>>({});
  readonly title = {
    health: 'Health Conditions',
    support: 'Support Needs',
    communication: 'Communication',
    preferences: 'Likes, Dislikes & Personal Information',
    contact: 'Next of Kin / Emergency Contact',
  }[this.data.card];
  readonly fields = FIELDS[this.data.card]
    .filter(
      (field) => field.key !== 'medication_reference' || this.data.person.overview?.medication_read,
    )
    .map((field) => ({
      ...field,
      readonly: field.key === 'medication_reference' && !this.data.person.overview?.medication_edit,
    }));
  draft: Record<string, string> = {};
  private readonly scope = this.data.api.scope();
  private readonly initial: string;
  constructor() {
    const person = this.data.person,
      overview = person.overview!;
    const values: Record<string, string> = {
      ...overview.clinical,
      language: person.file?.details['language'] ?? '',
      ...Object.fromEntries(
        Object.entries(person.file?.details ?? {}).filter(([key]) =>
          ['likes', 'dislikes', 'about'].includes(key),
        ),
      ),
      capacity_status: overview.capacity.status,
      capacity_assessed_on: overview.capacity.assessed_on ?? '',
      capacity_reason: overview.capacity.reason,
      medication_reference: overview.medication_reference ?? '',
    };
    for (const field of this.fields)
      this.draft[field.key] =
        this.data.card === 'contact'
          ? (person.representative?.[
              field.key as keyof NonNullable<DirectoryUser['representative']>
            ] ?? '')
          : (values[field.key] ?? '');
    this.initial = JSON.stringify(this.draft);
    this.ref.disableClose = true;
    const destroy = inject(DestroyRef);
    this.ref
      .backdropClick()
      .pipe(takeUntilDestroyed(destroy))
      .subscribe(() => this.cancel());
    this.ref
      .keydownEvents()
      .pipe(takeUntilDestroyed(destroy))
      .subscribe((event) => {
        if (event.key === 'Escape') this.cancel();
      });
    effect(() => {
      const scope = this.data.api.scope(),
        personId = this.data.api.selected()?.id;
      if (scope !== this.scope || (personId && personId !== this.data.person.id))
        untracked(() => this.ref.close());
    });
  }
  clearError(key: string): void {
    this.errors.update((errors) => {
      const copy = { ...errors };
      delete copy[key];
      return copy;
    });
  }
  cancel(): void {
    if (
      !this.busy() &&
      (JSON.stringify(this.draft) === this.initial || window.confirm('Discard unsaved changes?'))
    )
      this.ref.close();
  }
  async save(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.errors.set({});
    const body: Record<string, string | null> = {};
    for (const field of this.fields)
      if (!field.readonly)
        body[field.key] =
          field.key === 'capacity_assessed_on'
            ? this.draft[field.key] || null
            : this.draft[field.key];
    try {
      await this.data.api.saveCard(this.data.card, body, this.data.person, this.scope);
      this.ref.close(true);
    } catch (error) {
      if (this.scope === this.data.api.scope()) {
        if (error instanceof ApiError)
          this.errors.set(
            Object.fromEntries(
              Object.entries(error.fieldErrors).map(([key, value]) => [key, value.join(' ')]),
            ),
          );
        this.error.set(error instanceof Error ? error.message : 'Could not save these details.');
        this.busy.set(false);
        this.changeDetector.detectChanges();
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }
    } finally {
      this.busy.set(false);
    }
  }
}
