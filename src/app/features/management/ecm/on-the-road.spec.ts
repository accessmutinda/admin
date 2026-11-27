import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import * as L from 'leaflet';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { LOCATION_MAP_TILES } from '../locations/location-map';
import { OnTheRoad } from './on-the-road';

describe('On the Road', () => {
  const at = '2026-11-27T08:00:00Z';
  const position = { latitude: 51.5, longitude: 0, at, source: 'reported' };
  const journey = {
    workerId: 'worker',
    workerName: 'Travelling carer',
    journeyKey: 'journey-key',
    version: 2,
    travelMode: 'walking',
    travellingReportedAt: at,
    origin: position,
    positionStale: false,
    locationState: 'available',
    originExpiresAt: '2026-11-27T08:15:00Z',
    previousVisit: null,
    startPassed: false,
    nextVisit: {
      id: 'visit',
      serviceUser: 'Next service user',
      callName: 'Personal care',
      startsAt: '2026-11-27T08:15:00Z',
      completedAt: null,
      position: { ...position, latitude: 51.52, source: 'recorded' },
    },
  };
  let data: {
    company_id: string;
    timezone: string;
    asOf: string;
    routingAvailable: boolean;
    journeys: (typeof journey)[];
  };
  let request: ReturnType<typeof vi.fn>;
  const originalSvg = L.Browser.svg;

  beforeEach(() => {
    Reflect.set(L.Browser, 'svg', true);
    data = {
      company_id: 'north',
      timezone: 'Europe/London',
      asOf: at,
      routingAvailable: true,
      journeys: [journey],
    };
    request = vi.fn(async (path: string) =>
      path.includes('/estimate?')
        ? {
            company_id: 'north',
            journeyKey: 'journey-key',
            state: 'estimated',
            calculatedAt: at,
            arrivalAt: '2026-11-27T08:21:00Z',
            distanceMeters: 2100,
            durationSeconds: 1260,
            lateMinutes: 6,
            shape: [
              [51.5, 0],
              [51.52, 0],
            ],
          }
        : data,
    );
    TestBed.configureTestingModule({
      imports: [OnTheRoad],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { api: request } },
        { provide: LOCATION_MAP_TILES, useValue: { url: 'data:,', attribution: '', maxZoom: 19 } },
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

  afterEach(() => {
    Reflect.set(L.Browser, 'svg', originalSvg);
  });

  async function open() {
    const fixture = TestBed.createComponent(OnTheRoad);
    for (let pass = 0; pass < 3; pass++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    fixture.detectChanges();
    return fixture;
  }

  it('shows the scheduled visit, ETA, distance, delay and estimated map route', async () => {
    const fixture = await open();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('tbody')?.textContent).toContain('Next service user');
    expect(element.querySelector('tbody')?.textContent).toContain('08:21');
    expect(element.querySelector('tbody')?.textContent).toContain('2.1 km');
    expect(element.querySelector('.road-delay')?.textContent).toContain('Potential delay · 6 min');
    expect(element.querySelector('.road-map .leaflet-overlay-pane svg path')).not.toBeNull();
    expect(element.querySelector('.road-map .loc-map-care-worker')).not.toBeNull();
    expect(element.querySelector('.road-origin-alert')).toBeNull();
  });

  it('withholds the route and worker pin once the origin expires', async () => {
    data.journeys = [{ ...journey, originExpiresAt: at }];
    const fixture = await open();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.road-origin-alert')?.textContent).toContain('outdated');
    expect(element.querySelector('.road-map .loc-map-care-worker')).toBeNull();
    expect(request.mock.calls.some(([path]) => path.includes('/estimate?'))).toBe(false);
  });

  it.each([
    ['no-route', 'No public transport route'],
    ['unavailable', 'Routing provider temporarily unavailable'],
  ])('retains the next visit when the transit estimate is %s', async (state, message) => {
    data.journeys = [{ ...journey, travelMode: 'transit' }];
    request.mockImplementation(async (path: string) =>
      path.includes('/estimate?')
        ? { company_id: 'north', journeyKey: 'journey-key', state }
        : data,
    );
    const fixture = await open();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('tbody')?.textContent).toContain('Next service user');
    expect(element.querySelector('tbody')?.textContent).toContain('08:15');
    expect(element.querySelector('.road-unavailable')?.textContent).toContain(message);
    expect(element.querySelector('.road-delay')?.textContent).toContain('Delay unconfirmed');
    expect(element.querySelector('.road-map .leaflet-overlay-pane svg path')).toBeNull();
  });

  it('keeps journey details available without a routing provider and saves the chosen mode', async () => {
    data.routingAvailable = false;
    const fixture = await open();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('tbody')?.textContent).toContain('Next service user');
    expect(element.querySelector('.road-unavailable')?.textContent).toContain('not configured');
    expect(request.mock.calls.some(([path]) => path.includes('/estimate?'))).toBe(false);
    await (fixture.componentInstance as any).changeMode(journey, 'transit');
    expect(request).toHaveBeenCalledWith(
      '/companies/north/ecm/geomap/care-workers/worker',
      { version: 2, travelMode: 'transit' },
      'PATCH',
    );
  });
});
