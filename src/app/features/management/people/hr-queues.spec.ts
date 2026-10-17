import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { COURSES, ManagementStore } from '../shared/management.store';
import { HrOnboarding } from './hr-onboarding';
import { HrCompliance } from './hr-compliance';
import { HrWorkspace } from './hr-workspace';
import { HrService } from './hr.service';
import { newStaff, StaffStatus } from './hr.models';
import { complianceRows, onboardingRow } from './hr-queues.models';

function employee(id: string, status: StaffStatus = 'Onboarding') {
  const person = newStaff();
  Object.assign(person, {
    id,
    name: id + ' Example',
    email: id + '@example.org',
    role: 'Care Worker',
    location: 'London',
    start: '2026-01-01',
  });
  const record = person.hr!;
  record.status = status;
  record.reference = id;
  Object.assign(record.personal, { firstName: id, surname: 'Example' });
  record.employment.type = 'Permanent';
  record.checks.forEach((check) => (check.status = 'Not required'));
  record.induction.forEach((task) => (task.complete = true));
  record.training = COURSES.filter((course) => course.category === 'Mandatory').map((course) => ({
    courseId: course.id,
    completed: '2026-01-01',
    expiry: '',
    assessor: '',
    competency: 'Not assessed',
    certificateId: '',
  }));
  return person;
}

describe('Dedicated onboarding and compliance flows', () => {
  let harness: RouterTestingHarness;
  let store: ManagementStore;
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/people/onboarding', component: HrOnboarding },
          { path: 'manage/people/compliance', component: HrCompliance },
          { path: 'manage/people/staff', component: HrWorkspace, data: { hrMode: 'directory' } },
        ]),
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    harness = await RouterTestingHarness.create();
  });
  const text = () => harness.routeNativeElement!.textContent!;
  async function button(label: string) {
    [...harness.routeNativeElement!.querySelectorAll('button')]
      .find((element) => element.textContent?.trim() === label)!
      .click();
    harness.detectChanges();
    await harness.fixture.whenStable();
  }
  it('keeps onboarding tasks separate from individual compliance check actions', async () => {
    const starter = employee('Starter');
    starter.hr!.training = [];
    const active = employee('Existing', 'Active');
    active.hr!.checks[0].status = 'Pending';
    store.update((data) => ({ ...data, people: [starter, active] }));
    await harness.navigateByUrl('/manage/people/onboarding');
    expect(text()).toContain('Starter Example');
    expect(text()).not.toContain('Existing Example');
    expect(text()).toContain('Checklist Progress');
    expect(text()).not.toContain('DBS Status');
    await harness.navigateByUrl('/manage/people/compliance');
    expect(text()).toContain('Existing Example');
    expect(text()).not.toContain('Starter Example');
    expect(text()).not.toContain('Mandatory training');
    expect(harness.routeNativeElement!.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelectorAll('.hr-stat')).toHaveLength(4);
  });
  it('moves a completed starter to active staff without duplicating the employee', async () => {
    store.update((data) => ({ ...data, people: [employee('Ready')] }));
    await harness.navigateByUrl('/manage/people/onboarding?lane=ready');
    expect(text()).toContain('Ready Example');
    await button('Complete Onboarding');
    expect(text()).toContain('Ready Example is now active');
    expect(harness.routeNativeElement!.querySelector('tbody')!.textContent).not.toContain(
      'Ready Example',
    );
    expect(store.data().people).toHaveLength(1);
    expect(store.data().people[0].hr!.status).toBe('Active');
    expect(store.data().people[0].hr!.audit.at(-1)!.action).toContain('Onboarding completed');
    await harness.navigateByUrl('/manage/people/staff?status=Active');
    expect(text()).toContain('Ready Example');
  });
  it('keeps a starter in the queue and reports failed activation saves', async () => {
    store.update((data) => ({ ...data, people: [employee('Ready')] }));
    await harness.navigateByUrl('/manage/people/onboarding?lane=ready');
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    await button('Complete Onboarding');
    expect(text()).toContain('could not be saved');
    expect(store.data().people[0].hr!.status).toBe('Onboarding');
    expect(harness.routeNativeElement!.querySelector('tbody')!.textContent).toContain(
      'Ready Example',
    );
  });
  it('does not count unsupported verification or future learning as completed onboarding', () => {
    const person = employee('Evidence');
    person.hr!.checks[0].status = 'Verified';
    expect(onboardingRow(person).ready).toBe(false);
    expect(complianceRows([person])[0].state).toBe('Needs evidence');
    person.hr!.checks[0].status = 'Not required';
    person.hr!.training[0].completed = '2999-01-01';
    expect(onboardingRow(person).ready).toBe(false);
  });
  it('excludes departed staff and non-check readiness work from compliance and exports the filtered checks', async () => {
    const person = employee('Current', 'Active');
    person.hr!.checks[0].status = 'Pending';
    person.hr!.checks[1].status = 'Pending';
    person.hr!.checks[1].expiry = '2020-01-01';
    const departed = employee('Departed', 'Left');
    departed.hr!.checks[0].status = 'Pending';
    store.update((data) => ({ ...data, people: [person, departed] }));
    await harness.navigateByUrl('/manage/people/compliance?check=Expired');
    expect(text()).not.toContain('Departed Example');
    expect(harness.routeNativeElement!.querySelectorAll('tbody tr')).toHaveLength(1);
    const download = vi.spyOn(store, 'download').mockImplementation(() => {});
    await button('downloadExport Checks');
    expect(download).toHaveBeenCalledWith(
      'workforce-compliance-checks.csv',
      expect.stringContaining('Expired'),
      'text/csv',
    );
    expect(download.mock.calls[0][1]).not.toContain('Departed');
    expect(download.mock.calls[0][1]).not.toContain('"Pending"');
  });
  it('keeps saved drafts out of staff counts and exposes them only in the draft lane', async () => {
    const hr = TestBed.inject(HrService);
    const draft = employee('Draft');
    store.update((data) => ({ ...data, people: [] }));
    expect(
      hr.saveDraft({
        id: 'draft',
        companyId: 'lqcs',
        ownerId: hr.auth.currentUser()!.id,
        person: draft,
        step: 2,
        savedAt: '',
      }),
    ).toBeNull();
    await harness.navigateByUrl('/manage/people/onboarding?lane=drafts');
    expect(text()).toContain('Draft Example');
    expect(text()).toContain('Resume Draft');
    await harness.navigateByUrl('/manage/people/staff');
    expect(text()).not.toContain('Draft Example');
  });
});
