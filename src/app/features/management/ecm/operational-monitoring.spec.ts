import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { OperationalMonitoring } from './operational-monitoring';

describe('Operational Monitoring', () => {
  it('filters warnings and links the coordinator to the visit and worker', async () => {
    const at = '2026-11-27T08:00:00Z';
    const visit = {
      clientId: 'client',
      clientName: 'Service user A',
      visitId: 'visit',
      date: '2026-11-27',
      startsAt: at,
      packageId: null,
    };
    const allowed = signal(true);
    const request = vi.fn(async () => ({
      company_id: 'north',
      asOf: at,
      date: visit.date,
      timezone: 'Europe/London',
      warnings: [
        {
          ...visit,
          kind: 'late',
          title: 'Running late',
          message: 'Waiting for check-in.',
          workerId: null,
        },
        {
          ...visit,
          kind: 'overlap',
          title: 'Carer has overlapping visits',
          message: 'Two allocations overlap.',
          workerId: 'carer',
        },
      ],
    }));
    TestBed.configureTestingModule({
      imports: [OperationalMonitoring],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { api: request } },
        {
          provide: ServiceUsersApi,
          useValue: {
            allowed,
            companyId: signal('north'),
            scope: signal('north:actor'),
            access: { can: () => allowed() },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(OperationalMonitoring);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(request).toHaveBeenCalledWith('/companies/north/ecm/operations');
    expect(el.querySelectorAll('.monitor-warnings > li')).toHaveLength(2);
    const overlap = [...el.querySelectorAll<HTMLButtonElement>('.monitor-category')].find(
      (button) => button.textContent?.includes('Overlapping allocations'),
    );
    overlap!.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.monitor-warnings > li')).toHaveLength(1);
    const links = [...el.querySelectorAll<HTMLAnchorElement>('.monitor-warnings a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(links).toContain('/manage/rota/planner?visit=visit&from=2026-11-27');
    expect(links).toContain('/manage/ecm/geomap?worker=carer');
    allowed.set(false);
    fixture.detectChanges();
    expect(el.querySelector('.monitor-warnings')).toBeNull();
  });
});
