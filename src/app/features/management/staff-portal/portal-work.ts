import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ApiError } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { locationClock } from '../ecm/location-clock';
import { StaffDashboardApi } from './staff-dashboard-api.service';

type Visit = {
  id: string;
  etag: string;
  clientId: string;
  clientName: string;
  callName: string;
  carers: number;
  startsAt: string;
  endsAt: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  canClock: boolean;
  tasks: string[];
};
type Work = {
  company_id: string;
  asOf: string;
  timezone: string;
  visits: Visit[];
  canReport: boolean;
  canClearPosition: boolean;
  canOpenClient: boolean;
  workingWindowEndsAt: string | null;
  locationState: 'available' | 'unavailable' | 'outdated' | 'outside-working-hours';
  reportVersion: number;
  status: string;
  travelMode: string;
};

@Component({
  selector: 'cv-portal-work',
  imports: [RouterLink],
  templateUrl: './portal-work.html',
  styleUrls: ['./portal-work.css'],
  host: { class: 'module-page portal-work' },
})
export class PortalWork {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly account = inject(StaffDashboardApi);
  private readonly clock = locationClock();
  private readonly raw = signal<{ scope: string; data: Work } | null>(null);
  private readonly retries = new Map<string, string>();
  private generation = 0;
  protected readonly data = computed(() =>
    this.raw()?.scope === this.account.scope() ? this.raw()!.data : null,
  );
  protected readonly canReport = computed(() => {
    const data = this.data();
    return !!data?.canReport && this.clock.fresh() && this.clock.before(data.workingWindowEndsAt);
  });
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly mode = signal('');
  protected readonly statuses: Record<string, string> = {
    '': 'No activity reported',
    available: 'Available',
    travelling: 'Travelling',
    'off-duty': 'Off duty',
    'on-break': 'On break',
    'on-duty': 'On duty',
  };
  protected readonly locationStates = {
    available: 'Recent position shared',
    unavailable: 'Location unavailable',
    outdated: 'Location outdated',
    'outside-working-hours': 'Location sharing is outside authorised working time',
  };
  private readonly format = computed(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: this.data()?.timezone,
      }),
  );

  constructor() {
    effect(() => {
      this.account.scope();
      untracked(() => {
        this.generation++;
        this.raw.set(null);
        this.retries.clear();
        this.loading.set(false);
        this.busy.set(false);
        this.error.set('');
        this.notice.set('');
        this.mode.set('');
        void this.refresh();
      });
    });
    const timer = setInterval(() => {
      if (!document.hidden && !this.busy()) void this.refresh();
    }, 30000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.generation++;
    });
  }

  protected async refresh(): Promise<void> {
    const company = this.access.companyId();
    if (!company || this.loading()) return;
    const scope = this.account.scope();
    const generation = this.generation;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.auth.api<Work>(`/companies/${company}/staff-portal/work`);
      if (!this.current(scope, generation)) return;
      if (result.company_id !== company) {
        this.raw.set(null);
        throw Error('This schedule belongs to a different workspace.');
      }
      if (!this.raw()) this.mode.set(result.travelMode);
      this.clock.sync(result.asOf);
      this.raw.set({ scope, data: result });
    } catch (error) {
      if (!this.current(scope, generation)) return;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) this.raw.set(null);
      this.error.set(
        error instanceof Error ? error.message : 'Your visit schedule is unavailable.',
      );
    } finally {
      if (this.current(scope, generation)) this.loading.set(false);
    }
  }

  protected async attendance(visit: Visit): Promise<void> {
    if (!visit.canClock || this.busy() || this.loading()) return;
    const kind = visit.checkedInAt ? 'Check out' : 'Check in';
    const intent = visit.id + ':' + kind;
    const key = this.retries.get(intent) ?? crypto.randomUUID();
    this.retries.set(intent, key);
    await this.write(
      `/visits/${visit.id}/attendance`,
      { kind, note: 'Recorded by the assigned care worker.' },
      'POST',
      { 'If-Match': visit.etag, 'Idempotency-Key': key },
      kind + ' recorded.',
    );
  }

  protected async report(status?: string, share = false): Promise<void> {
    const data = this.data();
    if (!data || this.busy() || this.loading() || (!this.canReport() && (status || share))) return;
    const scope = this.account.scope();
    const generation = this.generation;
    let position: { latitude: number; longitude: number } | null | undefined;
    if (share) {
      this.busy.set(true);
      this.error.set('');
      this.notice.set('');
      try {
        position = await this.position();
      } catch (error) {
        if (this.current(scope, generation))
          this.error.set(error instanceof Error ? error.message : 'Location is unavailable.');
        return;
      } finally {
        if (this.current(scope, generation)) this.busy.set(false);
      }
    } else if (!status) {
      position = null;
    }
    if (!this.current(scope, generation)) return;
    if ((status || share) && !this.canReport()) {
      this.error.set('Your authorised working window has ended.');
      return;
    }
    await this.write(
      '/report',
      {
        version: data.reportVersion,
        ...(status ? { status } : {}),
        ...(status === 'travelling' ? { travelMode: this.mode() } : {}),
        ...(position !== undefined ? { position } : {}),
      },
      'PATCH',
      {},
      share ? 'Position shared.' : status ? 'Activity updated.' : 'Shared position removed.',
    );
  }

  protected time(value: string): string {
    return this.format().format(new Date(value));
  }

  private position(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(Error('This device cannot share a location.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({
            latitude: Number(coords.latitude.toFixed(6)),
            longitude: Number(coords.longitude.toFixed(6)),
          }),
        () => reject(Error('Location unavailable. Check your device permissions.')),
        { maximumAge: 0, timeout: 15000, enableHighAccuracy: true },
      );
    });
  }

  private async write(
    suffix: string,
    body: object,
    method: 'POST' | 'PATCH',
    headers: Record<string, string>,
    message: string,
  ): Promise<void> {
    const data = this.data();
    if (!data || this.busy() || this.loading()) return;
    const scope = this.account.scope();
    const generation = this.generation;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const result = await this.auth.api<{ company_id: string }>(
        `/companies/${data.company_id}/staff-portal/work${suffix}`,
        body,
        method,
        headers,
      );
      if (!this.current(scope, generation)) return;
      if (result.company_id !== data.company_id)
        throw Error('This update belongs to a different workspace.');
      await this.refresh();
      if (this.current(scope, generation)) this.notice.set(message);
    } catch (error) {
      if (!this.current(scope, generation)) return;
      if (error instanceof ApiError && [409, 412, 403].includes(error.status)) await this.refresh();
      if (this.current(scope, generation))
        this.error.set(
          error instanceof Error ? error.message : 'Your update could not be recorded.',
        );
    } finally {
      if (this.current(scope, generation)) this.busy.set(false);
    }
  }

  private current(scope: string, generation: number): boolean {
    return generation === this.generation && scope === this.account.scope();
  }
}
