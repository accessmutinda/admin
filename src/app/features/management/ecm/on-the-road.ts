import {
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { LocationMap, MapLocation, MapPoint } from '../locations/location-map';
import { ModuleDesign } from '../shared/module-design';

import { locationClock } from './location-clock';

const travelModes = [
  { value: 'driving', label: 'Driving' },
  { value: 'walking', label: 'Walking' },
  { value: 'transit', label: 'Public transport' },
] as const;
type TravelMode = (typeof travelModes)[number]['value'] | '';
type Position = {
  latitude: number;
  longitude: number;
  at: string;
  source: 'reported' | 'recorded' | 'visit';
};
type Visit = {
  id: string;
  serviceUser: string;
  callName: string;
  startsAt: string;
  completedAt: string | null;
  position: Position | null;
};
type Journey = {
  workerId: string;
  workerName: string;
  version: number;
  travellingReportedAt: string;
  travelMode: TravelMode;
  origin: Position | null;
  originExpiresAt: string | null;
  locationState: 'available' | 'unavailable' | 'outdated' | 'outside-working-hours';
  positionStale: boolean;
  previousVisit: Visit | null;
  nextVisit: Visit | null;
  startPassed: boolean;
  journeyKey: string;
};
type RoadSnapshot = {
  company_id: string;
  asOf: string;
  timezone: string;
  routingAvailable: boolean;
  journeys: Journey[];
};
type Estimate = { company_id: string; journeyKey: string } & (
  | { state: 'unavailable' | 'no-route' }
  | {
      state: 'estimated';
      calculatedAt: string;
      arrivalAt: string;
      lateMinutes: number;
      durationSeconds: number;
      distanceMeters: number;
      shape: MapPoint[];
    }
);

@Component({
  selector: 'cv-on-the-road',
  imports: [FormsModule, RouterLink, LocationMap, ModuleDesign],
  host: { class: 'module-page operations-page geo-page road-page' },
  templateUrl: './on-the-road.html',
  styleUrls: ['./live-geomap.css', './on-the-road.css'],
  encapsulation: ViewEncapsulation.None,
})
export class OnTheRoad {
  private readonly auth = inject(AuthService);
  private readonly records = inject(ServiceUsersApi);
  private readonly clock = locationClock();
  protected readonly modes = travelModes;
  protected readonly allowed = computed(
    () =>
      this.records.allowed() &&
      this.records.access.can('care', 'rostering', 'read') &&
      this.records.access.can('care', 'ecm', 'read') &&
      this.records.access.can('care', 'ecm', 'edit'),
  );
  protected readonly data = signal<RoadSnapshot | null>(null);
  protected readonly search = signal('');
  protected readonly selected = signal('');
  protected readonly loading = signal(false);
  protected readonly savingId = signal('');
  protected readonly pendingMode = signal<TravelMode>('');
  protected readonly error = signal('');
  protected readonly modeError = signal('');
  private readonly estimates = signal<Record<string, { result: Estimate; fetched: number }>>({});
  protected readonly page = signal(0);
  private readonly pageSize = 8;
  private generation = 0;
  private routeGeneration = 0;

  protected readonly matching = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return (this.data()?.journeys ?? []).filter((journey) =>
      [journey.workerName, journey.previousVisit?.serviceUser, journey.nextVisit?.serviceUser].some(
        (value) => value?.toLocaleLowerCase().includes(query),
      ),
    );
  });
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil(this.matching().length / this.pageSize)),
  );
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pages() - 1));
  protected readonly rows = computed(() => {
    const start = this.currentPage() * this.pageSize;
    return this.matching().slice(start, start + this.pageSize);
  });
  protected readonly active = computed(
    () => this.rows().find((row) => row.workerId === this.selected()) ?? this.rows()[0],
  );
  protected readonly route = computed(() => {
    const row = this.active();
    const estimate = row && this.estimate(row);
    return estimate?.state === 'estimated' ? estimate.shape : [];
  });
  protected readonly pins = computed<MapLocation[]>(() => {
    const journey = this.active();
    if (!journey) return [];
    const pins: MapLocation[] = [];
    const locations = [
      { visit: journey.previousVisit, name: 'Previous visit' },
      { visit: journey.nextVisit, name: 'Next visit' },
    ];
    for (const { visit, name } of locations) {
      if (visit?.position && !pins.some((pin) => pin.id === visit.id)) {
        pins.push({
          id: visit.id,
          name: visit.serviceUser,
          kind: 'service-user',
          latitude: visit.position.latitude,
          longitude: visit.position.longitude,
          label: name + ' · ' + visit.serviceUser,
        });
      }
    }
    const origin = this.visibleOrigin(journey);
    if (origin) {
      const { latitude, longitude } = origin;
      const shared = pins.some((pin) => pin.latitude === latitude && pin.longitude === longitude);
      pins.push({
        id: journey.workerId,
        name: journey.workerName,
        kind: 'care-worker',
        latitude,
        longitude,
        label: journey.workerName + ' · Journey origin',
        badge: 'directions',
        offset: shared ? [0, -38] : undefined,
      });
    }
    return pins;
  });
  private readonly formatter = computed(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: this.data()?.timezone ?? 'Europe/London',
      }),
  );

  constructor() {
    effect(() => {
      const scope = this.records.scope();
      const allowed = this.allowed();
      untracked(() => {
        this.generation++;
        this.routeGeneration++;
        this.data.set(null);
        this.estimates.set({});
        this.selected.set('');
        this.page.set(0);
        this.loading.set(false);
        this.savingId.set('');
        this.error.set('');
        this.modeError.set('');
        if (allowed && scope) void this.refresh();
      });
    });
    effect(() => {
      const rows = this.rows();
      const data = this.data();
      untracked(() => {
        const generation = ++this.routeGeneration;
        if (data?.routingAvailable) void this.loadEstimates(rows, data, generation);
      });
    });
    const timer = setInterval(() => {
      if (!document.hidden) void this.refresh();
    }, 30000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.generation++;
      this.routeGeneration++;
    });
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.page.set(0);
  }
  protected time(value: string): string {
    return this.formatter().format(new Date(value));
  }
  protected visibleOrigin(journey: Journey): Position | null {
    return this.clock.fresh() && this.clock.before(journey.originExpiresAt) ? journey.origin : null;
  }
  protected locationMessage(journey: Journey): string {
    if (journey.locationState === 'outside-working-hours')
      return 'Location tracking is outside authorised working time';
    if (!this.clock.fresh()) return 'Location updates unavailable';
    if (journey.positionStale || (journey.origin && !this.visibleOrigin(journey)))
      return 'Journey origin outdated or working window ended';
    return 'Journey origin unavailable';
  }
  protected estimate(journey: Journey): Estimate | undefined {
    return this.data()?.routingAvailable && this.visibleOrigin(journey)
      ? this.estimates()[journey.journeyKey]?.result
      : undefined;
  }
  protected estimateMessage(journey: Journey): string {
    if (!journey.nextVisit) return 'No upcoming published visit';
    if (!journey.travelMode) return 'Choose a travel mode';
    if (!this.visibleOrigin(journey)) return this.locationMessage(journey);
    if (!journey.nextVisit.position) return 'Next visit coordinates unavailable';
    if (!this.data()?.routingAvailable) return 'Routing service is not configured';
    const estimate = this.estimate(journey);
    if (estimate?.state === 'no-route') return 'No route available for this travel mode';
    if (estimate?.state === 'unavailable') return 'Route estimate unavailable';
    return 'Calculating route…';
  }
  protected delay(journey: Journey): string {
    const estimate = this.estimate(journey);
    if (estimate?.state === 'estimated' && estimate.lateMinutes)
      return 'Potential delay · ' + estimate.lateMinutes + ' min';
    if (journey.startPassed) return 'Scheduled start passed';
    return estimate?.state === 'estimated' ? 'ETA within schedule' : 'Delay unconfirmed';
  }
  protected async refresh(): Promise<void> {
    const company = this.records.companyId();
    if (!company || !this.allowed() || this.loading() || this.savingId()) return;
    const scope = this.records.scope();
    const generation = this.generation;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.auth.api<RoadSnapshot>(`/companies/${company}/ecm/on-the-road`);
      if (!this.current(scope, generation)) return;
      if (result.company_id !== company) {
        this.data.set(null);
        throw Error('The response belongs to a different workspace.');
      }
      const activeKeys = new Set(result.journeys.map((journey) => journey.journeyKey));
      this.estimates.update((routes) =>
        Object.fromEntries(Object.entries(routes).filter(([key]) => activeKeys.has(key))),
      );
      this.clock.sync(result.asOf);
      this.data.set(result);
    } catch (error) {
      if (!this.current(scope, generation)) return;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        this.data.set(null);
        this.estimates.set({});
      }
      this.error.set(error instanceof Error ? error.message : 'The journey list is unavailable.');
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  private async loadEstimates(
    rows: Journey[],
    data: RoadSnapshot,
    generation: number,
  ): Promise<void> {
    const due = rows.filter(
      (row) =>
        row.travelMode &&
        this.visibleOrigin(row) &&
        row.nextVisit?.position &&
        Date.now() - (this.estimates()[row.journeyKey]?.fetched ?? 0) >= 60000,
    );
    const scope = this.records.scope();
    await Promise.all(
      due.map(async (row) => {
        let result: Estimate;
        try {
          const url = `/companies/${data.company_id}/ecm/on-the-road/${row.workerId}/estimate`;
          result = await this.auth.api<Estimate>(
            url + '?' + new URLSearchParams({ journey: row.journeyKey }),
          );
          if (result.company_id !== data.company_id || result.journeyKey !== row.journeyKey)
            throw Error('The route does not match the current journey.');
        } catch {
          result = {
            company_id: data.company_id,
            journeyKey: row.journeyKey,
            state: 'unavailable',
          };
        }
        if (
          this.allowed() &&
          scope === this.records.scope() &&
          generation === this.routeGeneration
        ) {
          this.estimates.update((estimates) => ({
            ...estimates,
            [row.journeyKey]: { result, fetched: Date.now() },
          }));
        }
      }),
    );
  }
  protected async changeMode(journey: Journey, travelMode: TravelMode): Promise<void> {
    const company = this.records.companyId();
    if (
      !company ||
      !this.allowed() ||
      this.savingId() ||
      this.loading() ||
      travelMode === journey.travelMode
    )
      return;
    const scope = this.records.scope();
    const generation = this.generation;
    this.pendingMode.set(travelMode);
    this.savingId.set(journey.workerId);
    this.modeError.set('');
    try {
      const result = await this.auth.api<{ company_id: string }>(
        `/companies/${company}/ecm/geomap/care-workers/${journey.workerId}`,
        { version: journey.version, travelMode },
        'PATCH',
      );
      if (!this.current(scope, generation)) return;
      if (result.company_id !== company)
        throw Error('The response belongs to a different workspace.');
    } catch (error) {
      if (this.current(scope, generation))
        this.modeError.set(
          error instanceof Error ? error.message : 'Could not save the travel mode.',
        );
    } finally {
      if (generation === this.generation) this.savingId.set('');
    }
    if (this.current(scope, generation)) await this.refresh();
  }
  private current(scope: string, generation: number): boolean {
    return this.allowed() && scope === this.records.scope() && generation === this.generation;
  }
}
