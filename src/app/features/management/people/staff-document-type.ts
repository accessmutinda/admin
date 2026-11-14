import { Component, effect, input, output, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

export const STAFF_DOCUMENT_TYPES = [
  'Employment contract',
  'Job description',
  'Staff handbook',
  'Code of conduct',
  'Interview notes',
  'Interview assessment',
  'Offer letter',
  'CV / Resume',
  'Cover letter',
  'Passport',
  'Right to work evidence',
  'DBS certificate',
  'Training certificate',
  'Professional registration',
  'Reference',
  'Driving licence',
  'Vehicle insurance',
  'Proof of address',
  'Appraisal',
  'Other Records',
];

@Component({
  selector: 'cv-staff-document-type',
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <select
      #typeSelect
      [formControl]="selection"
      (change)="select(typeSelect.value)"
      [attr.aria-label]="label()"
    >
      @if (value() && !types.includes(value())) {
        <option [value]="value()">{{ value() }}</option>
      }
      @for (type of types; track type) {
        <option [value]="type">{{ type }}</option>
      }
      <option value="__custom__">Other document type…</option>
    </select>
    @if (custom()) {
      <div class="custom-type">
        <input
          [ngModel]="customName"
          [ngModelOptions]="{ standalone: true }"
          (ngModelChange)="customName = $event"
          placeholder="Enter document type"
          maxlength="100"
          [disabled]="disabled()"
          [attr.aria-label]="label() + ' name'"
        />
        <button type="button" (click)="saveCustom()" [disabled]="disabled() || !customName.trim()">
          Save type
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 160px;
    }
    select,
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 7px 9px;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      background: white;
      color: #10355e;
      font: inherit;
    }
    .custom-type {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }
    button {
      flex-shrink: 0;
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      background: #f8fafc;
      color: #10355e;
      font: inherit;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    select:focus-visible,
    input:focus-visible,
    button:focus-visible {
      outline: 2px solid #0074cc;
      outline-offset: 2px;
    }
  `,
})
export class StaffDocumentType {
  readonly value = input('Other Records');
  readonly disabled = input(false);
  readonly label = input('Document type');
  readonly typeChange = output<string>();
  protected readonly types = STAFF_DOCUMENT_TYPES;
  protected readonly selection = new FormControl('Other Records', { nonNullable: true });
  protected readonly custom = signal(false);
  protected customName = '';
  constructor() {
    effect(() => {
      this.value();
      this.custom.set(false);
    });
    effect(() => {
      this.selection.setValue(this.value(), { emitEvent: false });
      if (this.disabled()) this.selection.disable({ emitEvent: false });
      else this.selection.enable({ emitEvent: false });
    });
  }
  protected select(value: string): void {
    if (this.disabled()) return;
    this.custom.set(value === '__custom__');
    if (value !== '__custom__') {
      this.typeChange.emit(value);
      this.selection.setValue(this.value(), { emitEvent: false });
    }
  }
  protected saveCustom(): void {
    const value = this.customName.trim();
    if (this.disabled() || !value || value.length > 100) return;
    this.typeChange.emit(value);
  }
}
