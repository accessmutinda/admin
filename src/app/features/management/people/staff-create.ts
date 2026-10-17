import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Person } from '../shared/management.store';
import { HrService } from './hr.service';
import { STAFF_STEPS, newStaff, staffRecord, staffErrors, readiness } from './hr.models';
import { StaffFields } from './staff-fields';
@Component({
  selector: 'cv-staff-create',
  host: { class: 'module-page module-create people-page hr-create-page' },
  imports: [RouterLink, StaffFields],
  templateUrl: './staff-create.html',
  styleUrls: ['./hr.css', './hr-create.css'],
})
export class StaffCreate {
  protected readonly hr = inject(HrService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly companyId = this.hr.store.companyId();
  protected readonly steps = STAFF_STEPS;
  protected readonly stepHints = [
    'Basic information',
    'Role, employment and checks',
    'Working hours and areas',
    'Courses and certifications',
    'Upload and verify',
    'Check and confirm',
  ];
  protected readonly step = signal(0);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly busy = signal(false);
  protected readonly invalid = signal('');
  protected readonly ready = readiness;
  protected p: Person = newStaff();
  private draftId: string = crypto.randomUUID();
  private sourceId = this.route.snapshot.queryParamMap.get('source') ?? undefined;
  private baseline = '';
  private finished = false;
  constructor() {
    const draftId = this.route.snapshot.queryParamMap.get('draft');
    if (draftId) {
      const d = this.hr.drafts().find((v) => v.id === draftId);
      if (!d) this.invalid.set('This draft is not available in your account and company.');
      else {
        this.p = structuredClone(d.person);
        this.draftId = d.id;
        this.sourceId = d.sourceId;
        this.step.set(Math.min(5, Math.max(0, d.step)));
      }
    } else if (this.sourceId) {
      const source = this.hr.store
        .data()
        .people.find((p) => p.id === this.sourceId && p.stage === 'Offer');
      if (!source) this.invalid.set('Open an applicant at Offer stage to begin staff setup.');
      else {
        this.p = { ...structuredClone(source), hr: staffRecord(source) };
      }
    }
    if (!this.hr.can('create')) this.invalid.set('Your role cannot create staff records.');
    this.baseline = JSON.stringify(this.p);
  }
  protected select(index: number): void {
    this.error.set('');
    if (index > this.step()) {
      const errors = staffErrors(this.p).slice(0, index).flat();
      if (errors.length) {
        this.error.set(errors.join(' '));
        return;
      }
    }
    this.step.set(index);
  }
  protected saveDraft(): void {
    this.error.set('');
    const result = this.hr.saveDraft({
      id: this.draftId,
      companyId: this.companyId,
      ownerId: this.hr.auth.currentUser()!.id,
      savedAt: '',
      step: this.step(),
      person: this.p,
      sourceId: this.sourceId,
    });
    if (result) this.error.set(result);
    else {
      this.baseline = JSON.stringify(this.p);
      this.notice.set('Draft saved on this device. Resume it from Onboarding.');
    }
  }
  protected create(): void {
    const error = this.hr.savePerson(
      this.p,
      this.companyId,
      this.sourceId ? 'Applicant converted to staff' : 'Staff record created',
      { draftId: this.draftId, sourceId: this.sourceId },
    );
    this.error.set(error ?? '');
    if (!error) {
      this.finished = true;
      void this.router.navigate(['/manage/people/staff', this.p.id, 'overview']);
    }
  }
  canLeave(): boolean {
    return (
      this.finished ||
      this.baseline === JSON.stringify(this.p) ||
      window.confirm('You have unsaved staff details. Leave without saving them?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected beforeUnload(
    event: BeforeUnloadEvent,
  ): void {
    if (!this.finished && this.baseline !== JSON.stringify(this.p)) event.preventDefault();
  }
}
