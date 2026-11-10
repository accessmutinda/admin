import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { AvailabilityLeaveApi } from './availability-leave-api.service';
import { HrTeam } from './hr-team';
import { HrService } from './hr.service';
import { LeaveRequestDialog } from './leave-request-dialog';
import { StaffAvailability } from './staff-availability';
import { OnboardingStaffApi } from './onboarding-staff-api.service';
import { newStaff, weeklySlots } from './hr.models';
import type { WorkforceLeave } from './availability-leave.generated';

function leave(status = 'Pending'): WorkforceLeave {
  return {
    id: 'leave-1',
    version: 2,
    etag: '"v2"',
    personId: 'staff-1',
    person: 'Alex Worker',
    type: 'Other',
    type_id: 'kind-1',
    start: '2026-11-20',
    end: '2026-11-21',
    status,
    reason: '',
    days: '2',
    can_approve: false,
    can_cancel: true,
    balance: null,
    balance_unavailable: 'No entitlement allocation',
  };
}
function page() {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [leave()],
    meta: { company_id: 'north' },
  };
}
describe('Connected availability and leave', () => {
  let company: ReturnType<typeof signal<string>>, request: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    company = signal('north');
    request = vi.fn().mockResolvedValue(page());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'manage/leave', component: HrTeam, data: { section: 'leave' } }]),
        { provide: AuthService, useValue: { profile: () => ({ id: 'actor-1' }), api: request } },
        {
          provide: CompanyAccessService,
          useValue: { companyId: company, context: () => ({ revision: 1 }), can: () => true },
        },
        {
          provide: HrService,
          useValue: {
            store: { company: () => ({ name: 'North' }) },
            staff: () => {
              throw Error('Browser staff must not be read');
            },
          },
        },
      ],
    });
  });
  it('loads real team leave and replaces the long inline prompt with a top Request Leave button', async () => {
    const harness = await RouterTestingHarness.create('/manage/leave');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(request.mock.calls[0][0]).toContain('/companies/north/leave-requests?');
    expect(harness.routeNativeElement!.textContent).toContain('Alex Worker');
    expect(harness.routeNativeElement!.textContent).not.toContain(
      'Request leave for a team member',
    );
    const button = harness.routeNativeElement!.querySelector('.hr-heading button')!;
    expect(button.textContent).toContain('Request Leave');
    expect(
      harness.routeNativeElement!.querySelector(
        'a[href="/manage/people/staff/staff-1/availability"]',
      ),
    ).not.toBeNull();
  });
  it('opens an accessible popup and sends real draft and submit commands', async () => {
    request.mockImplementation((path: string) => {
      if (path.includes('/hr/leave-options'))
        return Promise.resolve({
          next: null,
          results: [{ id: 'staff-1', name: 'Alex Worker', branch: 'North', reference: 'STAFF-1' }],
          meta: {
            company_id: 'north',
            leave_types: [{ id: 'kind-1', name: 'Other', requires_entitlement: false }],
            local_date: '2026-11-10',
          },
        });
      if (path.endsWith('/submit')) return Promise.resolve(leave());
      if (path.endsWith('/leave-requests'))
        return Promise.resolve({ ...leave('Draft'), version: 1, etag: '"v1"' });
      return Promise.resolve(page());
    });
    const harness = await RouterTestingHarness.create('/manage/leave');
    await harness.fixture.whenStable();
    harness.detectChanges();
    (harness.routeNativeElement!.querySelector('.hr-heading button') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const dialog = TestBed.inject(MatDialog).openDialogs[0];
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    const form = dialog.componentInstance as unknown as {
      staffId: string;
      typeId: string;
      start: string;
      end: string;
      reason: string;
      submit(): Promise<void>;
    };
    Object.assign(form, {
      staffId: 'staff-1',
      typeId: 'kind-1',
      start: '2026-11-20',
      end: '2026-11-21',
      reason: 'Family arrangements',
    });
    await form.submit();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const creation = request.mock.calls.find(
      (call) => call[0] === '/companies/north/leave-requests',
    )!;
    expect(creation[1]).toMatchObject({
      staff_id: 'staff-1',
      type_id: 'kind-1',
      start: '2026-11-20',
      end: '2026-11-21',
      reason: 'Family arrangements',
    });
    expect(creation[3]['Idempotency-Key']).toBeTruthy();
    const submit = request.mock.calls.find((call) => call[0].endsWith('/leave-1/submit'))!;
    expect(submit[3]['If-Match']).toBe('"v1"');
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement!.textContent).toContain('Leave request submitted.');
    });
  });
  it('clears records after API failure and workspace changes without sample fallback', async () => {
    const api = TestBed.inject(AvailabilityLeaveApi);
    TestBed.tick();
    await api.load();
    expect(api.rows()).toHaveLength(1);
    request.mockRejectedValue(Error('Unavailable'));
    await api.load();
    expect(api.rows()).toEqual([]);
    expect(api.error()).toContain('Unavailable');
    company.set('south');
    TestBed.tick();
    expect(api.rows()).toEqual([]);
  });
  it('keeps a failed submission retry on the same source and idempotency identity', async () => {
    const api = TestBed.inject(AvailabilityLeaveApi);
    TestBed.tick();
    let failed = true;
    request.mockImplementation((path: string) => {
      if (path.endsWith('/submit') && failed) return Promise.reject(Error('Network interrupted'));
      return Promise.resolve(
        path.endsWith('/submit') ? leave() : { ...leave('Draft'), etag: '"v1"' },
      );
    });
    const body = {
      staff_id: 'staff-1',
      type_id: 'kind-1',
      start: '2026-11-20',
      end: '2026-11-21',
      reason: '',
    };
    await expect(api.request(body, 'request-intent')).rejects.toThrow('interrupted');
    failed = false;
    await api.request(body, 'request-intent');
    const calls = request.mock.calls.filter((call) => call[0].endsWith('/submit'));
    expect(calls[0][3]['Idempotency-Key']).toBe(calls[1][3]['Idempotency-Key']);
  });
  it('saves the existing weekly editor through its own authority and omits restricted identity inputs', async () => {
    TestBed.overrideProvider(CompanyAccessService, {
      useValue: {
        companyId: company,
        context: () => ({ revision: 1 }),
        can: (_m: string, s: string, a: string) => !(s === 'records' && a === 'edit'),
      },
    });
    const person = newStaff();
    person.id = 'staff-1';
    person.hr!.weeklySlots = weeklySlots(person);
    person.hr!.availabilityMode = 'Weekly slots';
    const source = {
      company_id: 'north',
      version: 1,
      etag: '"v1"',
      person,
      readiness: {
        ready: false,
        missing: [],
        completed: 0,
        total: 0,
        next_task: null,
        next_section: 'availability',
        tasks: [],
      },
      local_date: '2026-11-10',
      courses: [],
      capabilities: { edit: true, approve: false, personal: false },
    };
    const api = TestBed.inject(OnboardingStaffApi);
    api.area.set('leave');
    TestBed.tick();
    request.mockResolvedValue(source);
    await api.load('staff-1');
    await api.save(api.person()!, 'availability', '"v1"');
    const [path, body, , headers] = request.mock.calls.at(-1)!;
    expect(path).toBe('/companies/north/staff/staff-1/workforce-availability/pattern');
    expect(body.weeklySlots).toHaveLength(6);
    expect(body).not.toHaveProperty('driver');
    expect(body).not.toHaveProperty('vehicle');
    expect(headers['If-Match']).toBe('"v1"');
  });
  it('renders the saved calendar from the backend instead of browser leave rows', async () => {
    request.mockResolvedValue({
      company_id: 'north',
      staff_id: 'staff-1',
      month: '2026-11',
      timezone: 'Europe/London',
      as_of: '2026-11-10T12:00:00Z',
      days: [{ date: '2026-11-20', state: 'On leave' }],
    });
    const fixture = TestBed.createComponent(StaffAvailability);
    fixture.componentRef.setInput('p', newStaff());
    fixture.componentRef.setInput('staffId', 'staff-1');
    fixture.componentRef.setInput('localDate', '2026-11-10');
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('td[aria-label="2026-11-20: On leave"]'),
      ).not.toBeNull();
    });
    expect(request.mock.calls.at(-1)![0]).toContain(
      '/workforce-availability/calendar?month=2026-11',
    );
  });
});
