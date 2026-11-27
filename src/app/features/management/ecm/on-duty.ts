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
import { A11yModule } from '@angular/cdk/a11y';
import { ApiError } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { ModuleDesign } from '../shared/module-design';
import { EcmNavigation } from './ecm-navigation';

type Interval = { startsAt: string; endsAt: string };
type Break = Interval & { authorisedAt: string };
type Shift = Interval & {
  id: string;
  workerId: string;
  workerName: string;
  etag: string;
  breaks: Break[];
};
type Worker = {
  id: string;
  name: string;
  dutyStatus: 'on-duty' | 'no-active-shift';
  shift: Shift | null;
  checkIn: { visitId: string; serviceUser: string; at: string } | null;
  travelling: boolean;
  nextVisit: string | null;
  activeBreak: Break | null;
  endingSoon: boolean;
  allocationStatus: 'available' | 'unavailable' | 'unverified';
  allocationReason: string;
};
type Snapshot = {
  company_id: string;
  asOf: string;
  timezone: string;
  scheduleDate: string;
  canManage: boolean;
  workers: Worker[];
  scheduleWorkers: { id: string; name: string }[];
  schedule: Shift[];
};
type ShiftForm = Interval & { workerId: string; breaks: Interval[] };

const statuses = [
  {
    key: 'on-duty',
    label: 'On duty',
    icon: 'work',
    tone: 'blue',
    matches: (row: Worker) => row.dutyStatus === 'on-duty',
  },
  {
    key: 'checked-in',
    label: 'Checked in',
    icon: 'how_to_reg',
    tone: 'teal',
    matches: (row: Worker) => !!row.checkIn,
  },
  {
    key: 'travelling',
    label: 'Travelling',
    icon: 'directions_car',
    tone: 'purple',
    matches: (row: Worker) => row.travelling,
  },
  {
    key: 'on-break',
    label: 'Authorised break',
    icon: 'pause_circle',
    tone: 'amber',
    matches: (row: Worker) => !!row.activeBreak,
  },
  {
    key: 'available',
    label: 'Available',
    icon: 'person_check',
    tone: 'green',
    matches: (row: Worker) => row.allocationStatus === 'available',
  },
  {
    key: 'ending-soon',
    label: 'Shift ending soon',
    icon: 'schedule',
    tone: 'amber',
    matches: (row: Worker) => row.endingSoon,
  },
];

