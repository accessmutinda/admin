import {
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RotaService } from '../rota/rota.service';
import { ManagementStore } from '../shared/management.store';
import { RotaClient, RotaVisit, addDays, londonDate, minutes } from '../rota/rota.models';
import { age } from './care.models';
import { CareHeader } from './care-header';

@Component({
  selector: 'cv-profile-visits',
  imports: [DatePipe, FormsModule, RouterLink, CareHeader],
  templateUrl: './profile-visits.html',
  styleUrls: [
    './service-user-spacing.css',
    './profile-visits-header.css',
    './profile-visits-form.css',
    './profile-visits.css',
  ],
})
export class ProfileVisits {
  readonly client = input.required<RotaClient>();
  readonly visitSelected = output<RotaVisit>();
  protected readonly service = inject(RotaService);
  protected readonly store = inject(ManagementStore);
  protected readonly today = londonDate();
  protected readonly anchor = signal(this.today);
  protected readonly view = signal('Month');
  protected readonly formOpen = signal(true);
  protected readonly dirty = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly calls = computed(() =>
    this.service.data().calls.filter((c) => c.clientId === this.client().id && c.active),
  );
  protected readonly start = computed(() =>
    this.view() !== 'Week'
      ? this.anchor().slice(0, 7) + '-01'
      : addDays(this.anchor(), -((new Date(this.anchor() + 'T12:00:00Z').getUTCDay() + 6) % 7)),
  );
  protected readonly end = computed(() => {
    if (this.view() === 'Week') return addDays(this.start(), 6);
    const d = new Date(this.start() + 'T12:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + 1);
    return addDays(d.toISOString().slice(0, 10), -1);
  });
  protected readonly days = computed(() => {
    const first =
      this.view() === 'Month'
        ? addDays(this.start(), -((new Date(this.start() + 'T12:00:00Z').getUTCDay() + 6) % 7))
        : this.start();
    const count =
      this.view() === 'Month'
        ? Math.ceil((Math.round((Date.parse(this.end()) - Date.parse(first)) / 86400000) + 1) / 7) *
          7
        : 7;
    return Array.from({ length: count }, (_, i) => addDays(first, i));
  });
  protected readonly allVisits = computed(() =>
    this.service
      .data()
      .visits.filter((v) => v.clientId === this.client().id && v.state !== 'Cancelled'),
  );
  protected readonly visits = computed(() =>
    this.allVisits()
      .filter((v) => v.date >= this.start() && v.date <= this.end())
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
  );
  protected readonly summary = computed(() => {
    const visits = this.visits();
    return [
      {
        label: 'Total Scheduled Visits',
        count: visits.length,
        icon: 'check_circle',
        tone: 'green',
      },
      {
        label: 'Allocated Visits',
        count: visits.filter((v) => v.staffIds.length === v.carers).length,
        icon: 'group',
        tone: 'blue',
      },
      {
        label: 'Needs Cover',
        count: visits.filter((v) => v.staffIds.length < v.carers).length,
        icon: 'error',
        tone: 'red',
      },
      {
        label: 'Double-up Visits',
        count: visits.filter((v) => v.carers === 2).length,
        icon: 'group_add',
        tone: 'purple',
      },
      {
        label: 'Permanent Carer Visits',
        count: visits.filter((v) => v.allocation === 'Regular' && v.staffIds.length === v.carers)
          .length,
        icon: 'schedule',
        tone: 'blue',
      },
      {
        label: 'Temporary Allocations',
        count: visits.filter((v) => v.allocation === 'Temporary').length,
        icon: 'circle',
        tone: 'muted',
      },
    ];
  });
  protected readonly age = computed(() => age(this.client().file?.details['dob'] ?? ''));
  protected readonly flags = computed(() => {
    const c = this.client(),
      f = c.file;
    const section = (key: string, field: string) => f?.sections[key]?.[field];
    const diagnoses = [
      ...new Set(
        [
          section('diagnoses', 'primary'),
          ...(f?.entries['diagnoses'] ?? [])
            .filter((d) => d.status === 'Active')
            .map((d) => d.name),
          ...(c.riskFlags ?? []),
        ].filter(Boolean),
      ),
    ];
    return [
      ...diagnoses.slice(0, 2).map((label) => ({ label, icon: 'neurology', tone: 'red' })),
      {
        label: 'Capacity: ' + (section('capacity', 'status') || 'Not recorded'),
        icon: 'balance',
        tone: 'amber',
      },
      {
        label:
          'LPA: Health & Welfare' + (section('capacity', 'welfareLpa') ? '' : ' · Not recorded'),
        icon: 'description',
        tone: section('capacity', 'welfareLpa') ? 'green' : 'muted',
      },
      {
        label:
          'LPA: Property & Finance' + (section('capacity', 'financeLpa') ? '' : ' · Not recorded'),
        icon: 'description',
        tone: section('capacity', 'financeLpa') ? 'green' : 'muted',
      },
      {
        label:
          'Time-sensitive calls: ' +
          (this.calls().some((c) => c.timeSensitive)
            ? 'Yes'
            : this.calls().length
              ? 'No'
              : 'Not recorded'),
        icon: 'schedule',
        tone: 'red',
      },
      {
        label:
          'Behaviour: ' + (section('support', 'behaviour') ? 'Support recorded' : 'Not recorded'),
        icon: 'verified_user',
        tone: 'green',
      },
      {
        label: 'Key safe: ' + (section('access', 'location') ? 'Recorded' : 'Not recorded'),
        icon: 'key',
        tone: 'green',
      },
      {
        label:
          'Next of kin: ' +
          (f?.contacts?.find((c) => c.nextOfKin)?.name || c.representative?.name || 'Not recorded'),
        icon: 'group',
        tone: 'blue',
      },
    ];
  });
  protected readonly rules = computed(() => {
    const support = this.client().file?.sections['support'];
    const regular = [...new Set(this.calls().flatMap((c) => c.regularStaffIds))];
    const backup = [
      ...new Set(
        this.calls()
          .map((c) => c.backupStaffId)
          .filter((id): id is string => !!id),
      ),
    ];
    const sensitive = this.calls().filter((c) => c.timeSensitive);
    return [
      {
        label: 'Permanent Carer',
        value: regular.map((id) => this.name(id)).join(', ') || 'Not allocated',
        note: 'Preferred for continuity and familiarity.',
        icon: 'person',
        tone: 'green',
      },
      {
        label: 'Temporary Cover',
        value:
          backup.map((id) => this.name(id)).join(', ') ||
          (support?.['backupStaff'] ? this.name(support['backupStaff']) : 'Not recorded'),
        note: 'Use when primary carer unavailable.',
        icon: 'person_add',
        tone: 'amber',
      },
      {
        label: 'Time-sensitive Visits',
        value: sensitive.length ? 'Yes' : this.calls().length ? 'No' : 'Not recorded',
        note: sensitive.length
          ? `Calls should be within ${Math.min(...sensitive.map((c) => c.toleranceMinutes ?? 30))} minutes of scheduled time.`
          : 'Follow the scheduled call times.',
        icon: 'schedule',
        tone: 'red',
      },
      {
        label: 'Preferred Carers',
        value:
          support?.['preferredStaff']
            ?.split(',')
            .map((id) => this.store.staff().find((p) => p.id === id.trim())?.name ?? id.trim())
            .join(', ') || 'Not recorded',
        note: 'Carers who know this service user well.',
        icon: 'group',
        tone: 'blue',
      },
      {
        label: 'Continuity Notes',
        value: '',
        note: support?.['continuity'] || 'No continuity notes recorded.',
        icon: 'description',
        tone: 'blue',
      },
    ];
  });
  protected readonly tabs = [
    { label: 'Overview', path: '', icon: 'home' },
    { label: 'Care Plan', path: '', section: 'plan', icon: 'assignment' },
    { label: 'Medication', path: 'medication', icon: 'pill' },
    { label: 'Visits & Allocation', path: 'visits', icon: 'calendar_month' },
    { label: 'Documents', path: 'documents', icon: 'description' },
    { label: 'Contacts', path: 'contacts', icon: 'group' },
    { label: 'Family Portal', path: 'family', icon: 'diversity_1' },
    { label: 'Audit Trail', path: 'audit', icon: 'history' },
  ];
  protected readonly weekdays = [
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 0 },
  ];
  protected form = this.blankForm();
  private sourceId = '';
  private workspace = '';
  constructor() {
    effect(() => {
      const id = this.client().id;
      if (id !== this.sourceId) {
        this.sourceId = id;
        this.reset();
      }
    });
  }
  private blankForm() {
    return {
      callIds: [] as string[],
      from: this.start(),
      to: this.end(),
      weekdays: [1, 2, 3, 4, 5, 6, 0],
      time: '08:00',
      duration: 30,
      travel: this.service.data().travelMinutes,
      primary: '',
      backup: '',
      temporary: false,
      doubleUp: false,
      second: '',
      medication: false,
      notes: '',
    };
  }
  protected reset(): void {
    this.form = this.blankForm();
    this.workspace = this.store.companyId();
    this.dirty.set(false);
    this.error.set('');
  }
  protected toggleCall(id: string): void {
    this.form.callIds = this.form.callIds.includes(id)
      ? this.form.callIds.filter((c) => c !== id)
      : [...this.form.callIds, id];
    const call = this.calls().find((c) => c.id === this.form.callIds[0]);
    if (call && this.form.callIds.length === 1) {
      Object.assign(this.form, {
        time: call.start,
        duration: (minutes(call.end) - minutes(call.start) + 1440) % 1440,
        weekdays: [...call.weekdays],
        primary: call.regularStaffIds[0] ?? '',
        backup: call.backupStaffId ?? '',
        doubleUp: call.carers === 2,
        second: call.regularStaffIds[1] ?? '',
        medication: call.skills.includes('medication'),
        notes: call.tasks,
      });
    }
    this.dirty.set(true);
  }
  protected toggleDay(day: number): void {
    this.form.weekdays = this.form.weekdays.includes(day)
      ? this.form.weekdays.filter((d) => d !== day)
      : [...this.form.weekdays, day];
  }
  protected save(): void {
    if (!this.service.can('manage')) return;
    if (this.workspace !== this.store.companyId() || this.sourceId !== this.client().id) {
      this.error.set('The workspace or service user changed. Reopen the allocation form.');
      return;
    }
    if (
      !this.form.primary ||
      (this.form.doubleUp && (!this.form.second || this.form.second === this.form.primary))
    ) {
      this.error.set('Choose a primary carer and a different second carer for double-up visits.');
      return;
    }
    const f = this.form;
    const error = this.service.generate(
      this.client().id,
      f.callIds,
      f.from,
      f.to,
      f.doubleUp ? [f.primary, f.second] : [f.primary],
      f.temporary ? 'Temporary' : 'Regular',
      {
        weekdays: f.weekdays,
        start: f.callIds.length === 1 ? f.time : undefined,
        durationMinutes: Number(f.duration),
        carers: f.doubleUp ? 2 : 1,
        backupStaffId: f.backup,
        medicationSupport: f.medication,
        notes: f.notes,
        travelMinutes: Number(f.travel),
      },
    );
    this.error.set(error ?? '');
    if (!error) {
      this.anchor.set(f.from);
      this.notice.set('Allocation confirmed. Visits are saved as drafts for publishing.');
      this.reset();
    }
  }
  protected move(direction: number): void {
    if (this.view() !== 'Week') {
      const d = new Date(this.start() + 'T12:00:00Z');
      d.setUTCMonth(d.getUTCMonth() + direction);
      this.anchor.set(d.toISOString().slice(0, 10));
    } else this.anchor.set(addDays(this.anchor(), direction * 7));
  }
  protected dayVisits(date: string): RotaVisit[] {
    return this.allVisits()
      .filter((v) => v.date === date)
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  protected name(id: string): string {
    return this.store.staff().find((p) => p.id === id)?.name ?? 'Unavailable carer';
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
  }
  protected tone(v: RotaVisit): string {
    const hour = minutes(v.start) / 60;
    return hour < 11 ? 'morning' : hour < 15 ? 'lunch' : hour < 20 ? 'tea' : 'bed';
  }
  protected closeForm(): void {
    if (this.canLeave()) {
      this.reset();
      this.formOpen.set(false);
    }
  }
  canLeave(): boolean {
    return !this.dirty() || window.confirm('Discard the unsaved allocation?');
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
