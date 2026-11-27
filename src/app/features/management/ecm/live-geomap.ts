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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { LocationMap, MapLocation } from '../locations/location-map';
import { ModuleDesign } from '../shared/module-design';
import { EcmNavigation } from './ecm-navigation';
import { OperationalDetails } from './operational-details';
import { locationClock } from './location-clock';
import { postcodeDistrict, postcodeDistrictOptions } from '../rota/postcode-districts';

const workerStatuses = {
  'on-duty': { label: 'On duty', icon: 'work' },
  travelling: { label: 'Travelling', icon: 'directions_car' },
  'checked-in': { label: 'Checked in', icon: 'check' },
  available: { label: 'Available', icon: 'person_check' },
  'on-break': { label: 'On break', icon: 'pause' },
  'off-duty': { label: 'Off duty', icon: 'power_settings_new' },
  unknown: { label: 'Status unknown', icon: 'question_mark' },
} as const;

type WorkerStatus = keyof typeof workerStatuses;
type MapKind = 'service-user' | 'care-worker';
type Point = { latitude: number; longitude: number };
type Position = Point & { source: 'recorded' | 'reported' | 'visit'; at: string };
type GeoSubject = {
  id: string;
  name: string;
  postcode?: string;
  kind: MapKind;
  position: Position | null;
  locationState: 'available' | 'unavailable' | 'outdated' | 'outside-working-hours';
  canReportPosition: boolean;
  positionExpiresAt: string | null;
  workingWindowEndsAt: string | null;
  savedPosition: Position | null;
  status: WorkerStatus | null;
  statusAt: string | null;
  reportedStatus: string;
  version: number;
};
type GeoSnapshot = { company_id: string; asOf: string; subjects: GeoSubject[] };