@Component({
  selector: 'cv-on-duty',
  imports: [FormsModule, RouterLink, A11yModule, ModuleDesign, EcmNavigation],
  host: { class: 'module-page operations-page geo-page duty-page' },
  templateUrl: './on-duty.html',
  styleUrls: ['./live-geomap.css', './on-duty.css'],
  encapsulation: ViewEncapsulation.None,
})
export class OnDuty {
  private readonly auth = inject(AuthService);
  private readonly records = inject(ServiceUsersApi);
  protected readonly filters = statuses;
  protected readonly allowed = computed(
    () =>
      this.records.allowed() &&
      this.records.access.can('care', 'rostering', 'read') &&
      this.records.access.can('care', 'ecm', 'read') &&
      this.records.access.can('care', 'ecm', 'edit'),
  );
  protected readonly data = signal<Snapshot | null>(null);
  protected readonly canManage = computed(
    () => this.data()?.canManage && this.records.access.can('care', 'rostering', 'edit'),
  );
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly notice = signal('');
  protected readonly filter = signal('');
  protected readonly search = signal('');
  protected readonly scheduleView = signal(false);
  protected readonly requestedDate = signal('');
  protected readonly editing = signal(false);
  protected readonly selectedShift = signal<Shift | null>(null);
  protected form: ShiftForm = { workerId: '', startsAt: '', endsAt: '', breaks: [] };
  private createIntent: { body: string; key: string } | undefined;
  private generation = 0;
  protected readonly active = computed(() =>
    (this.data()?.workers ?? []).filter(
      (row) => row.dutyStatus === 'on-duty' || row.checkIn || row.travelling,
    ),
  );
  protected readonly counts = computed(() =>
    statuses.map((filter) => ({ ...filter, count: this.active().filter(filter.matches).length })),
  );
  protected readonly rows = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const filter = statuses.find(({ key }) => key === this.filter());
    return this.active().filter(
      (row) =>
        (!filter || filter.matches(row)) &&
        [row.name, row.checkIn?.serviceUser, row.nextVisit].some((value) =>
          value?.toLocaleLowerCase().includes(query),
        ),
    );
  });
  private readonly timezone = computed(() => this.data()?.timezone ?? 'Europe/London');
  private readonly formatter = computed(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: this.timezone(),
      }),
  );
  private readonly inputFormatter = computed(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        timeZone: this.timezone(),
      }),
  );

  constructor() {
    effect(() => {
      const scope = this.records.scope();
      const allowed = this.allowed();
      untracked(() => {
        this.generation++;
        this.data.set(null);
        this.loading.set(false);
        this.saving.set(false);
        this.editing.set(false);
        this.selectedShift.set(null);
        this.requestedDate.set('');
        this.error.set('');
        this.notice.set('');
        if (allowed && scope) void this.refresh();
      });
    });
    const timer = setInterval(() => {
      if (!document.hidden && !this.editing()) void this.refresh();
    }, 30000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.generation++;
    });
  }

  protected time(value: string): string {
    return this.formatter().format(new Date(value));
  }
  protected async changeDate(value: string): Promise<void> {
    this.requestedDate.set(value);
    await this.refresh();
  }
  protected async refresh(): Promise<void> {
    const company = this.records.companyId();
    if (!company || !this.allowed() || this.loading() || this.saving()) return;
    const scope = this.records.scope();
    const generation = this.generation;
    const date = this.requestedDate();
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.auth.api<Snapshot>(
        `/companies/${company}/ecm/on-duty` + (date ? '?' + new URLSearchParams({ date }) : ''),
      );
      if (!this.current(scope, generation)) return;
      if (result.company_id !== company) {
        this.data.set(null);
        throw Error('The response belongs to a different workspace.');
      }
      this.data.set(result);
    } catch (error) {
      if (!this.current(scope, generation)) return;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) this.data.set(null);
      this.error.set(error instanceof Error ? error.message : 'The duty roster is unavailable.');
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  protected edit(shift: Shift | null): void {
    if (!this.canManage() || this.saving() || this.loading()) return;
    this.selectedShift.set(shift);
    this.form = {
      workerId: shift?.workerId ?? '',
      startsAt: shift ? this.localInput(shift.startsAt) : '',
      endsAt: shift ? this.localInput(shift.endsAt) : '',
      breaks: (shift?.breaks ?? []).map((item) => ({
        startsAt: this.localInput(item.startsAt),
        endsAt: this.localInput(item.endsAt),
      })),
    };
    this.createIntent = undefined;
    this.formError.set('');
    this.notice.set('');
    this.editing.set(true);
  }
  protected addBreak(): void {
    if (this.form.breaks.length < 20) this.form.breaks.push({ startsAt: '', endsAt: '' });
  }
  protected async save(cancel = false): Promise<void> {
    const company = this.records.companyId();
    if (!company || !this.allowed() || !this.canManage() || !this.editing() || this.saving())
      return;
    const shift = this.selectedShift();
    if (cancel) {
      if (!shift || !window.confirm('Cancel this scheduled shift?')) return;
    } else {
      const intervals = [this.form, ...this.form.breaks];
      if (!this.form.workerId || intervals.some(({ startsAt, endsAt }) => !startsAt || !endsAt)) {
        this.formError.set(
          'Choose a care worker and enter start and end times for the shift and each break.',
        );
        return;
      }
    }
    const scope = this.records.scope();
    const generation = this.generation;
    const path = `/companies/${company}/ecm/on-duty/shifts` + (shift ? '/' + shift.id : '');
    const body = JSON.stringify(this.form);
    if (!shift && this.createIntent?.body !== body)
      this.createIntent = { body, key: crypto.randomUUID() };
    this.saving.set(true);
    this.formError.set('');
    try {
      const result = await this.auth.api<{ company_id: string }>(
        path,
        cancel ? undefined : this.form,
        cancel ? 'DELETE' : shift ? 'PATCH' : 'POST',
        shift ? { 'If-Match': shift.etag } : { 'Idempotency-Key': this.createIntent!.key },
      );
      if (!this.current(scope, generation)) return;
      if (result.company_id !== company)
        throw Error('The response belongs to a different workspace.');
      this.notice.set(cancel ? 'Shift cancelled.' : 'Shift schedule saved.');
      this.editing.set(false);
      if (!cancel) this.requestedDate.set(this.form.startsAt.slice(0, 10));
    } catch (error) {
      if (this.current(scope, generation))
        this.formError.set(
          error instanceof Error ? error.message : 'The shift could not be saved.',
        );
      return;
    } finally {
      if (generation === this.generation) this.saving.set(false);
    }
    if (this.current(scope, generation)) await this.refresh();
  }
  private localInput(value: string): string {
    const parts = Object.fromEntries(
      this.inputFormatter()
        .formatToParts(new Date(value))
        .map(({ type, value }) => [type, value]),
    );
    return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}:${parts['second']}`;
  }
  private current(scope: string, generation: number): boolean {
    return this.allowed() && scope === this.records.scope() && generation === this.generation;
  }
}
