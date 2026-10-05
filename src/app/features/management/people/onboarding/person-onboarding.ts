import { Component, inject, input } from '@angular/core';
import { ManagementStore, Person, ONBOARDING } from '../../shared/management.store';
@Component({
  selector: 'cv-person-onboarding',
  imports: [],
  templateUrl: './person-onboarding.html',
})
export class PersonOnboarding {
  readonly person = input.required<Person>();
  protected readonly store = inject(ManagementStore);
  protected readonly checklist = ONBOARDING;
  protected readonly onboardingHints = [
    'Confirm the offer and agreed terms.',
    'Record eligibility to work.',
    'Complete the required background review.',
    'Prepare and issue employment documents.',
    'Agree a time for their introduction.',
    'Give them a clear learning plan.',
    'Make space for a personal welcome.',
    'Prepare the essentials for day one.',
  ];
  protected readonly onboardingIcons = [
    'handshake',
    'badge',
    'verified_user',
    'description',
    'event',
    'school',
    'waving_hand',
    'task_alt',
  ];
  protected completed(p: Person): number {
    return p.onboarding.filter(Boolean).length;
  }
  protected progress(p: Person): number {
    return Math.round((this.completed(p) / this.checklist.length) * 100);
  }
  protected toggle(index: number): void {
    const p = this.person();
    if (!p) return;
    const values = [...p.onboarding];
    values[index] = !values[index];
    this.store.updatePerson({ ...p, onboarding: values });
  }
}
