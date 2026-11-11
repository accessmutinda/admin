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
import type { ErrorStateMatcher } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CvSelect } from '../../../shared/ui/select';
import { ApiError } from '../../../core/auth/auth-api';
import { CLIENT_SECTIONS } from './client-file.models';
import { DirectoryUser, ServiceUsersApi } from './service-users-api.service';

interface Field {
  key: string;
  label: string;
  type?: 'date' | 'email' | 'tel' | 'textarea';
  options?: string[];
  readonly?: boolean;
  matcher?: ErrorStateMatcher;
  choices?: { id: string; name: string }[];
  multiple?: boolean;
  hint?: string;
  required?: boolean;
}
export type OverviewCard =
  | 'health'
  | 'support'
  | 'communication'
  | 'preferences'
  | 'contact'
  | 'demographics'
  | 'family'
  | 'plan'
  | 'goal'
  | 'record-section'
  | 'record-entry';
const FIELDS: Record<OverviewCard, Field[]> = {
  'record-section': [],
  'record-entry': [],
  plan: [
    { key: 'name', label: 'Care plan name', required: true },
    { key: 'start', label: 'Start date', type: 'date' },
    { key: 'review', label: 'Review date', type: 'date' },
    { key: 'status', label: 'Plan status', options: ['', 'Draft', 'Active', 'Archived'] },
    { key: 'needs', label: 'Care needs', type: 'textarea' },
    { key: 'support', label: 'How to support me', type: 'textarea' },
  ],
  goal: [
    { key: 'name', label: 'Care goal', required: true },
    { key: 'detail', label: 'Interventions and expected outcome', type: 'textarea' },
    { key: 'date', label: 'Record / review date', type: 'date' },
    { key: 'level', label: 'Priority', options: ['Low', 'Medium', 'High'] },
    { key: 'status', label: 'Status', options: ['Active', 'Completed', 'Inactive'] },
  ],
  family: [
    { key: 'name', label: 'Contact name' },
    { key: 'relationship', label: 'Relationship' },
    { key: 'phone', label: 'Contact phone', type: 'tel' },
    { key: 'email', label: 'Contact email', type: 'email' },
    { key: 'approved', label: 'Approved information to share', type: 'textarea' },
    { key: 'preferences', label: 'Contact preferences and restrictions', type: 'textarea' },
    {
      key: 'sharing_consent',
      label: 'Sharing consent',
      type: 'textarea',
      hint: 'Record the consent and its restrictions. These notes do not grant Family Portal access.',
    },
  ],
  demographics: [
    { key: 'name', label: 'Full name', required: true },
    { key: 'reference', label: 'Client reference', required: true },
    { key: 'dob', label: 'Date of birth', type: 'date' },
    { key: 'gender', label: 'Gender' },
    { key: 'preferredName', label: 'Preferred name' },
    { key: 'language', label: 'Preferred language' },
    { key: 'nhs', label: 'NHS number' },
    { key: 'religion', label: 'Religion / beliefs' },
    { key: 'ethnicity', label: 'Ethnicity' },
    { key: 'gp', label: 'GP / practice and contact' },
    { key: 'address', label: 'Address', required: true },
    { key: 'postcode', label: 'Postcode', required: true },
    { key: 'living', label: 'Living arrangement' },
    { key: 'sexuality', label: 'Sexuality' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'likes', label: 'Likes', type: 'textarea' },
    { key: 'dislikes', label: 'Dislikes', type: 'textarea' },
    { key: 'about', label: 'What matters to me', type: 'textarea' },
  ],
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
  template: `<div class="client-files service-user-popup">
    <div class="su-dialog-heading">
      <span class="material-symbols-outlined" aria-hidden="true">{{ icon }}</span>
      <div>
        <h2 mat-dialog-title>{{ title }}</h2>
        <p class="su-dialog-subtitle">{{ personName }}</p>
      </div>
    </div>
    <form class="client-profile-editor" (ngSubmit)="save()" [inert]="busy()">
      <mat-dialog-content>
        @if (loading()) {
          <p role="status">Loading saved details…</p>
        }
        <div class="form-grid" [attr.aria-busy]="loading()">
          @for (field of fields; track field.key) {
            <label
              >{{ field.label }}{{ field.required ? ' *' : '' }}
              @if (field.choices) {
                @if (field.multiple) {
                  <mat-select
                    cvSelect
                    multiple
                    [name]="field.key"
                    [ngModel]="selectedValues(field.key)"
                    (ngModelChange)="setSelectedValues(field.key, $event)"
                    [disabled]="field.readonly || busy() || loading() || !editable()"
                    [aria-label]="field.label"
                    [errorStateMatcher]="field.matcher!"
                    [attr.aria-invalid]="!!errors()[field.key]"
                  >
                    @for (choice of field.choices; track choice.id) {
                      <mat-option [value]="choice.id">{{ choice.name }}</mat-option>
                    }
                  </mat-select>
                } @else {
                  <mat-select
                    cvSelect
                    [name]="field.key"
                    [(ngModel)]="draft[field.key]"
                    (ngModelChange)="clearError(field.key)"
                    [disabled]="field.readonly || busy() || loading() || !editable()"
                    [aria-label]="field.label"
                    [errorStateMatcher]="field.matcher!"
                    [attr.aria-invalid]="!!errors()[field.key]"
                  >
                    <mat-option value="">Not recorded</mat-option>
                    @for (choice of field.choices; track choice.id) {
                      <mat-option [value]="choice.id">{{ choice.name }}</mat-option>
                    }
                  </mat-select>
                }
              } @else if (field.options) {
                <mat-select
                  cvSelect
                  [name]="field.key"
                  [(ngModel)]="draft[field.key]"
                  [disabled]="field.readonly || busy() || loading() || !editable()"
                  [aria-label]="field.label"
                  [errorStateMatcher]="field.matcher!"
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
                  [readonly]="field.readonly || loading() || !editable()"
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
                  [attr.autocomplete]="field.key === 'code' ? 'off' : null"
                  [attr.max]="
                    field.key === 'dob' || field.key === 'capacity_assessed_on' ? localDate : null
                  "
                  [(ngModel)]="draft[field.key]"
                  [readonly]="field.readonly || loading() || !editable()"
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
        ><button
          class="button primary"
          type="submit"
          [disabled]="busy() || loading() || !editable()"
        >
          {{ busy() ? 'Saving…' : 'Save changes' }}
        </button></mat-dialog-actions
      >
    </form>
  </div>`,
})
export class ServiceUserOverviewDialog {
  private readonly data = inject<{
    card: OverviewCard;
    goalId?: string;
    sectionKey?: string;
    entryId?: string;
    person: DirectoryUser;
    api: ServiceUsersApi;
  }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ServiceUserOverviewDialog>);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly editable = signal(true);
  private closed = false;
  private etag = this.data.person.etag;
  private readonly goalKey = crypto.randomUUID();
  localDate = this.data.person.overview?.local_date ?? '';
  readonly errors = signal<Record<string, string>>({});
  readonly personName = this.data.person.name;
  readonly icon = {
    'record-section':
      CLIENT_SECTIONS.find((section) => section.key === this.data.sectionKey)?.icon ?? 'edit',
    'record-entry':
      CLIENT_SECTIONS.find((section) => section.key === this.data.sectionKey)?.icon ?? 'add',
    plan: 'assignment',
    goal: 'flag',
    family: 'diversity_1',
    demographics: 'person',
    health: 'cardiology',
    support: 'volunteer_activism',
    communication: 'chat',
    preferences: 'sentiment_satisfied',
    contact: 'group',
  }[this.data.card];
  readonly title = {
    'record-section':
      CLIENT_SECTIONS.find((section) => section.key === this.data.sectionKey)?.label ??
      'Edit record',
    'record-entry':
      (this.data.entryId ? 'Edit ' : 'Add ') +
      (CLIENT_SECTIONS.find((section) => section.key === this.data.sectionKey)?.entryLabel ??
        'record'),
    plan: 'Care Plan',
    goal: this.data.goalId ? 'Edit goal' : 'Add goal',
    family: 'Family / Representative',
    demographics: 'Demographics & Contacts',
    health: 'Health Conditions',
    support: 'Support Needs',
    communication: 'Communication',
    preferences: 'Likes, Dislikes & Personal Information',
    contact: 'Next of Kin / Emergency Contact',
  }[this.data.card];
  readonly fields: Field[] = this.sourceFields()
    .filter(
      (field) => field.key !== 'medication_reference' || this.data.person.overview?.medication_read,
    )
    .map((field) => ({
      ...field,
      matcher: { isErrorState: () => !!this.errors()[field.key] },
      readonly:
        field.readonly ||
        (field.key === 'medication_reference' && !this.data.person.overview?.medication_edit),
    }));
  draft: Record<string, string> = {};
  private readonly scope = this.data.api.scope();
  private initial: string;
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
    destroy.onDestroy(() => {
      this.closed = true;
    });
    if (
      ['demographics', 'family', 'plan', 'goal', 'record-section', 'record-entry'].includes(
        this.data.card,
      )
    )
      void this.loadSource();
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
  private sourceFields(): Field[] {
    const section = CLIENT_SECTIONS.find((section) => section.key === this.data.sectionKey);
    if (this.data.card === 'record-section') {
      const fields: Field[] = (section?.fields ?? []).map((field) => ({
        ...field,
        options: field.options ? ['', ...field.options] : undefined,
      }));
      if (this.data.sectionKey === 'capacity')
        fields.push({
          key: 'reason',
          label: 'Findings, decision and best interests',
          type: 'textarea',
        });
      return fields;
    }
    if (this.data.card === 'record-entry') {
      const fields: Field[] = [
        {
          key: 'name',
          label: section?.nameLabel ?? 'Record name',
          required: true,
          readonly: this.data.sectionKey === 'risks' && !!this.data.entryId,
        },
        { key: 'detail', label: section?.detailLabel ?? 'Details', type: 'textarea' },
        { key: 'date', label: 'Record / review date', type: 'date' },
        {
          key: 'level',
          label: section?.risk ? 'Risk level' : 'Priority',
          options:
            this.data.sectionKey === 'capacity'
              ? ['', 'Low', 'Medium', 'High']
              : ['Low', 'Medium', 'High'],
        },
        { key: 'status', label: 'Status', options: ['Active', 'Completed', 'Inactive'] },
      ];
      if (this.data.sectionKey === 'capacity')
        fields.push({
          key: 'capacity',
          label: 'Capacity summary',
          options: ['', 'Has capacity', 'Lacks capacity', 'Fluctuates', 'Not assessed'],
        });
      return fields;
    }
    return FIELDS[this.data.card];
  }
  private readonly selections: Record<string, { raw: string; values: string[] }> = {};
  selectedValues(key: string): string[] {
    const raw = this.draft[key] ?? '';
    if (this.selections[key]?.raw !== raw)
      this.selections[key] = { raw, values: raw.split(',').filter(Boolean) };
    return this.selections[key].values;
  }
  setSelectedValues(key: string, values: string[]): void {
    this.draft[key] = values.join(',');
    this.clearError(key);
  }
  private async loadSource(): Promise<void> {
    this.loading.set(true);
    this.editable.set(false);
    try {
      let values: Record<string, unknown>;
      if (this.data.card === 'record-section' || this.data.card === 'record-entry') {
        const value = await this.data.api.getRecordSection(
          this.data.person.id,
          this.data.sectionKey!,
        );
        if (this.closed || this.scope !== this.data.api.scope()) return;
        this.etag = value.etag;
        this.localDate = value.local_date;
        this.editable.set(
          this.data.card === 'record-entry' && !this.data.entryId
            ? value.can_create
            : value.can_edit,
        );
        if (this.data.card === 'record-section')
          values = Object.fromEntries(value.fields.map((field) => [field.key, field.value]));
        else if (this.data.entryId) {
          const entry = value.entries.find((entry) => entry.id === this.data.entryId);
          if (!entry)
            throw Error('This record has changed or is unavailable. Reopen the register.');
          values = { ...entry };
        } else
          values = {
            name: '',
            detail: '',
            date: value.local_date,
            level: 'Medium',
            status: 'Active',
            capacity: '',
          };
        for (const field of this.fields) {
          if (['preferredStaff', 'backupStaff'].includes(field.key)) {
            field.readonly = !value.staff_read;
            field.choices = [...value.staff_choices];
            if (value.staff_read)
              for (const id of String(values[field.key] ?? '')
                .split(',')
                .filter(Boolean))
                if (!field.choices.some((choice) => choice.id === id))
                  field.choices.push({ id, name: 'Unavailable staff record' });
            field.multiple = field.key === 'preferredStaff';
            if (!value.staff_read)
              field.hint = 'Staff Records read permission is required to change carer preferences.';
          }
        }
      } else if (this.data.card === 'plan' || this.data.card === 'goal') {
        const value = await this.data.api.getCarePlan(this.data.person.id);
        if (this.closed || this.scope !== this.data.api.scope()) return;
        this.etag = value.etag;
        this.editable.set(
          this.data.card === 'goal' && !this.data.goalId ? value.can_create_goal : value.can_edit,
        );
        if (this.data.card === 'plan') values = { ...value.plan };
        else if (this.data.goalId) {
          const goal = value.goals.find((goal) => goal.id === this.data.goalId);
          if (!goal) throw Error('This goal is unavailable. Reopen the care plan.');
          values = { ...goal };
        } else
          values = {
            name: '',
            detail: '',
            date: this.localDate,
            level: 'Medium',
            status: 'Active',
          };
      } else {
        const value =
          this.data.card === 'family'
            ? await this.data.api.getFamily(this.data.person.id)
            : await this.data.api.getDemographics(this.data.person.id);
        if (this.closed || this.scope !== this.data.api.scope()) return;
        values = { ...('details' in value ? value.details : {}), ...value };
        this.etag = value.etag;
        if ('local_date' in value) this.localDate = value.local_date;
        this.editable.set(value.can_edit);
      }
      for (const field of this.fields) this.draft[field.key] = String(values[field.key] ?? '');
      for (const field of this.fields) {
        const value = this.draft[field.key];
        if (field.options && value && !field.options.includes(value))
          field.options = [...field.options, value];
      }
      this.initial = JSON.stringify(this.draft);
      if (!this.editable()) this.error.set('You do not have permission to edit this service user.');
    } catch (error) {
      this.editable.set(false);
      if (!this.closed && this.scope === this.data.api.scope())
        this.error.set(error instanceof Error ? error.message : 'Could not load saved details.');
    } finally {
      if (!this.closed) this.loading.set(false);
    }
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
    if (this.busy() || this.loading() || !this.editable()) return;
    this.busy.set(true);
    this.error.set('');
    this.errors.set({});
    const body: Record<string, string | null> = {};
    const sparse =
      this.data.card === 'record-section' ||
      (this.data.card === 'record-entry' && !!this.data.entryId);
    const original: Record<string, string> = JSON.parse(this.initial);
    for (const field of this.fields)
      if (!field.readonly && (!sparse || this.draft[field.key] !== original[field.key]))
        body[field.key] =
          field.type === 'date' ? this.draft[field.key] || null : this.draft[field.key];
    if (sparse && !Object.keys(body).length) {
      this.busy.set(false);
      this.ref.close();
      return;
    }
    try {
      if (this.data.card === 'record-section' || this.data.card === 'record-entry')
        await this.data.api.saveRecordSection(
          body,
          this.data.person,
          this.etag,
          this.scope,
          this.data.sectionKey!,
          this.data.card === 'record-entry' ? (this.data.entryId ?? null) : undefined,
          this.goalKey,
        );
      else if (this.data.card === 'plan' || this.data.card === 'goal')
        await this.data.api.saveCarePlan(
          body,
          this.data.person,
          this.etag,
          this.scope,
          this.data.card === 'goal' ? (this.data.goalId ?? null) : undefined,
          this.goalKey,
        );
      else if (this.data.card === 'family')
        await this.data.api.saveFamily(body, this.data.person, this.etag, this.scope);
      else if (this.data.card === 'demographics')
        await this.data.api.saveDemographics(body, this.data.person, this.etag, this.scope);
      else await this.data.api.saveCard(this.data.card, body, this.data.person, this.scope);
      this.ref.close(true);
    } catch (error) {
      if (!this.closed && this.scope === this.data.api.scope()) {
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
