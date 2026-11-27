import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { LOCATION_MAP_TILES } from '../locations/location-map';
import { LiveGeoMap } from './live-geomap';

describe('Live GeoMap', () => {
  const at = '2026-11-27T08:00:00Z';
  const savedPosition = { latitude: 51.5, longitude: 0, source: 'recorded', at };
  const client = {
    id: 'client',
    name: 'Service user A',
    kind: 'service-user',
    version: 1,
    position: savedPosition,
    savedPosition,
    status: null,
    statusAt: null,
    reportedStatus: '',
  };
  const worker = {
    id: 'worker',
    name: 'Care worker A',
    kind: 'care-worker',
    version: 1,
    position: { ...savedPosition, source: 'visit' },
    savedPosition: null,
    status: 'checked-in',
    statusAt: at,
    reportedStatus: 'travelling',
    positionExpiresAt: '2026-11-27T08:15:00Z',
    workingWindowEndsAt: '2026-11-27T16:00:00Z',
    locationState: 'available',
    canReportPosition: true,
  };
  const waiting = {
    ...worker,
    id: 'waiting',
    name: 'Care worker B',
    position: null,
    status: 'on-break',
    reportedStatus: 'on-break',
    positionExpiresAt: null,
    locationState: 'unavailable',
    canReportPosition: false,
  };
  let request: ReturnType<typeof vi.fn>;
  let permitted = signal(true);

  beforeEach(() => {
    permitted = signal(true);
    request = vi.fn(async () => ({
      company_id: 'north',
      asOf: at,
      subjects: [client, worker, waiting],
    }));
    TestBed.configureTestingModule({
      imports: [LiveGeoMap],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { api: request } },
        { provide: LOCATION_MAP_TILES, useValue: { url: 'data:,', attribution: '', maxZoom: 19 } },
        {
          provide: ServiceUsersApi,
          useValue: {
            allowed: permitted,
            companyId: signal('north'),
            scope: signal('north:actor'),
            access: { can: () => permitted() },
          },
        },
      ],
    });
  });

  async function open() {
    const fixture = TestBed.createComponent(LiveGeoMap);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('keeps co-located service user and worker pins distinct and labels the status', async () => {
    const fixture = await open();
    const element = fixture.nativeElement as HTMLElement;
    const serviceUser = element.querySelector('.loc-map-service-user') as HTMLElement;
    const carer = element.querySelector('.loc-map-care-worker') as HTMLElement;
    expect(serviceUser.getAttribute('aria-label')).toContain('Service user A');
    expect(carer.getAttribute('aria-label')).toContain('Checked in');
    expect(carer.querySelector('.loc-map-marker-badge')?.textContent).toBe('check');
    expect(carer.style.marginTop).not.toBe(serviceUser.style.marginTop);
    expect(element.textContent).toContain('On break · Coordinates unavailable');
    carer.click();
    fixture.detectChanges();
    expect(element.querySelector('.geo-details')?.textContent).toContain('Saved visit location');
  });

  it('opens the correct schedules and reviews suitable carers from a service-user pin', async () => {
    const visit = {
      id: 'visit',
      date: '2026-11-27',
      callName: 'Personal care',
      clientName: client.name,
      startsAt: at,
      endsAt: '2026-11-27T08:30:00Z',
      status: 'Scheduled',
      carers: 2,
      arrived: 0,
      workers: [],
      canAllocate: true,
    };
    const fixture = await open();
    const element = fixture.nativeElement as HTMLElement;
    request.mockResolvedValueOnce({
      company_id: 'north',
      id: worker.id,
      kind: 'care-workers',
      timezone: 'Europe/London',
      status: 'Checked in',
      shift: { startsAt: at, endsAt: '2026-11-27T16:00:00Z' },
      visits: [visit],
      workforce: {
        hrAvailable: true,
        availabilityIssues: [],
        approvedLeave: { start: '2026-11-28', end: '2026-11-30' },
        trainingCount: 1,
        certificates: [
          { id: 'cert', title: 'Moving and handling', state: 'Current', expires: null },
        ],
      },
    });
    element.querySelector<HTMLElement>('.loc-map-care-worker')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('.geo-operational')?.textContent).toContain('Scheduled shift');
    expect(element.querySelector('.geo-operational')?.textContent).toContain('Checked in');
    expect(element.querySelector('.geo-operational')?.textContent).toContain('Personal care');

    const links = () =>
      [...element.querySelectorAll('.geo-operational a')].map((link) => link.getAttribute('href'));
    expect(links()).toContain('/manage/people/staff/worker/overview');
    expect(links()).toContain('/manage/people/staff/worker/availability');
    expect(links()).toContain('/manage/leave?worker=worker');
    expect(links()).toContain('/manage/learning/certificates/cert');

    request.mockResolvedValueOnce({
      company_id: 'north',
      id: client.id,
      kind: 'service-users',
      timezone: 'Europe/London',
      status: null,
      shift: null,
      visits: [visit],
      care: {
        activePackages: 2,
        carePlanAvailable: true,
        approvedPlan: { version: 1, reviewDate: null },
      },
    });
    element.querySelector<HTMLElement>('.loc-map-service-user')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(links()).toContain('/manage/rota/call-packages?client=client');
    expect(links()).toContain('/manage/care-plans/client');
    expect(links()).toContain('/manage/rota/planner?visit=visit&from=2026-11-27');
    const options = [
      ...element.querySelectorAll<HTMLButtonElement>('.geo-operational button'),
    ].find((button) => button.textContent?.includes('Show suitable carers'));
    request.mockResolvedValueOnce({
      company_id: 'north',
      visitId: 'visit',
      total: 1,
      candidates: [{ id: 'available', name: 'Available carer', preferred: false }],
    });
    options!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(request).toHaveBeenCalledWith(
      '/companies/north/ecm/operations/service-users/client/visits/visit/options',
    );
    expect(element.querySelector('.geo-operational')?.textContent).toContain('Available carer');
  });

  it('filters workers without removing service-user context and clears the map when denied', async () => {
    const fixture = await open();
    const component = fixture.componentInstance as any;
    const element = fixture.nativeElement as HTMLElement;
    component.statusFilter.set('on-break');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.querySelector('.loc-map-service-user')).not.toBeNull();
    expect(element.querySelector('.loc-map-care-worker')).toBeNull();
    permitted.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.textContent).not.toContain('Service user A');
    expect(element.querySelector('cv-location-map')).toBeNull();
  });

  it('distinguishes exact postcode districts while keeping care-worker markers visible', async () => {
    request.mockResolvedValueOnce({
      company_id: 'north',
      asOf: at,
      subjects: [
        { ...client, postcode: 'UB3 1AB' },
        { ...client, id: 'other', name: 'Service user B', postcode: 'ub108ab' },
        worker,
      ],
    });
    const fixture = await open();
    (fixture.componentInstance as any).postcodeFilter.set('UB10');
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.loc-map-service-user')).toHaveLength(1);
    expect(element.querySelector('.loc-map-service-user')?.getAttribute('aria-label')).toContain(
      'Service user B',
    );
    expect(element.querySelector('.loc-map-care-worker')).not.toBeNull();
  });

  it('records a status update without resaving position data', async () => {
    const fixture = await open();
    const component = fixture.componentInstance as any;
    component.select('care-worker:waiting');
    component.edit(waiting);
    component.form.status = 'available';
    await component.save();
    expect(request).toHaveBeenCalledWith(
      '/companies/north/ecm/geomap/care-workers/waiting',
      { version: 1, status: 'available' },
      'PATCH',
    );
  });
});
