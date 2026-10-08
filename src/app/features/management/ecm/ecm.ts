import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { CvSelect } from '../../../shared/ui/select';
import { ToastService } from '../../../shared/ui/toast.service';
import { WallboardLauncher } from './wallboard-launcher';
import { EcmOperations } from './ecm.operations';
import { VisitEvidence } from './visit-evidence';
import { RISK_FLAGS, RiskFlag } from '../rota/rota.models';
import { COURSES } from '../shared/management.store';
import { ManagementStore } from '../shared/management.store';
import { AccessRequired } from '../shared/access-required';
import { RotaVisit, londonDate, londonInstant } from '../rota/rota.models';
import { EcmService } from './ecm.service';
import {
  ECM_ACTIONS,
  EcmAction,
  EcmEvidence,
  emptyEcm,
  liveVisit,
  onBoardDate,
} from './ecm.models';

@Component({
  selector: 'cv-ecm',
  imports: [
    FormsModule,
    MatSelectModule,
    RouterLink,
    A11yModule,
    CvSelect,
    AccessRequired,
    VisitEvidence,
  ],
  templateUrl: './ecm.html',
  styleUrl: './ecm.css',
})
export class Ecm {
  protected readonly tv = inject(WallboardLauncher);
  protected readonly ops = inject(EcmOperations);
  protected readonly courses = COURSES;
  protected readonly riskFlags = RISK_FLAGS;
  protected readonly risk = signal('');
  protected readonly audio = signal('');
  protected change = { date: londonDate(), start: '', reason: '', accepted: false };
  protected override = { staffIds: [] as string[], reason: '', accepted: false };
  protected readonly service = inject(EcmService);
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected readonly wallboard = inject(ActivatedRoute).snapshot.data['wallboard'] === true;
  protected readonly now = signal(Date.now());
  protected readonly refreshed = signal(Date.now());
  protected readonly date = signal(londonDate());
  protected readonly search = signal('');
  protected readonly client = signal('');
  protected readonly staff = signal('');
  protected readonly call = signal('');
  protected readonly status = signal('');
  protected readonly quick = signal('Live visits');
  protected readonly high = signal(false);
  protected readonly advanced = signal(false);
  protected readonly double = signal(false);
  protected readonly selected = signal('');
  protected readonly modal = signal('');
  protected readonly error = signal('');
  protected readonly photo = signal('');
  protected readonly actions = ECM_ACTIONS;
  protected readonly views = [
    'Live visits',
    'Needs attention',
    'Care in progress',
    'Completed',
    'All visits',
  ];
  protected readonly statuses = [
    'Scheduled',
    'Early',
    'In progress',
    'Running late',
    'Missed visit risk',
    'Missed visit',
    'Completed',
    'Timing unavailable',
  ];
  protected action = this.blankAction();
  protected attendance = {
    personId: '',
    at: '',
    kind: 'Check in' as 'Check in' | 'Check out',
    note: '',
  };
  protected cover = { staffIds: [] as string[], reason: '' };
  protected settings = structuredClone(this.service.data());
  protected styleCall = '';
  protected newCall = '';
  protected addCall(): void {
    const name = this.newCall.trim();
    if (!name || this.settings.styles[name]) {
      this.error.set('Enter a new, unique call type name.');
      return;
    }
    this.settings.styles[name] = {
      background: '#eff6ff',
      color: '#1e40af',
      label: name,
      duration: 45,
      priority: 'Standard',
      skills: [],
      active: true,
    };
    this.styleCall = name;
    this.newCall = '';
    this.error.set('');
  }
  protected overrideConflicts(): string[] {
    const v = this.visit();
    return v ? this.service.rota.conflicts({ ...v, staffIds: this.override.staffIds }) : [];
  }
  protected styleNames(): string[] {
    return Object.keys(this.settings.styles).sort();
  }
  protected readonly all = computed(() =>
    this.service.rota.can('view')
      ? this.service.rota
          .data()
          .visits.filter(
            (v) => this.date() && onBoardDate(v, this.date()) && v.state === 'Published',
          )
          .map((v) => ({ v, live: liveVisit(v, this.now(), this.service.data()) }))
      : [],
  );
  protected readonly calls = computed(() =>
    [
      ...new Set([
        ...Object.keys(this.service.data().styles),
        ...this.all().map((r) => r.v.callName),
      ]),
    ].sort(),
  );
  protected readonly totals = computed(() => ({
    total: this.all().length,
    red: this.all().filter((r) => r.live.tone === 'red').length,
    amber: this.all().filter((r) => r.live.tone === 'amber').length,
    urgent: this.all().filter((r) => ['red', 'amber'].includes(r.live.tone)).length,
    progress: this.all().filter((r) => ['In progress', 'Early'].includes(r.live.status)).length,
    completed: this.all().filter((r) => r.live.status === 'Completed').length,
    high: this.all().filter(
      (r) => r.v.priority === 'High' || this.flags(r.v).includes('Critical / welfare-sensitive'),
    ).length,
  }));
  protected readonly rows = computed(() =>
    this.all()
      .filter(
        ({ v, live }) =>
          (!this.client() || v.clientId === this.client()) &&
          (!this.staff() || v.staffIds.includes(this.staff())) &&
          (!this.call() || v.callName === this.call()) &&
          (!this.status() || live.status === this.status()) &&
          (!this.high() ||
            v.priority === 'High' ||
            this.flags(v).includes('Critical / welfare-sensitive')) &&
          (!this.risk() || this.flags(v).includes(this.risk() as RiskFlag)) &&
          (!this.double() || v.carers === 2) &&
          (this.quick() !== 'Live visits' || live.status !== 'Completed') &&
          (this.quick() !== 'Care in progress' || ['In progress', 'Early'].includes(live.status)) &&
          (this.quick() !== 'Completed' || live.status === 'Completed') &&
          (this.quick() !== 'Needs attention' || ['red', 'amber'].includes(live.tone)) &&
          `${v.clientName} ${v.callName} ${v.address} ${v.staffIds.map((id) => this.name(id)).join(' ')}`
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort(
        (a, b) =>
          a.live.rank - b.live.rank ||
          a.v.start.localeCompare(b.v.start) ||
          a.v.clientName.localeCompare(b.v.clientName),
      ),
  );
  protected readonly visit = computed(() =>
    this.service.rota.can('view')
      ? this.service.rota
          .data()
          .visits.find((v) => v.id === this.selected() && v.state === 'Published')
      : undefined,
  );
  protected readonly records = computed(() =>
    this.service
      .data()
      .records.filter((r) => r.visitId === this.selected())
      .slice()
      .reverse(),
  );
  protected readonly evidenceRows = computed(() =>
    this.service
      .data()
      .evidence.filter((r) => r.visitId === this.selected())
      .slice()
      .reverse(),
  );
  constructor() {
    effect(() => {
      this.service.data();
      this.service.rota.data();
      this.refreshed.set(Date.now());
    });
    const timer = setInterval(() => {
      const previousDay = londonDate(new Date(this.now()));
      const day = londonDate();
      if (day !== previousDay && this.date() === previousDay) this.date.set(day);
      this.now.set(Date.now());
      if (Date.now() - this.refreshed() >= 180000) this.refresh();
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  protected refresh(): void {
    this.now.set(Date.now());
    this.refreshed.set(Date.now());
  }
  protected async fullscreen(): Promise<void> {
    try {
      await document.getElementById('ecm-surface')?.requestFullscreen();
    } catch {
      this.toast.error('Full screen is unavailable in this browser.');
    }
  }
  protected dateLabel(value: string): string {
    return value
      ? new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(new Date(value + 'T12:00:00Z'))
      : 'Choose a date';
  }
  protected metricView(view: string): void {
    this.clear();
    this.quick.set(view);
  }
  protected name(id: string): string {
    return this.store.data().people.find((p) => p.id === id)?.name ?? 'Former staff member';
  }
  protected live(v: RotaVisit) {
    return liveVisit(v, this.now(), this.service.data());
  }
  protected time(value: string, seconds = false): string {
    return value
      ? new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit',
          minute: '2-digit',
          second: seconds ? '2-digit' : undefined,
          hourCycle: 'h23',
        }).format(new Date(/^\d+$/.test(value) ? Number(value) : value))
      : '—';
  }
  protected stamp(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
  protected style(name: string) {
    return (
      this.service.data().styles[name] ?? { background: '#eff6ff', color: '#1e40af', label: name }
    );
  }
  protected clear(): void {
    this.search.set('');
    this.client.set('');
    this.staff.set('');
    this.call.set('');
    this.status.set('');
    this.high.set(false);
    this.risk.set('');
    this.double.set(false);
    this.quick.set('Live visits');
  }
  private blankAction() {
    return {
      action: 'Manager note' as EcmAction,
      note: '',
      contact: '',
      contactAt: '',
      outcome: '',
      eta: '',
      accepted: false,
      concern: false,
      followUp: '',
      queueMessage: false,
      channel: 'In-app' as 'In-app' | 'SMS' | 'Email',
      recipient: '',
      ownerId: '',
    };
  }
  protected openVisit(v: RotaVisit): void {
    this.selected.set(v.id);
    this.open('Visit details');
  }
  protected open(kind: string): void {
    this.error.set('');
    this.photo.set('');
    this.audio.set('');
    if (kind === 'Reschedule visit')
      this.change = {
        date: this.visit()?.date ?? londonDate(),
        start: this.visit()?.start ?? '',
        reason: '',
        accepted: false,
      };
    if (kind === 'Manual override')
      this.override = {
        staffIds: [...(this.visit()?.staffIds ?? [])],
        reason: '',
        accepted: false,
      };
    if (kind === 'Record follow-up') {
      this.action = this.blankAction();
      this.action.ownerId = this.store.data().members.find((m) => m.status === 'Active')?.id ?? '';
    }
    if (kind === 'Reallocate visit')
      this.cover = { staffIds: [...(this.visit()?.staffIds ?? [])], reason: '' };
    if (kind === 'Record attendance')
      this.attendance = {
        personId: this.visit()?.staffIds[0] ?? '',
        at: `${londonDate()}T${this.time(new Date().toISOString())}`,
        kind: 'Check in',
        note: '',
      };
    if (kind === 'Board settings') {
      this.settings = structuredClone(this.service.data());
      this.settings.styles = { ...emptyEcm().styles, ...this.settings.styles };
      for (const s of Object.values(this.settings.styles)) {
        s.duration ??= 45;
        s.priority ??= 'Standard';
        s.skills ??= [];
        s.active ??= true;
      }
      this.styleCall = this.calls()[0] ?? '';
      this.selectStyle();
    }
    this.modal.set(kind);
    setTimeout(() => document.getElementById('ecm-dialog-title')?.focus(), 0);
  }
  protected close(): void {
    this.modal.set('');
    this.audio.set('');
    this.photo.set('');
    this.error.set('');
  }
  protected resetColours(): void {
    const s = this.settings.styles[this.styleCall];
    const defaults = emptyEcm().styles[this.styleCall] ?? {
      background: '#eff6ff',
      color: '#1e40af',
    };
    if (s) {
      s.background = defaults.background;
      s.color = defaults.color;
    }
  }
  protected selectStyle(): void {
    if (this.styleCall && !this.settings.styles[this.styleCall])
      this.settings.styles[this.styleCall] = { ...this.style(this.styleCall) };
  }
  protected save(): void {
    let result: string | null = 'Choose a valid action.';
    if (this.modal() === 'Reschedule visit')
      result = this.ops.reschedule(
        this.selected(),
        this.change.date,
        this.change.start,
        this.change.reason,
        this.change.accepted,
      );
    if (this.modal() === 'Manual override')
      result = this.ops.override(
        this.selected(),
        this.override.staffIds,
        this.override.reason,
        this.override.accepted,
      );
    if (this.modal() === 'Record follow-up')
      result = this.service.record(this.selected(), this.action);
    if (this.modal() === 'Board settings') result = this.service.settings(this.settings);
    if (this.modal() === 'Reallocate visit')
      result = this.service.rota.allocate(
        this.selected(),
        this.cover.staffIds,
        'Temporary',
        this.cover.reason,
      );
    if (this.modal() === 'Record attendance') {
      const [date, time] = this.attendance.at.split('T');
      const at = londonInstant(date, time ?? '');
      result = at
        ? this.service.attendance(
            this.selected(),
            this.attendance.personId,
            at,
            this.attendance.kind,
            this.attendance.note,
          )
        : 'Enter an unambiguous actual UK time.';
    }
    this.error.set(result ?? '');
    if (!result) {
      this.close();
      this.refresh();
      this.toast.success('ECM record saved.');
    }
  }
  protected flags(v: RotaVisit): RiskFlag[] {
    return (
      this.service.rota.data().clients.find((c) => c.id === v.clientId)?.riskFlags ??
      v.riskFlags ??
      []
    );
  }
  protected viewAudio(e: EcmEvidence): void {
    const error = this.service.viewAudio(e.id);
    this.error.set(error ?? '');
    if (!error) this.audio.set(e.audio ?? '');
  }
  protected savedEvidence(): void {
    this.close();
    this.refresh();
    this.toast.success('Care evidence saved.');
  }
  protected recipient(): void {
    const v = this.visit();
    const c = this.service.rota.data().clients.find((c) => c.id === v?.clientId);
    this.action.recipient =
      this.action.channel === 'Email'
        ? (c?.representative?.email ?? '')
        : this.action.channel === 'SMS'
          ? (c?.representative?.phone ?? '')
          : this.name(v?.staffIds[0] ?? '');
  }
  protected review(id: string): void {
    const result = this.service.reviewEvidence(id);
    this.error.set(result ?? '');
    if (!result) this.toast.success('Evidence reviewed.');
  }
  protected viewPhoto(e: EcmEvidence): void {
    const result = this.service.viewPhoto(e.id);
    this.error.set(result ?? '');
    if (!result) this.photo.set(e.photo);
  }
  protected exportReport(): void {
    if (!this.service.rota.can('export')) return;
    const escape = (s: string) =>
      '"' + (/^[=+\-@\t\r]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"';
    const rows = [
      [
        'Date (UK)',
        'Service user',
        'Call',
        'Scheduled start',
        'Status',
        'Delay (minutes)',
        'Carers',
        'Priority',
        'Latest follow-up',
      ],
      ...this.rows()
        .filter((r) => ['red', 'amber'].includes(r.live.tone))
        .map(({ v, live }) => [
          v.date,
          v.clientName,
          v.callName,
          v.start,
          live.status,
          String(live.delay),
          v.staffIds.map((id) => this.name(id)).join('; '),
          v.priority,
          this.service
            .data()
            .records.filter((r) => r.visitId === v.id)
            .at(-1)?.note ?? '',
        ]),
    ];
    this.store.download(
      `ecm-exceptions-${this.date()}.csv`,
      rows.map((r) => r.map(escape).join(',')).join('\r\n'),
      'text/csv',
    );
  }
}