@Component({
  selector: 'cv-live-geomap',
  imports: [FormsModule, RouterLink, LocationMap, ModuleDesign, EcmNavigation, OperationalDetails],
  host: { class: 'module-page operations-page geo-page' },
  templateUrl: './live-geomap.html',
  styleUrl: './live-geomap.css',
  encapsulation: ViewEncapsulation.None,
})
export class LiveGeoMap {
  private readonly auth = inject(AuthService);
  private readonly records = inject(ServiceUsersApi);
  private readonly link = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly clock = locationClock();
  protected readonly statuses = Object.entries(workerStatuses) as [
    WorkerStatus,
    (typeof workerStatuses)[WorkerStatus],
  ][];
  protected readonly reportable = this.statuses.filter(
    ([key]) => key !== 'checked-in' && key !== 'unknown',
  );
  protected readonly allowed = computed(
    () =>
      this.records.allowed() &&
      this.records.access.can('care', 'rostering', 'read') &&
      this.records.access.can('care', 'ecm', 'read') &&
      this.records.access.can('care', 'ecm', 'edit'),
  );
  protected readonly canEditUsers = computed(() =>
    this.records.access.can('care', 'records', 'edit'),
  );
  protected readonly snapshot = signal<GeoSnapshot | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly notice = signal('');
  protected readonly selected = signal<string | undefined>(undefined);
  protected readonly search = signal('');
  protected readonly kindFilter = signal('');
  protected readonly postcodeFilter = signal('');
  protected readonly districts = computed(() =>
    postcodeDistrictOptions(
      (this.snapshot()?.subjects ?? [])
        .filter((subject) => subject.kind === 'service-user')
        .map((subject) => subject.postcode ?? ''),
    ),
  );
  protected readonly statusFilter = signal('');
  protected readonly draft = signal<GeoSubject | null>(null);
  protected form = {
    latitude: null as number | null,
    longitude: null as number | null,
    status: '',
  };
  private generation = 0;
  private readonly timeFormat = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  });

  protected readonly visible = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return (this.snapshot()?.subjects ?? []).filter(
      (subject) =>
        (!this.kindFilter() || subject.kind === this.kindFilter()) &&
        (subject.kind !== 'service-user' ||
          !this.postcodeFilter() ||
          postcodeDistrict(subject.postcode ?? '') === this.postcodeFilter()) &&
        (subject.kind !== 'care-worker' ||
          !this.statusFilter() ||
          subject.status === this.statusFilter()) &&
        subject.name.toLocaleLowerCase().includes(query),
    );
  });
  protected readonly emptyMap = computed(() => {
    const results = this.visible();
    if (!results.length) {
      return {
        title: 'No people match these filters',
        message: 'Change the filters or search to see more results.',
      };
    }

    const states = new Set(results.map((subject) => this.locationIssue(subject)));
    const reasons = [];
    if (states.has('restricted')) {
      reasons.push('Worker locations are restricted to authorised working hours.');
    }
    if (states.has('outdated'))
      reasons.push('Outdated locations are hidden until a fresh position is available.');
    if (states.has('unavailable')) reasons.push('Some locations are unavailable.');
    if (states.has('updates-unavailable')) reasons.push('Live location updates are unavailable.');

    const canEditWorker = results.some(
      (subject) => subject.kind === 'care-worker' && this.canEditPosition(subject),
    );
    const canEditUser = results.some(
      (subject) => subject.kind === 'service-user' && this.canEditPosition(subject),
    );
    if (canEditWorker && canEditUser) {
      reasons.push('Select an editable result to add or update its coordinates.');
    } else if (canEditWorker) {
      reasons.push(
        'Select a worker whose location can be edited and choose Update worker report to add or update coordinates.',
      );
    } else if (canEditUser) {
      reasons.push(
        'Select a service user in the results and choose Edit location to add coordinates.',
      );
    }

    const title =
      states.size === 1 && states.has('restricted')
        ? 'Worker locations are restricted'
        : states.size === 1 && states.has('outdated')
          ? 'Locations are outdated'
          : 'No locations to show';
    return { title, message: reasons.join(' ') };
  });
  protected readonly active = computed(() =>
    this.visible().find((s) => this.key(s) === this.selected()),
  );
  protected readonly pins = computed<MapLocation[]>(() => {
    const locations = this.visible().map((row): MapLocation => {
      const state = row.status ? workerStatuses[row.status] : null;
      const kind = row.kind === 'service-user' ? 'Service user' : 'Care worker';
      const position = this.visiblePosition(row);
      return {
        id: this.key(row),
        name: row.name,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
        kind: row.kind,
        badge: state?.icon,
        label: [row.name, kind, state?.label].filter(Boolean).join(' · '),
      };
    });
    const samePoint = new Map<string, MapLocation[]>();
    for (const pin of locations) {
      if (pin.latitude === null || pin.longitude === null) continue;
      const point = `${pin.latitude},${pin.longitude}`;
      const group = samePoint.get(point) ?? [];
      group.push(pin);
      samePoint.set(point, group);
    }
    for (const group of samePoint.values()) {
      if (group.length < 2) continue;
      const radius = Math.max(38, Math.ceil((group.length - 1) * 6));
      group.slice(1).forEach((pin, index) => {
        const angle = (2 * Math.PI * index) / (group.length - 1) - Math.PI / 2;
        pin.offset = [Math.round(radius * Math.cos(angle)), Math.round(radius * Math.sin(angle))];
      });
    }
    return locations;
  });

  constructor() {
    effect(() => {
      const scope = this.records.scope();
      const allowed = this.allowed();
      untracked(() => {
        this.generation++;
        this.loading.set(false);
        this.saving.set(false);
        this.snapshot.set(null);
        this.draft.set(null);
        const worker = this.link.get('worker');
        const client = this.link.get('client');
        this.selected.set(
          worker ? 'care-worker:' + worker : client ? 'service-user:' + client : undefined,
        );
        this.error.set('');
        this.notice.set('');
        if (allowed && scope) void this.refresh();
      });
    });
    effect(() => {
      const draft = this.draft();
      if (draft?.kind !== 'care-worker') return;
      const current = this.snapshot()?.subjects.find((row) => this.key(row) === this.key(draft));
      const windowOpen =
        this.clock.fresh() &&
        current?.canReportPosition &&
        this.clock.before(current.workingWindowEndsAt);
      if (
        !windowOpen ||
        (draft.savedPosition && (!current?.savedPosition || !this.savedPosition(draft)))
      ) {
        this.form.latitude = null;
        this.form.longitude = null;
        if (draft.savedPosition) this.draft.set({ ...draft, savedPosition: null });
      }
    });
    const timer = setInterval(() => {
      if (!document.hidden) void this.refresh();
    }, 30000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.generation++;
    });
  }

  protected key(subject: GeoSubject): string {
    return subject.kind + ':' + subject.id;
  }
  protected state(subject: GeoSubject) {
    return subject.status ? workerStatuses[subject.status] : null;
  }
  protected visiblePosition(subject: GeoSubject): Position | null {
    return subject.kind === 'service-user' ||
      (this.clock.fresh() && this.clock.before(subject.positionExpiresAt))
      ? subject.position
      : null;
  }
  protected locationLabel(subject: GeoSubject): string {
    return {
      restricted: 'Location restricted to authorised working hours',
      'updates-unavailable': 'Location updates unavailable',
      outdated: 'Location outdated',
      unavailable: 'Coordinates unavailable',
    }[this.locationIssue(subject)];
  }
  private locationIssue(subject: GeoSubject) {
    if (subject.kind === 'care-worker') {
      if (
        subject.locationState === 'outside-working-hours' ||
        (subject.workingWindowEndsAt && !this.clock.before(subject.workingWindowEndsAt))
      ) {
        return 'restricted';
      }
      if (!this.clock.fresh()) return 'updates-unavailable';
    }
    return subject.locationState === 'outdated' || subject.position ? 'outdated' : 'unavailable';
  }
  protected canEditCoordinates(subject: GeoSubject): boolean {
    const current = this.snapshot()?.subjects.find((row) => this.key(row) === this.key(subject));
    return !!current && this.canEditPosition(current, this.form.status);
  }
  private canEditPosition(subject: GeoSubject, status = subject.reportedStatus): boolean {
    if (!this.allowed()) return false;
    if (subject.kind === 'service-user') return this.canEditUsers();
    return (
      this.clock.fresh() &&
      subject.canReportPosition &&
      this.clock.before(subject.workingWindowEndsAt) &&
      !['on-break', 'off-duty'].includes(status)
    );
  }
  protected time(instant: string): string {
    return this.timeFormat.format(new Date(instant));
  }
  protected source(position: Position): string {
    return {
      recorded: 'Saved service-user location',
      reported: 'Last reported position',
      visit: 'Saved visit location · ECM check-in',
    }[position.source];
  }
  protected select(key: string): void {
    if (this.saving() || this.draft()) return;
    this.selected.set(key);
    this.notice.set('');
  }
  protected async refresh(): Promise<void> {
    if (!this.allowed() || this.loading() || this.saving()) return;
    const company = this.records.companyId();
    if (!company) return;
    const scope = this.records.scope();
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.auth.api<GeoSnapshot>(`/companies/${company}/ecm/geomap`);
      if (!this.current(scope, generation)) return;
      if (result.company_id !== company) {
        this.snapshot.set(null);
        throw Error('The response belongs to a different workspace.');
      }
      this.clock.sync(result.asOf);
      this.snapshot.set(result);
    } catch (error) {
      if (!this.current(scope, generation)) return;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        this.snapshot.set(null);
        this.draft.set(null);
      }
      this.error.set(error instanceof Error ? error.message : 'The Live GeoMap is unavailable.');
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  protected edit(subject: GeoSubject): void {
    if (this.loading() || (subject.kind === 'service-user' && !this.canEditUsers())) return;
    const saved = this.savedPosition(subject);
    this.form = {
      latitude: saved?.latitude ?? null,
      longitude: saved?.longitude ?? null,
      status: subject.reportedStatus,
    };
    this.formError.set('');
    this.notice.set('');
    this.draft.set(subject);
  }
  protected async save(): Promise<void> {
    const subject = this.draft();
    if (!subject || this.saving() || this.loading() || !this.allowed()) return;
    const { latitude, longitude, status } = this.form;
    const canEdit = this.canEditCoordinates(subject);
    if (
      canEdit &&
      ((latitude === null) !== (longitude === null) ||
        (latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
        (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180)))
    ) {
      this.formError.set(
        'Enter both valid coordinates or clear both to remove the saved position.',
      );
      return;
    }
    const point =
      latitude === null || longitude === null
        ? null
        : {
            latitude: Number(latitude.toFixed(6)),
            longitude: Number(longitude.toFixed(6)),
          };
    const previous = this.savedPosition(subject);
    const changedPosition =
      point?.latitude !== previous?.latitude || point?.longitude !== previous?.longitude;
    const body: { version: number; position?: Point | null; status?: string } = {
      version: subject.version,
    };
    if (canEdit && changedPosition) body.position = point;
    if (
      subject.kind === 'care-worker' &&
      (status !== subject.reportedStatus || (!changedPosition && status))
    )
      body.status = status;
    if (!('position' in body) && !('status' in body)) {
      this.draft.set(null);
      return;
    }
    const scope = this.records.scope();
    const generation = this.generation;
    const company = this.records.companyId();
    const collection = subject.kind === 'service-user' ? 'service-users' : 'care-workers';
    this.saving.set(true);
    this.formError.set('');
    try {
      const result = await this.auth.api<{ company_id: string }>(
        `/companies/${company}/ecm/geomap/${collection}/${subject.id}`,
        body,
        'PATCH',
      );
      if (!this.current(scope, generation)) return;
      if (result.company_id !== company)
        throw Error('The response belongs to a different workspace.');
      this.draft.set(null);
      this.notice.set('Map record saved.');
    } catch (error) {
      if (this.current(scope, generation))
        this.formError.set(
          error instanceof Error ? error.message : 'The map record could not be saved.',
        );
      return;
    } finally {
      if (generation === this.generation) this.saving.set(false);
    }
    if (this.current(scope, generation)) await this.refresh();
  }
  private current(scope: string, generation: number): boolean {
    return this.records.scope() === scope && this.allowed() && this.generation === generation;
  }
  private savedPosition(subject: GeoSubject): Position | null {
    const position = subject.savedPosition;
    if (subject.kind === 'service-user') return position;
    return position &&
      this.clock.fresh() &&
      this.clock.before(subject.workingWindowEndsAt) &&
      this.clock.now() < Date.parse(position.at) + 15 * 60 * 1000
      ? position
      : null;
  }
}
