import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CarePlanRichText, CareRichTextValue } from './care-plan-rich-text';
import { PlanVersion, PlanSection, planDate } from './care-plan.models';
import { RotaClient } from '../rota/rota.models';
import { CareDocument } from './care.models';
export interface MobilityLink {
  kind: 'assessment' | 'risk' | 'incident';
  id: string;
  name: string;
  date: string;
}
@Component({
  selector: 'cv-care-plan-mobility',
  imports: [FormsModule, DatePipe, CarePlanRichText],
  templateUrl: './care-plan-mobility.html',
  styleUrl: './care-plan-mobility.css',
})
export class CarePlanMobility {
  readonly client = input.required<RotaClient>();
  readonly plan = input.required<PlanVersion>();
  readonly approved = input<PlanVersion>();
  readonly previous = input<PlanSection>();
  readonly editable = input(false);
  readonly canAddDocuments = input(false);
  readonly manager = input(false);
  readonly actor = input('Care manager');
  readonly documents = input<CareDocument[]>([]);
  readonly action = output<string>();
  readonly linked = output<MobilityLink>();
  readonly documentView = output<string>();
  readonly message = signal('');
  readonly error = signal('');
  readonly historyOpen = signal(false);
  readonly fields = [
    { key: 'situation', label: '1. Current situation with regard to my needs', compact: false },
    { key: 'assistance', label: '2. What assistance is required?', compact: false },
    { key: 'equipment', label: '3. Equipment or aids required', compact: true },
    { key: 'strengths', label: '5. My strengths and independence', compact: false },
    { key: 'preferences', label: '6. My preferences, wishes and choices', compact: false },
    { key: 'goal', label: '7. Desired outcome / goal', compact: true },
    { key: 'risks', label: '8. Risks and escalation', compact: true },
  ];
  readonly audiences = [
    { key: 'staff' as const, label: 'Staff / Carers' },
    { key: 'family' as const, label: 'Family Portal' },
    { key: 'inspector' as const, label: 'Inspector Portal' },
  ];
  get section() {
    return this.plan().sections[2];
  }
  get history() {
    return this.plan().events.filter((e) => e.detail.includes('Mobility'));
  }
  get lastReview() {
    return (
      this.section.fields['lastReview'] ??
      (this.approved()?.approvedAt || this.plan().approvedAt || this.plan().createdAt).slice(0, 10)
    );
  }
  get changesStatus() {
    return (
      this.section.fields['reviewChangeStatus'] ||
      (!this.section.fields['changes'] || /^no change/i.test(this.section.fields['changes'])
        ? 'No change'
        : 'Changes recorded')
    );
  }
  get supporting() {
    return this.documents().filter(
      (d) =>
        /mobility|occupational|therapy|moving|handling|falls/i.test(
          d.name + ' ' + d.category + ' ' + (d.description || ''),
        ) && !d.deletedAt,
    );
  }
  get links(): MobilityLink[] {
    return [
      ...this.plan()
        .assessments.filter((a) => a.section === 'Mobility')
        .map((a) => ({ kind: 'assessment' as const, id: a.id, name: a.name, date: a.review })),
      ...(this.client().file?.entries['risks'] || [])
        .filter(
          (r) =>
            r.status === 'Active' &&
            /fall|mobil|transfer|moving|handling/i.test(r.name + ' ' + r.detail),
        )
        .map((r) => ({ kind: 'risk' as const, id: r.id, name: r.name, date: r.date })),
      ...(this.client().file?.entries['incidents'] || [])
        .filter((r) => /fall|mobil|transfer|balance/i.test(r.name + ' ' + r.detail))
        .map((r) => ({ kind: 'incident' as const, id: r.id, name: r.name, date: r.date })),
    ];
  }
  get relevantIncidents() {
    return (this.client().file?.entries['incidents'] || []).filter(
      (r) => r.status === 'Active' && /fall|mobil|transfer|balance/i.test(r.name + ' ' + r.detail),
    );
  }
  get suggestion() {
    if (this.relevantIncidents.length)
      return 'A linked incident records a change relevant to mobility. Confirm the current situation with the person and review the linked moving and handling assessment before agreeing any changes to support. Record the review decision and escalation already agreed in the source record.';
    return 'Review the recorded mobility, assistance and equipment with the person, alongside the linked assessments and visit records. Confirm whether the current support remains appropriate and record any agreed changes before completing this section.';
  }
  richHtml(key: string) {
    return this.section.fields['_richText_' + key] === this.section.fields[key]
      ? this.section.fields['_richHtml_' + key] || ''
      : '';
  }
  changeRich(key: string, value: CareRichTextValue) {
    if (!this.editable()) return;
    this.section.fields[key] = value.text;
    this.section.fields['_richText_' + key] = value.text;
    this.section.fields['_richHtml_' + key] = value.html;
    this.changed();
  }
  changed() {
    if (!this.editable()) return;
    this.section.complete = false;
    this.error.set('');
    this.message.set('');
  }
  setLastReview(value: string) {
    if (this.editable()) {
      this.section.fields['lastReview'] = value;
      this.changed();
    }
  }
  setChanges(value: string) {
    if (!this.editable()) return;
    const previous = this.changesStatus;
    this.section.fields['reviewChangeStatus'] = value;
    this.section.fields['changes'] =
      value === 'No change'
        ? 'No change'
        : previous === 'No change'
          ? ''
          : this.section.fields['changes'];
    this.changed();
  }
  setReviewNotes(value: string) {
    if (this.editable()) {
      this.section.fields['changes'] = value;
      this.section.fields['reviewChangeStatus'] = 'Changes recorded';
      this.changed();
    }
  }
  applySuggestion() {
    if (!this.editable()) return;
    const previous = this.section.fields['changes'] || '';
    if (this.section.fields['changes'] === this.suggestion) {
      this.message.set('This suggestion is already in the review notes.');
      return;
    }
    this.section.fields['changes'] = this.suggestion;
    this.section.fields['reviewChangeStatus'] = 'Changes recorded';
    this.changed();
    this.plan().events.push({
      at: new Date().toISOString(),
      by: this.actor(),
      action: 'Mobility AI review note accepted',
      detail: JSON.stringify({
        section: 'Mobility',
        field: 'changes',
        previous,
        current: this.suggestion,
        source: 'Seeded frontend suggestion',
        linkedRecords: this.links.map((r) => r.id),
      }),
    });
    this.message.set(
      'Suggestion added to Changes since last review. Check the wording and save the draft.',
    );
  }
  save(complete: boolean) {
    if (!this.editable()) return;
    if (!planDate(this.section.review) || (this.lastReview && !planDate(this.lastReview))) {
      this.error.set('Enter valid review dates.');
      return;
    }
    if (this.lastReview && this.lastReview > this.section.review) {
      this.error.set('The next review date must be on or after the last review date.');
      return;
    }
    if (this.changesStatus === 'Changes recorded' && !this.section.fields['changes']?.trim()) {
      this.error.set('Describe the changes or select No change.');
      return;
    }
    this.section.fields['lastReview'] = this.lastReview;
    this.action.emit(complete ? 'complete' : 'save');
  }
}
