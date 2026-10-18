import { ukStamp } from './care.models';
import { HostListener, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { CareHeader } from './care-header';
import { CareService } from './care.service';
import {
  Administration,
  Prescription,
  SUPPORT_LEVELS,
  MEDICATION_ROUTES,
  blankPrescription,
  csv,
  medicationActive,
  medicationDue,
  weekDates,
} from './care.models';
import { addDays, londonDate } from '../rota/rota.models';
@Component({
  selector: 'cv-medication',
  imports: [ModuleDesign, CareHeader, DatePipe, FormsModule, A11yModule, MatSelectModule, CvSelect],
  host: { class: 'module-page operations-page' },
  templateUrl: './medication.html',
  styleUrls: ['./care-shared.css', './care-controls.css', './medication.css'],
})
export class Medication {
  protected readonly ukStamp = ukStamp;
  protected readonly care = inject(CareService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') ?? '');
  protected readonly client = computed(() => this.care.client(this.id()));
  protected readonly prescriptions = computed(() => this.client()?.file?.medications ?? []);
  protected readonly active = computed(() =>
    this.prescriptions().filter((m) => medicationActive(m, londonDate()) && !m.discontinuedAt),
  );
  protected readonly filter = signal('Active');
  protected readonly medicines = computed(() =>
    this.prescriptions().filter(
      (m) =>
        this.filter() === 'All' ||
        (this.filter() === 'Active'
          ? medicationActive(m, londonDate()) && !m.discontinuedAt
          : !!m.discontinuedAt),
    ),
  );
  protected readonly prn = computed(() => this.active().filter((m) => m.frequency === 'PRN'));
  protected readonly controlled = computed(() => this.active().filter((m) => m.controlled));
  protected readonly lowStock = computed(() =>
    this.active().filter((m) => m.stock !== null && m.stock <= m.lowStock),
  );
  protected readonly week = signal(londonDate());
  protected readonly period = signal('Week');
  protected readonly dates = computed(() => {
    if (this.period() === 'Week') return weekDates(this.week());
    const start = this.week().slice(0, 7) + '-01';
    const end = new Date(
      Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 0),
    ).getUTCDate();
    return Array.from({ length: end }, (_, i) => addDays(start, i));
  });
  protected setMonth(month: string): void {
    if (/^\d{4}-\d{2}$/.test(month)) {
      this.week.set(month + '-01');
      this.period.set('Month');
    }
  }
  protected readonly sheet = signal('Standard');
  protected readonly chart = computed(() =>
    this.prescriptions()
      .filter(
        (m) =>
          m.frequency !== 'PRN' &&
          m.requiresMar &&
          (this.sheet() === 'Controlled' ? m.controlled : !m.controlled),
      )
      .flatMap((m) => m.times.map((time) => ({ m, time }))),
  );
  protected readonly records = computed(() => {
    const all = this.client()?.file?.administrations ?? [];
    const corrected = new Set(all.map((a) => a.correctionOf));
    return all.filter((a) => !corrected.has(a.id));
  });
  protected readonly history = computed(() =>
    [...(this.client()?.file?.administrations ?? [])].reverse(),
  );
  protected medicationName(id: string): string {
    const m = this.prescriptions().find((m) => m.id === id);
    return m ? m.name + ' ' + m.strength : 'Historical prescription';
  }
  protected isCurrentRecord(id: string): boolean {
    return this.records().some((a) => a.id === id);
  }
  protected reviewed: Administration | undefined;
  protected readonly audit = computed(() =>
    [...(this.client()?.file?.audit ?? [])]
      .filter((a) => /prescription|medication|MAR/i.test(a.action))
      .reverse(),
  );
  protected readonly supportLevels = SUPPORT_LEVELS;
  protected readonly routes = MEDICATION_ROUTES;
  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly modal = signal('');
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected draft = blankPrescription();
  protected timeText = '08:00';
  protected reason = '';
  protected stockChange = 0;
  protected selectedId = '';
  protected record: Omit<Administration, 'id' | 'at' | 'by' | 'userId'> = {
    medicationId: '',
    date: londonDate(),
    time: '08:00',
    outcome: 'Given',
    doseUnits: 1,
    reason: '',
    response: '',
    witness: '',
  };
  private workspace = '';
  private sourceId = '';
  private version = '';
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (!!this.modal()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  canLeave(): boolean {
    return !this.modal() || window.confirm('Discard the unsaved medication entry?');
  }
  protected open(kind: string, m?: Prescription): void {
    this.workspace = this.care.store.companyId();
    this.sourceId = this.id();
    this.version = this.client()?.file?.updatedAt ?? '';
    this.error.set('');
    this.reason = '';
    this.selectedId = m?.id ?? '';
    this.stockChange = 0;
    this.draft = m ? structuredClone(m) : blankPrescription();
    this.timeText = this.draft.times.join(', ');
    this.modal.set(kind);
  }
  protected close(): void {
    if (this.canLeave()) {
      this.modal.set('');
      this.error.set('');
    }
  }
  protected move(days: number): void {
    if (this.period() === 'Month') {
      const date = new Date(this.week().slice(0, 7) + '-01T12:00:00Z');
      date.setUTCMonth(date.getUTCMonth() + Math.sign(days));
      this.week.set(date.toISOString().slice(0, 10));
    } else this.week.set(addDays(this.week(), days));
  }
  protected due(m: Prescription, date: string): boolean {
    return medicationDue(m, date);
  }
  protected cell(m: Prescription, date: string, time: string): Administration | undefined {
    return this.records().find(
      (a) => a.medicationId === m.id && a.date === date && a.time === time,
    );
  }
  protected startRecord(m: Prescription, date = londonDate(), time = m.times[0] ?? '08:00'): void {
    if (!this.care.rota.can('attendance')) return;
    this.open('record', m);
    const existing = this.cell(m, date, time);
    this.reviewed = existing;
    this.record = {
      medicationId: m.id,
      date,
      time,
      outcome: existing?.outcome ?? 'Given',
      doseUnits: existing?.doseUnits ?? 1,
      reason: '',
      response: existing?.response ?? '',
      witness: '',
      ...(existing ? { correctionOf: existing.id } : {}),
    };
  }
  protected toggleDay(day: number): void {
    this.draft.weekdays = this.draft.weekdays.includes(day)
      ? this.draft.weekdays.filter((d) => d !== day)
      : [...this.draft.weekdays, day];
  }
  protected save(): void {
    if (this.sourceId !== this.id()) {
      this.error.set('Selected service user changed. Reopen the editor.');
      return;
    }
    let error: string | null;
    if (this.modal() === 'medication') {
      this.draft.times = this.timeText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      error = this.care.saveMedication(this.id(), this.workspace, this.draft, this.version);
    } else if (this.modal() === 'record')
      error = this.care.record(this.id(), this.workspace, this.record);
    else if (this.modal() === 'stock')
      error = this.care.adjustStock(
        this.id(),
        this.workspace,
        this.selectedId,
        this.stockChange,
        this.reason,
      );
    else error = this.care.discontinue(this.id(), this.workspace, this.selectedId, this.reason);
    if (error) {
      this.error.set(error);
      return;
    }
    this.modal.set('');
    this.notice.set('Medication record saved.');
  }
  protected print(): void {
    if (this.care.rota.can('export')) window.print();
  }
  protected export(): void {
    if (!this.care.rota.can('export')) return;
    this.care.store.download(
      'medication-and-mar.csv',
      csv([
        [
          'Medication',
          'Strength',
          'Dose',
          'Route',
          'Date',
          'Time',
          'Outcome',
          'Recorded by',
          'Reason',
          'Response',
          'Witness',
          'Record ID',
          'Correction of',
          'Recorded at',
        ],
        ...(this.client()?.file?.administrations ?? []).map((a) => {
          const m = this.prescriptions().find((m) => m.id === a.medicationId);
          return [
            m?.name,
            m?.strength,
            m?.dose,
            m?.route,
            a.date,
            a.time,
            a.outcome,
            a.by,
            a.reason,
            a.response,
            a.witness,
            a.id,
            a.correctionOf,
            a.at,
          ];
        }),
      ]),
      'text/csv',
    );
  }
}
