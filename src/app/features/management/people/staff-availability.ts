import { Component, Input, OnChanges, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { Person } from '../shared/management.store';
import { AvailabilityLeaveApi } from './availability-leave-api.service';
import type { WorkforceLeave } from './availability-leave.generated';
import { DAYS, weeklySlots, today } from './hr.models';
@Component({
  selector: 'cv-staff-availability',
  imports: [FormsModule, MatSelectModule, CvSelect],
  templateUrl: './staff-availability.html',
  styleUrls: ['./hr.css', './hr-tables.css', './hr-forms.css', './hr-availability.css'],
})
export class StaffAvailability implements OnChanges {
  @Input({ required: true }) p!: Person;
  private readonly editing = signal(false);
  @Input() set editable(value: boolean) {
    this.editing.set(value);
  }
  get editable(): boolean {
    return this.editing();
  }
  private readonly staffKey = signal('');
  @Input() set staffId(value: string) {
    this.staffKey.set(value);
  }
  private readonly sourceRevision = signal(0);
  @Input() set revision(value: number) {
    this.sourceRevision.set(value);
  }
  @Input() localDate = '';
  @Input() personalEditable = true;
  @Input() approvedLeaves: WorkforceLeave[] = [];
  private readonly api = inject(AvailabilityLeaveApi);
  private readonly sourceDays = signal<Record<string, string>>({});
  protected readonly calendarError = signal('');
  private generation = 0;
  private initializedDate = false;
  constructor() {
    effect(() => {
      const id = this.staffKey(),
        month = this.month(),
        editing = this.editing();
      this.sourceRevision();
      this.api.scope();
      const generation = ++this.generation;
      this.sourceDays.set({});
      this.calendarError.set('');
      if (id && !editing)
        void this.api
          .calendar(id, month)
          .then((result) => {
            if (generation === this.generation)
              this.sourceDays.set(Object.fromEntries(result.days.map((d) => [d.date, d.state])));
          })
          .catch((error) => {
            if (generation === this.generation) this.calendarError.set(this.api.message(error));
          });
    });
  }
  ngOnChanges(): void {
    if (!this.initializedDate && this.localDate) {
      this.initializedDate = true;
      this.month.set(this.localDate.slice(0, 7));
    }
  }

  protected readonly days = DAYS;
  protected readonly slots = weeklySlots;
  protected readonly month = signal(today().slice(0, 7));
  protected readonly groups = [
    'Adults (18–64)',
    'Older people (65+)',
    'People living with dementia',
    'People with learning disabilities',
    'People with autism',
    'People with mental health needs',
    'People with sensory impairment',
    'People with physical disability',
  ];
  protected overnight(start: string, end: string): string {
    return end < start ? ' (+1 day)' : '';
  }
  protected custom(): boolean {
    return (
      this.p.hr!.availabilityMode === 'Custom times' ||
      (!this.p.hr!.weeklySlots &&
        this.p.hr!.availability.some((a) => a.preference !== 'Unavailable'))
    );
  }
  protected mode(custom: boolean): void {
    this.p.hr!.availabilityMode = custom ? 'Custom times' : 'Weekly slots';
  }
  protected cycle(row: number, day: number): void {
    if (!this.editable) return;
    const slots = structuredClone(weeklySlots(this.p));
    const states = ['Unavailable', 'Available', 'Preferred'] as const;
    slots[row].days[day] = states[(states.indexOf(slots[row].days[day]) + 1) % 3];
    this.p.hr!.weeklySlots = slots;
    this.p.hr!.availabilityMode = 'Weekly slots';
  }
  protected copyMonday(): void {
    const slots = structuredClone(weeklySlots(this.p));
    for (const s of slots) s.days = s.days.map(() => s.days[0]);
    this.p.hr!.weeklySlots = slots;
    this.p.hr!.availabilityMode = 'Weekly slots';
  }
  protected clear(): void {
    this.p.hr!.weeklySlots = weeklySlots(this.p).map((s) => ({
      ...s,
      days: s.days.map(() => 'Unavailable'),
    }));
    this.p.hr!.availabilityMode = 'Weekly slots';
  }
  protected toggleGroup(group: string, checked: boolean): void {
    const groups = this.p.hr!.preferences.clientGroups ?? [];
    this.p.hr!.preferences.clientGroups = checked
      ? [...new Set([...groups, group])]
      : groups.filter((g) => g !== group);
  }
  protected monthLabel(): string {
    return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
      new Date(this.month() + '-01T12:00:00Z'),
    );
  }
  protected moveMonth(delta: number): void {
    const d = new Date(this.month() + '-01T12:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + delta);
    this.month.set(d.toISOString().slice(0, 7));
  }
  protected calendarWeeks() {
    const cells = this.calendar();
    while (cells.length % 7) cells.push({ date: '', day: 0, weekday: 0, state: '' });
    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  }
  protected calendar(): { date: string; day: number; weekday: number; state: string }[] {
    const first = new Date(this.month() + '-01T12:00:00Z');
    const pad = (first.getUTCDay() + 6) % 7;
    const end = new Date(first);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
    const entries = Array.from({ length: pad }, () => ({
      date: '',
      day: 0,
      weekday: 0,
      state: '',
    }));
    for (let d = 1; d <= end.getUTCDate(); d++) {
      const date = this.month() + '-' + String(d).padStart(2, '0');
      const weekday = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
      const onLeave = this.approvedLeaves.some(
        (l) =>
          l.personId === this.p.id && l.status === 'Approved' && l.start <= date && l.end >= date,
      );
      const rows = weeklySlots(this.p).map((s) => s.days[weekday]);
      const state =
        this.staffKey() && !this.editable
          ? (this.sourceDays()[date] ?? (this.calendarError() ? 'Unavailable data' : 'Loading'))
          : onLeave
            ? 'On leave'
            : this.custom()
              ? (this.p.hr!.availability.find((a) => a.day === DAYS[weekday])?.preference ??
                'Unavailable')
              : rows.includes('Preferred')
                ? 'Preferred'
                : rows.includes('Available')
                  ? 'Available'
                  : 'Unavailable';
      entries.push({ date, day: d, weekday, state });
    }
    return entries;
  }
}
