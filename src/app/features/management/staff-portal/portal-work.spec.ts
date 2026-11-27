import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PortalWork } from './portal-work';
import { StaffDashboardApi } from './staff-dashboard-api.service';

describe('My visits and activity', () => {
  it('checks into its own visit and shares a position only after a staff action', async () => {
    const now = '2026-11-27T08:00:00Z';
    const work = {
      company_id: 'north',
      asOf: now,
      timezone: 'Europe/London',
      canReport: true,
      canOpenClient: false,
      canClearPosition: false,
      workingWindowEndsAt: '2026-11-27T14:00:00Z',
      locationState: 'unavailable',
      reportVersion: 3,
      status: 'available',
      travelMode: '',
      visits: [
        {
          id: 'visit',
          etag: '"v2"',
          clientId: 'client',
          clientName: 'Service user',
          callName: 'Personal care',
          carers: 2,
          startsAt: now,
          endsAt: '2026-11-27T08:30:00Z',
          checkedInAt: null as string | null,
          checkedOutAt: null,
          canClock: true,
          tasks: ['Agree the support before starting.'],
        },
      ],
    };
    const scope = signal('north:carer');
    const api = vi.fn(async (url: string, body?: unknown) => {
      if (url.endsWith('/attendance')) {
        work.visits[0].checkedInAt = now;
        return { company_id: 'north' };
      }
      return body ? { company_id: 'north' } : structuredClone(work);
    });
    const getPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 51.5, longitude: 0 } } as GeolocationPosition);
    });
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: getPosition } });
    try {
      TestBed.configureTestingModule({
        imports: [PortalWork],
        providers: [
          provideRouter([]),
          { provide: CompanyAccessService, useValue: { companyId: signal('north') } },
          { provide: StaffDashboardApi, useValue: { scope } },
          { provide: AuthService, useValue: { api } },
        ],
      });
      const fixture = TestBed.createComponent(PortalWork);
      const view = fixture.nativeElement as HTMLElement;
      const update = async () => {
        for (let pass = 0; pass < 3; pass++) {
          fixture.detectChanges();
          await fixture.whenStable();
        }
        fixture.detectChanges();
      };
      const button = (label: string) =>
        [...view.querySelectorAll<HTMLButtonElement>('button')].find((item) =>
          [...item.childNodes].some(
            (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === label,
          ),
        );

      await update();
      expect(view.textContent).toContain('Double-up');
      expect(view.textContent).toContain('Agree the support before starting.');
      expect(getPosition).not.toHaveBeenCalled();
      button('Check in')!.click();
      await update();
      expect(api).toHaveBeenCalledWith(
        '/companies/north/staff-portal/work/visits/visit/attendance',
        { kind: 'Check in', note: 'Recorded by the assigned care worker.' },
        'POST',
        { 'If-Match': '"v2"', 'Idempotency-Key': expect.any(String) },
      );
      expect(button('Check out')).toBeDefined();
      button('Share current position')!.click();
      await update();
      expect(getPosition).toHaveBeenCalledTimes(1);
      expect(api).toHaveBeenCalledWith(
        '/companies/north/staff-portal/work/report',
        { version: 3, position: { latitude: 51.5, longitude: 0 } },
        'PATCH',
        {},
      );
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(button('Refresh')?.disabled).toBe(false);
      });
      work.canReport = false;
      button('Refresh')!.click();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(button('Share current position')).toBeUndefined();
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
