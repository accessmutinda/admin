import { Component, input, output, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarePlanEditLayout } from './care-plan-edit-layout';
import { PlanVersion, PLAN_FIELDS, planDate } from './care-plan.models';
import { RotaClient } from '../rota/rota.models';
@Component({
  selector: 'cv-care-plan-about-me-editor',
  imports: [FormsModule, CarePlanEditLayout],
  templateUrl: './care-plan-about-me-editor.html',
  styleUrls: ['./care-plan-about-me.css', './care-plan-about-me-editor.css'],
})
export class CarePlanAboutMeEditor implements OnInit {
  readonly plan = input.required<PlanVersion>();
  readonly client = input.required<RotaClient>();
  readonly manager = input(false);
  readonly saved = output<PlanVersion>();
  readonly cancelled = output<void>();
  readonly dirtyChange = output<boolean>();
  readonly sourceContacts = output<void>();
  readonly steps = [
    { id: 'personal', label: 'Personal Details' },
    { id: 'about', label: 'About Me' },
    { id: 'review', label: 'Review & Visibility' },
  ];
  readonly step = signal(0);
  readonly active = signal('');
  readonly confirmed = signal<number[]>([]);
  readonly error = signal('');
  draft!: PlanVersion;
  private baseline = '';
  readonly details = [
    ['name', 'Full name', 'text', 'required'],
    ['preferred', 'Preferred name', 'text', ''],
    ['dob', 'Date of birth', 'date', 'required'],
    ['nhs', 'NHS number', 'text', ''],
    ['clientId', 'Client ID', 'text', ''],
    ['address', 'Address', 'text', 'required'],
    ['postcode', 'Postcode', 'text', 'required'],
    ['phone', 'Telephone (home)', 'tel', ''],
    ['mobile', 'Mobile', 'tel', ''],
    ['email', 'Email', 'email', ''],
  ];
  readonly stories = [
    ['situation', 'Tell us about yourself'],
    ['background', 'Background and history'],
    ['family', 'Family & relationships'],
    ['culture', 'Culture & religion'],
    ['lifestyle', 'Interests and hobbies'],
    ['matters', 'What matters most to me'],
  ];
  readonly supportFields = PLAN_FIELDS.filter(([key]) => !['situation', 'changes'].includes(key));
  readonly audiences = [
    { key: 'staff' as const, label: 'Show to Staff (Carers)' },
    { key: 'family' as const, label: 'Show to Family Portal' },
    { key: 'inspector' as const, label: 'Show to Inspector Portal' },
  ];
  ngOnInit() {
    this.draft = structuredClone(this.plan());
    this.draft.details['clientId'] ??= this.client().reference;
    this.draft.details['postcode'] ??= this.client().postcode;
    this.draft.details['mobile'] ??= this.client().file?.details['mobile'] || '';
    this.baseline = JSON.stringify(this.draft);
  }
  get section() {
    return this.draft.sections[0];
  }
  get photo() {
    return this.draft.details['aboutPhoto'] ?? this.client().file?.photo ?? '';
  }
  get dirty() {
    return JSON.stringify(this.draft) !== this.baseline;
  }
  get contacts() {
    const source = this.client().file?.contacts || [];
    return [
      { title: 'GP', record: source.find((c) => c.type === 'GP') },
      { title: 'Next of Kin', record: source.find((c) => c.nextOfKin) },
      { title: 'Social Worker', record: source.find((c) => /social worker/i.test(c.relationship)) },
      {
        title: 'District Nurse',
        record: source.find((c) => /district nurse/i.test(c.relationship)),
      },
      {
        title: 'Other Health Professional',
        record: source.find(
          (c) => c.type === 'Professional' && !/social worker|district nurse/i.test(c.relationship),
        ),
      },
      { title: 'Pharmacy', record: source.find((c) => c.type === 'Pharmacy') },
    ];
  }
  changed() {
    this.section.complete = false;
    this.draft.confirmed = false;
    this.confirmed.update((v) => v.filter((s) => s !== this.step()));
    this.dirtyChange.emit(this.dirty);
  }
  edit(card: string) {
    this.active.set(this.active() === card ? '' : card);
  }
  switchStep(step: number) {
    this.step.set(step);
    this.active.set('');
    this.error.set('');
  }
  validate() {
    for (const key of ['name', 'dob', 'address', 'postcode'])
      if (!this.draft.details[key]?.trim())
        return 'Complete full name, date of birth, address and postcode.';
    if (!planDate(this.draft.details['dob'])) return 'Enter a valid date of birth.';
    if (
      this.draft.details['email'] &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.draft.details['email'])
    )
      return 'Enter a valid email address.';
    if (!planDate(this.section.review)) return 'Enter a valid section review date.';
    return '';
  }
  confirmAll() {
    this.error.set(this.validate());
    if (this.error()) return;
    this.confirmed.update((v) => [...new Set([...v, this.step()])]);
    if (this.step() === 0) this.draft.confirmed = true;
    this.active.set('');
    this.dirtyChange.emit(this.dirty);
  }
  save() {
    this.error.set(this.validate());
    if (!this.error() && this.dirty) this.saved.emit(structuredClone(this.draft));
  }
  cancel() {
    if (!this.dirty || window.confirm('Discard unsaved About Me edits?')) this.cancelled.emit();
  }
  removePhoto() {
    this.draft.details['aboutPhoto'] = '';
    this.changed();
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      this.error.set('Choose a JPG, PNG or WebP photo up to 1 MB.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.draft.details['aboutPhoto'] = String(reader.result);
      this.changed();
    };
    reader.onerror = () => this.error.set('The photo could not be read. Please try again.');
    reader.readAsDataURL(file);
  }
}
