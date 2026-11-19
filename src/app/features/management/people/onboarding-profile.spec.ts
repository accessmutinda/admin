import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { StaffProfile } from './staff-profile';
import { HrService } from './hr.service';
import { PayrollService } from '../payroll/payroll.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { AcademyService } from '../learning/academy/academy.service';
import { newStaff } from './hr.models';
import type { StaffOnboarding } from './onboarding.generated';

function profile(): StaffOnboarding {
  const person = newStaff();
  Object.assign(person, {
    id: 'staff-1',
    name: 'Alex Starter',
    email: 'alex@example.org',
    stage: 'Hired',
    role: 'Care Worker',
    location: 'North',
    start: '2026-11-10',
  });
  Object.assign(person.hr!.personal, { firstName: 'Alex', surname: 'Starter' });
  return {
    company_id: 'north',
    version: 1,
    etag: '"v1"',
    person,
    readiness: {
      ready: false,
      missing: ['DBS check'],
      completed: 2,
      total: 3,
      next_task: 'DBS check',
      next_section: 'compliance',
      tasks: [],
    },
    courses: [],
    local_date: '2026-11-10',
    capabilities: { edit: true, approve: true, personal: true },
  };
}
function setupProfile(response = profile()) {
  const company = signal('north'),
    request = vi.fn(),
    localSave = vi.fn();
  request.mockResolvedValue(response);
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        ['personal', 'employment', 'training'].map((section) => ({
          path: `manage/people/staff/:id/${section}`,
          component: StaffProfile,
          data: { staffSection: section },
        })),
      ),
      {
        provide: AuthService,
        useValue: {
          profile: () => ({ id: 'user-1' }),
          currentUser: () => ({ name: 'Reviewer' }),
          api: request,
        },
      },
      {
        provide: CompanyAccessService,
        useValue: {
          companyId: company,
          context: () => ({ revision: 1 }),
          can: () => true,
          canPath: () => true,
        },
      },
      { provide: PayrollService, useValue: { can: () => false } },
      {
        provide: AcademyService,
        useValue: { store: { companyId: company }, assignmentApi: { available: () => false } },
      },
      {
        provide: HrService,
        useValue: {
          can: () => true,
          canPay: () => false,
          store: { companyId: company, company: () => ({ name: 'North' }) },
          savePerson: localSave,
        },
      },
    ],
  });
  return { request, localSave };
}

describe('Existing onboarding profile editor', () => {
  it('loads staff from the backend and saves the existing personal form without a browser workspace save', async () => {
    const { request, localSave } = setupProfile();
    const harness = await RouterTestingHarness.create(
      '/manage/people/staff/staff-1/personal?edit=true',
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Alex Starter');
    const firstName = [...harness.routeNativeElement!.querySelectorAll('label')]
      .find((label) => label.textContent?.includes('First name'))!
      .querySelector('input')!;
    firstName.value = 'Updated';
    firstName.dispatchEvent(new Event('input', { bubbles: true }));
    harness.detectChanges();
    const button = [...harness.routeNativeElement!.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Save Changes',
    )!;
    button.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const save = request.mock.calls.find((call) => call[0].endsWith('/personal'))!;
    expect(save[2]).toBe('PATCH');
    expect(save[3]).toEqual({ 'If-Match': '"v1"' });
    expect(save[1].firstName).toBe('Updated');
    expect(save[1]).not.toHaveProperty('reviewer');
    expect(localSave).not.toHaveBeenCalled();
    expect(harness.routeNativeElement!.textContent).toContain('Staff details saved securely.');
  });

  it('renders the saved recruitment history when opening Employment & Recruitment', async () => {
    const saved = profile();
    const notes = 'Passed after a practical assessment.';
    Object.assign((saved.person as ReturnType<typeof newStaff>).hr!.employment, {
      recruitment: {
        applicationDate: '2026-11-01',
        interviewDate: '2026-11-04',
        offerDate: '2026-11-06',
        interviewNotes: notes,
      },
    });
    const { request } = setupProfile(saved);
    const harness = await RouterTestingHarness.create('/manage/people/staff/staff-1/employment');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(request).toHaveBeenCalledWith(
      '/companies/north/staff/staff-1/workforce-compliance/profile',
    );
    const root = harness.routeNativeElement!;
    const milestones = [...root.querySelectorAll('dt')]
      .filter((label) =>
        ['Application date', 'Interview date', 'Offer date'].includes(label.textContent!.trim()),
      )
      .map((label) => label.nextElementSibling?.textContent?.trim());
    expect(milestones).toEqual(['2026-11-01', '2026-11-04', '2026-11-06']);
    expect(root.textContent).toContain(notes);
  });

  it.each([
    { complete: false, status: 'In progress', taskStatus: 'Outstanding' },
    { complete: true, status: 'Completed', taskStatus: 'Completed' },
  ])('shows $status in Employment when the saved induction tasks agree', async (state) => {
    const saved = profile();
    (saved.person as ReturnType<typeof newStaff>).hr!.induction = [
      { id: 'offer', title: 'Offer accepted', complete: true, completedByOffer: true },
      { id: 'scheduled', title: 'Induction scheduled', complete: state.complete },
      { id: 'welcome', title: 'Manager welcome', complete: state.complete },
      { id: 'first-day', title: 'First-day checklist', complete: state.complete },
    ];
    const { request } = setupProfile(saved);
    const harness = await RouterTestingHarness.create('/manage/people/staff/staff-1/employment');
    await harness.fixture.whenStable();
    harness.detectChanges();
    const label = [...harness.routeNativeElement!.querySelectorAll('dt')].find(
      (term) => term.textContent?.trim() === 'Induction status',
    );
    expect(label?.nextElementSibling?.textContent?.trim()).toBe(state.status);

    await harness.navigateByUrl('/manage/people/staff/staff-1/training');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(request).toHaveBeenCalledWith(
      '/companies/north/staff/staff-1/workforce-compliance/profile',
    );
    expect(request).toHaveBeenCalledWith('/companies/north/staff/staff-1/profile');
    const rows = [...harness.routeNativeElement!.querySelectorAll('.hr-row')];
    const badge = (title: string) =>
      rows
        .find((row) => row.firstElementChild?.textContent?.trim() === title)
        ?.querySelector('.hr-badge')
        ?.textContent?.trim();
    expect(badge('Offer accepted')).toBe('Completed');
    for (const title of ['Induction scheduled', 'Manager welcome', 'First-day checklist'])
      expect(badge(title)).toBe(state.taskStatus);
  });

  it('shows an empty checklist as not recorded', async () => {
    const saved = profile();
    (saved.person as ReturnType<typeof newStaff>).hr!.induction = [];
    setupProfile(saved);
    const harness = await RouterTestingHarness.create('/manage/people/staff/staff-1/employment');
    await harness.fixture.whenStable();
    harness.detectChanges();
    const label = [...harness.routeNativeElement!.querySelectorAll('dt')].find(
      (term) => term.textContent?.trim() === 'Induction status',
    );
    expect(label?.nextElementSibling?.textContent?.trim()).toBe('Not recorded');
    expect(harness.routeNativeElement!.textContent).toContain('No induction tasks recorded.');
  });
});
