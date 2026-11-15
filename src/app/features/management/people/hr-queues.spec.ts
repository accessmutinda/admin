import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { COURSES } from '../shared/management.store';
import { HrOnboarding } from './hr-onboarding';
import { HrCompliance } from './hr-compliance';
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
  Object.assign(person.hr!.personal, { firstName: id, surname: 'Example' });
  Object.assign(person.hr!, { status, reference: id });
  person.hr!.employment.type = 'Permanent';
  person.hr!.checks.forEach((check) => (check.status = 'Not required'));
  person.hr!.induction.forEach((task) => (task.complete = true));
  person.hr!.training = COURSES.filter((course) => course.category === 'Mandatory').map(
    (course) => ({
      courseId: course.id,
      completed: '2026-01-01',
      expiry: '',
      assessor: '',
      competency: 'Not assessed',
      certificateId: '',
    }),
  );
  return person;
}
function queue(kind = 'starter', ready = false) {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 'record-1',
        kind,
        source_id: 'application-1',
        name: 'Actual Starter',
        email: 'starter@example.test',
        reference: 'N-1',
        branch: 'North',
        start_date: '2026-11-14',
        manager: null,
        step: kind === 'draft' ? 2 : null,
        saved_at: null,
        completed: ready ? 20 : 2,
        total: 20,
        ready,
        next_task: ready ? null : 'DBS check',
        next_section: 'compliance',
        etag: '"v3"',
      },
    ],
    meta: {
      company_id: 'north',
      counts: {
        drafts: kind === 'draft' ? 1 : 0,
        in_progress: !ready && kind !== 'draft' ? 1 : 0,
        ready: ready ? 1 : 0,
      },
      branches: ['North'],
      unavailable: { readiness: null, drafts: null },
    },
  };
}
async function render(body: unknown, url = '/manage/people/onboarding') {
  const request = vi.fn().mockResolvedValue(body);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'manage/people/onboarding', component: HrOnboarding },
        { path: 'manage/people/compliance', component: HrCompliance },
      ]),
      { provide: AuthService, useValue: { profile: signal({ id: 'reviewer' }), api: request } },
      {
        provide: CompanyAccessService,
        useValue: { companyId: signal('north'), context: () => ({ revision: 1 }), can: () => true },
      },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await vi.waitFor(() => expect(request).toHaveBeenCalled());
  await harness.fixture.whenStable();
  harness.detectChanges();
  return { harness, request, text: () => harness.routeNativeElement!.textContent! };
}
describe('Onboarding and compliance queues', () => {
  it('uses server readiness, filtered counts and the exact next staff section', async () => {
    const { harness, request, text } = await render(queue());
    expect(request.mock.calls[0][0]).toContain('/companies/north/hr/onboarding?lane=in-progress');
    expect(text()).toContain('Actual Starter');
    expect(text()).toContain('2 / 20 tasks');
    expect(
      harness.routeNativeElement!.querySelector(
        'a[href="/manage/people/staff/record-1/compliance"]',
      ),
    ).not.toBeNull();
    expect(text()).not.toContain('Complete Onboarding');
  });
  it('offers activation only for a ready starter', async () => {
    const { text } = await render(queue('starter', true), '/manage/people/onboarding?lane=ready');
    expect(text()).toContain('20 / 20 tasks');
    expect(text()).toContain('Complete Onboarding');
  });
  it('resumes an application draft using its source instead of a browser staff ID', async () => {
    const { harness, request, text } = await render(
      queue('draft'),
      '/manage/people/onboarding?lane=drafts',
    );
    expect(request.mock.calls[0][0]).toContain('lane=drafts');
    expect(text()).toContain('Actual Starter');
    const link = harness.routeNativeElement!.querySelector(
      'a[href="/manage/people/staff/new?source=application-1"]',
    );
    expect(link).not.toBeNull();
    expect(text()).not.toContain('Complete Onboarding');
  });
  it('does not invent ready employees when the queue belongs to another company', async () => {
    const response = queue();
    response.meta.company_id = 'south';
    const { text } = await render(response);
    expect(text()).toContain('does not match this company');
    expect(text()).not.toContain('Actual Starter');
  });
  it('does not count verification without evidence or future learning as completed', () => {
    const person = employee('Evidence');
    person.hr!.checks[0].status = 'Verified';
    expect(onboardingRow(person).ready).toBe(false);
    expect(complianceRows([person])[0].state).toBe('Needs evidence');
    person.hr!.checks[0].status = 'Not required';
    person.hr!.training[0].completed = '2999-01-01';
    expect(onboardingRow(person).ready).toBe(false);
  });
  it('excludes departed staff and induction tasks from the compliance check model', () => {
    const current = employee('Current', 'Active');
    current.hr!.checks[0].status = 'Pending';
    const departed = employee('Departed', 'Left');
    departed.hr!.checks[0].status = 'Pending';
    const rows = complianceRows([current, departed]);
    expect(rows).toHaveLength(1);
    expect(rows[0].person.id).toBe('Current');
    expect(rows[0].check.title).toBe(current.hr!.checks[0].title);
  });
});
