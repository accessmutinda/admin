import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { StaffProfile } from './staff-profile';
import { HrService } from './hr.service';
import { PayrollService } from '../payroll/payroll.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
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
describe('Existing onboarding profile editor', () => {
  it('loads staff from the backend and saves the existing personal form without a browser workspace save', async () => {
    const company = signal('north'),
      request = vi.fn(),
      localSave = vi.fn();
    request.mockResolvedValue(profile());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'manage/people/staff/:id/personal',
            component: StaffProfile,
            data: { staffSection: 'personal' },
          },
        ]),
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
});
