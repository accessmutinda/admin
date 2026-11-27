import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { OnDuty } from './on-duty';

describe('On Duty', () => {
  const at = '2026-11-27T08:00:00Z';
  const shift = {
    id: 'shift',
    workerId: 'worker',
    workerName: 'Scheduled carer',
    etag: '"v1"',
    startsAt: '2026-11-27T07:00:00Z',
    endsAt: '2026-11-27T08:20:00Z',
    breaks: [],
  };
  const checkedIn = {
    id: 'worker',
    name: shift.workerName,
    shift,
    dutyStatus: 'on-duty',
    checkIn: { visitId: 'visit', serviceUser: 'Service user A', at },
    travelling: false,
    nextVisit: null,
    activeBreak: null,
    endingSoon: true,
    allocationStatus: 'unavailable',
    allocationReason: 'Checked in with a service user',
  };
  const travelling = {
    ...checkedIn,
    id: 'other',
    name: 'Travelling carer',
    shift: null,
    dutyStatus: 'no-active-shift',
    checkIn: null,
    travelling: true,
    nextVisit: 'Service user B',
    endingSoon: false,
    allocationReason: 'Travelling',
  };
  let request: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const snapshot = {
      company_id: 'north',
      timezone: 'Europe/London',
      asOf: at,
      scheduleDate: '2026-11-27',
      canManage: true,
      workers: [checkedIn, travelling],
      schedule: [shift],
      scheduleWorkers: [{ id: shift.workerId, name: shift.workerName }],
    };
    request = vi.fn(async () => snapshot);
    TestBed.configureTestingModule({
      imports: [OnDuty],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { api: request } },
        {
          provide: ServiceUsersApi,
          useValue: {
            allowed: signal(true),
            companyId: signal('north'),
            scope: signal('north:actor'),
            access: { can: () => true },
          },
        },
      ],
    });
  });

  async function open() {
    const fixture = TestBed.createComponent(OnDuty);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows shift and visit status in separate columns and filters activity', async () => {
    const fixture = await open();
    const element = fixture.nativeElement as HTMLElement;
    const [scheduled, onRoad] = Array.from(element.querySelectorAll('tbody tr'));
    expect(scheduled.children[1].textContent).toContain('On duty');
    expect(scheduled.children[1].textContent).toContain('Ending soon');
    expect(scheduled.children[2].textContent).toContain('Checked in');
    expect(scheduled.children[2].textContent).toContain('Service user A');
    expect(onRoad.children[1].textContent).toContain('No active scheduled shift');
    expect(onRoad.children[3].textContent).toContain('Service user B');
    const checkedInFilter = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.duty-filter'),
    ).find((button) => button.textContent?.includes('Checked in'))!;
    checkedInFilter.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('edits authorised breaks with the shift version and keeps the schedule date scoped', async () => {
    const fixture = await open();
    const component = fixture.componentInstance as any;
    await component.changeDate('2026-11-28');
    expect(request).toHaveBeenCalledWith('/companies/north/ecm/on-duty?date=2026-11-28');
    component.edit(shift);
    component.addBreak();
    component.form.breaks[0] = { startsAt: '2026-11-27T07:15', endsAt: '2026-11-27T07:30' };
    await component.save();
    expect(request).toHaveBeenCalledWith(
      '/companies/north/ecm/on-duty/shifts/shift',
      expect.objectContaining({ workerId: 'worker', breaks: [component.form.breaks[0]] }),
      'PATCH',
      { 'If-Match': '"v1"' },
    );
  });
});
