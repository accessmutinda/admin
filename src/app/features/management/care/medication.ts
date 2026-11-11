import { ApiError } from '../../../core/auth/auth-api';
import { ukStamp } from './care.models';
import {
  HostListener,
  Component,
  computed,
  inject,
  signal,
  effect,
  untracked,
  DestroyRef,
  ChangeDetectorRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { CareHeader } from './care-header';
import {
  MedicationApi,
  MedicationData,
  SavedMedication,
  SavedAdministration,
} from './medication-api.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CompanyUnavailable } from '../shared/company-unavailable';
import { PageLoading } from '../../../shared/layouts/page-loading';
import {
  Administration,
  Prescription,
  SUPPORT_LEVELS,
  MEDICATION_ROUTES,
  blankPrescription,
  medicationActive,
  medicationDue,
  weekDates,
} from './care.models';
import { addDays, londonDate } from '../rota/rota.models';
@Component({
  providers: [MedicationApi, ServiceUsersApi],
  selector: 'cv-medication',
  imports: [
    ModuleDesign,
    CareHeader,
    DatePipe,
    FormsModule,
    A11yModule,
    MatSelectModule,
    CvSelect,
    CompanyUnavailable,
    PageLoading,
  ],
  host: { class: 'module-page operations-page' },
  templateUrl: './medication.html',
  styleUrls: [
    './service-user-spacing.css',
    './care-shared.css',
    './care-controls.css',
    './medication.css',
    './medication-layout.css',
    './medication-information.css',
  ],
})
export class Medication {
  protected readonly ukStamp = ukStamp;
  protected readonly api = inject(MedicationApi);
  protected readonly data = signal<MedicationData | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly fetching = signal(false);
  protected readonly exportBusy = signal(false);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private generation = 0;
  private editorGeneration = 0;
  private destroyed = false;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
      this.editorGeneration++;
    });
    effect(() => {
      const scope = this.api.scope(),
        id = this.id(),
        allowed = this.api.readable();
      untracked(() => {
        this.editorGeneration++;
        this.modal.set('');
        this.fetching.set(false);
        this.saving.set(false);
        this.exportBusy.set(false);
        this.data.set(null);
        this.notice.set('');
        this.error.set('');
        if (id && allowed) {
          void this.reload();
        } else {
          this.generation++;
          this.loading.set(false);
        }
      });
    });
  }
  protected async reload(): Promise<void> {
    const generation = ++this.generation,
      scope = this.api.scope(),
      id = this.id();
    this.loading.set(true);
    this.error.set('');
    if (this.api.records.selected()?.id !== id) void this.api.records.detail(id);
    try {
      const value = await this.api.load(id);
      if (
        !this.destroyed &&
        generation === this.generation &&
        scope === this.api.scope() &&
        id === this.id()
      ) {
        this.data.set(value);
      }
    } catch (error) {
      if (!this.destroyed && generation === this.generation) {
        this.data.set(null);
        this.error.set(this.message(error));
      }
    } finally {
      if (!this.destroyed && generation === this.generation) this.loading.set(false);
    }
  }
  protected can(action: string): boolean {
    return this.api.can(action);
  }
  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'The medication record could not be saved.';
  }
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') ?? '');
  protected readonly client = computed(() =>
    this.api.records.selected()?.id === this.id() && this.data()
      ? this.api.records.selected()
      : null,
  );
  protected readonly prescriptions = computed(() => this.data()?.prescriptions ?? []);
  protected readonly active = computed(() =>
    this.prescriptions().filter(
      (m) => medicationActive(m, this.data()?.today ?? londonDate()) && !m.discontinuedAt,
    ),
  );
  protected readonly filter = signal('Active');
  protected readonly medicines = computed(() =>
    this.prescriptions().filter(
      (m) =>
        (this.sheet() === 'Controlled' ? m.controlled : !m.controlled) &&
        (this.filter() === 'All' ||
          (this.filter() === 'Active'
            ? medicationActive(m, this.data()?.today ?? londonDate()) && !m.discontinuedAt
            : !!m.discontinuedAt)),
    ),
  );
  protected readonly covert = computed(() => this.active().filter((m) => m.covert));
  protected async addPrn(): Promise<void> {
    await this.open('medication');
    this.draft.frequency = 'PRN';
    this.timeText = '';
    this.draft.controlled = this.sheet() === 'Controlled';
  }
  protected readonly recordMedicines = computed(() =>
    this.prescriptions().filter(
      (m) =>
        m.requiresMar &&
        (this.can('create') ||
          this.records().some((a) => a.medicationId === m.id && a.outcome !== ('Void' as string))),
    ),
  );
  protected readonly previewRecordAvailable = computed(() => this.recordMedicines().length > 0);
  protected readonly prn = computed(() => this.active().filter((m) => m.frequency === 'PRN'));
  protected readonly controlled = computed(() => this.active().filter((m) => m.controlled));
  protected readonly supported = computed(() =>
    this.active().filter((m) => m.support !== 'Self-administers'),
  );
  protected supportIcon(support: string): string {
    return (
      (
        { Prompt: 'chat_bubble', Support: 'handshake', Administer: 'back_hand' } as Record<
          string,
          string
        >
      )[support] || 'person'
    );
  }
  protected supportDescription(support: string): string {
    return (
      (
        {
          Prompt: 'Remind user to take medication.',
          Support: 'Assist with preparation or access.',
          Administer: 'Care worker gives medication.',
        } as Record<string, string>
      )[support] || 'User manages their own medication.'
    );
  }
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
  protected readonly previewMedicationId = signal('');
  protected readonly previewMedicines = computed(() =>
    this.active().filter(
      (m) =>
        m.requiresMar &&
        m.frequency !== 'PRN' &&
        (this.sheet() === 'Controlled' ? m.controlled : !m.controlled),
    ),
  );
  protected readonly previewMedication = computed(
    () =>
      this.previewMedicines().find((m) => m.id === this.previewMedicationId()) ??
      this.previewMedicines()[0],
  );
  protected readonly previewDates = computed(() =>
    Array.from({ length: 4 }, (_, i) => addDays(this.data()?.today ?? londonDate(), i)),
  );
  protected readonly records = computed(() => {
    const all = this.data()?.administrations ?? [];
    const corrected = new Set(all.map((a) => a.correctionOf));
    return all.filter((a) => !corrected.has(a.id));
  });
  protected readonly history = computed(() => [...(this.data()?.administrations ?? [])].reverse());
  protected recorderInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
  }
  protected outcomeCode(outcome: string | undefined): string {
    return (
      ({ Given: 'G', Refused: 'R', Omitted: 'O', Absent: 'A' } as Record<string, string>)[
        outcome ?? ''
      ] || ''
    );
  }
  protected medicationName(id: string): string {
    const m = this.prescriptions().find((m) => m.id === id);
    return m ? m.name + ' ' + m.strength : 'Historical prescription';
  }
  protected isCurrentRecord(id: string): boolean {
    return this.records().some((a) => a.id === id);
  }
  protected reviewed: Administration | undefined;
  protected readonly audit = computed(() => this.data()?.audit ?? []);
  protected readonly supportLevels = SUPPORT_LEVELS;
  protected readonly routes = MEDICATION_ROUTES;
  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly modal = signal('');
  protected readonly error = signal('');
  protected readonly fieldErrors = signal<Record<string, string[]>>({});
  protected fieldError(name: string): string {
    return this.fieldErrors()[name === 'stockChange' ? 'amount' : name]?.join(' ') ?? '';
  }
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
  private original: SavedMedication | undefined;
  private intentKey = '';
  private intentBody = '';
  private editorScope = '';
  private sourceId = '';
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
  protected async open(kind: string, m?: Prescription): Promise<void> {
    if (
      this.fetching() ||
      this.saving() ||
      !(kind === 'record'
        ? this.can('create') || this.can('edit')
        : this.can(kind === 'discontinue' ? 'archive' : m ? 'edit' : 'create'))
    )
      return;
    const generation = ++this.editorGeneration,
      scope = this.api.scope(),
      id = this.id();
    this.fetching.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    try {
      const fresh = m ? await this.api.detail(id, m.id) : undefined;
      if (
        this.destroyed ||
        generation !== this.editorGeneration ||
        scope !== this.api.scope() ||
        id !== this.id()
      )
        return;
      this.sourceId = id;
      this.editorScope = scope;
      this.original = fresh;
      this.reason = '';
      this.selectedId = fresh?.id ?? '';
      this.stockChange = 0;
      this.draft = fresh
        ? structuredClone(fresh)
        : {
            ...blankPrescription(),
            start: this.data()?.today ?? londonDate(),
            controlled: this.sheet() === 'Controlled',
          };
      this.timeText = this.draft.times.join(', ');
      this.intentKey = '';
      this.intentBody = '';
      this.reviewed = undefined;
      this.modal.set(kind);
    } catch (error) {
      if (generation === this.editorGeneration) this.error.set(this.message(error));
    } finally {
      if (generation === this.editorGeneration) this.fetching.set(false);
    }
  }
  protected close(): void {
    if (!this.saving() && this.canLeave()) {
      this.editorGeneration++;
      this.fetching.set(false);
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
  protected async startRecord(m?: Prescription, date?: string, time?: string): Promise<void> {
    const available = this.recordMedicines();
    m ??=
      available.find(
        (m) => !m.discontinuedAt && medicationActive(m, this.data()?.today ?? londonDate()),
      ) ?? available[0];
    if (!m) return;
    await this.open('record', m);
    if (this.modal() !== 'record' || this.draft.id !== m.id) return;
    const existing = !this.can('create')
      ? this.records().find((a) => a.medicationId === m.id && a.outcome !== ('Void' as string))
      : undefined;
    this.setRecord(
      existing?.date ?? date ?? this.data()?.today ?? londonDate(),
      existing?.time ?? time ?? m.times[0] ?? '08:00',
      existing,
    );
  }
  protected chooseMedication(id: string): void {
    void this.startRecord(this.prescriptions().find((m) => m.id === id));
  }
  private setRecord(date: string, time: string, existing?: Administration): void {
    this.reviewed = existing;
    this.record = {
      medicationId: this.draft.id,
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
  protected medicationRecords(): Administration[] {
    return this.records().filter(
      (a) => a.medicationId === this.selectedId && a.outcome !== ('Void' as string),
    );
  }
  protected selectRecord(id: string): void {
    const existing = this.records().find((a) => a.id === id && a.medicationId === this.selectedId);
    if ((existing && !this.can('edit')) || (!existing && !this.can('create'))) return;
    this.setRecord(
      existing?.date ?? this.data()?.today ?? londonDate(),
      existing?.time ?? this.draft.times[0] ?? '08:00',
      existing,
    );
  }
  protected toggleDay(day: number): void {
    this.draft.weekdays = this.draft.weekdays.includes(day)
      ? this.draft.weekdays.filter((d) => d !== day)
      : [...this.draft.weekdays, day];
  }
  protected async save(): Promise<void> {
    if (this.saving()) return;
    if (this.sourceId !== this.id() || this.editorScope !== this.api.scope()) {
      this.error.set('The selected service user or workspace changed. Reopen the editor.');
      return;
    }
    if (this.modal() === 'medication')
      this.draft.times =
        this.draft.frequency === 'PRN'
          ? []
          : this.timeText
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
    const body = JSON.stringify([
      this.modal(),
      this.draft,
      this.record,
      this.stockChange,
      this.reason,
    ]);
    if (body !== this.intentBody) {
      this.intentBody = body;
      this.intentKey = crypto.randomUUID();
    }
    const generation = this.editorGeneration,
      id = this.id(),
      scope = this.api.scope();
    this.saving.set(true);
    this.error.set('');
    try {
      if (this.modal() === 'medication')
        await this.api.save(id, this.draft, this.original, this.intentKey);
      else if (this.modal() === 'record' && this.original)
        await this.api.record(
          id,
          this.original,
          this.record,
          this.reviewed as SavedAdministration | undefined,
          this.intentKey,
        );
      else if (this.original)
        await this.api.command(
          id,
          this.original,
          this.modal(),
          this.reason,
          this.stockChange,
          this.intentKey,
        );
      if (
        this.destroyed ||
        generation !== this.editorGeneration ||
        scope !== this.api.scope() ||
        id !== this.id()
      )
        return;
      this.modal.set('');
      this.notice.set('Medication record saved.');
      await this.reload();
    } catch (error) {
      if (generation === this.editorGeneration && scope === this.api.scope()) {
        this.fieldErrors.set(error instanceof ApiError ? error.fieldErrors : {});
        this.error.set(this.message(error));
      }
    } finally {
      if (generation === this.editorGeneration) this.saving.set(false);
    }
  }
  protected async print(): Promise<void> {
    if (!this.can('export') || this.exportBusy()) return;
    this.exportBusy.set(true);
    const scope = this.api.scope(),
      id = this.id();
    try {
      await this.api.export(id);
      await this.reload();
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        id !== this.id() ||
        !this.data() ||
        !this.can('export')
      )
        return;
      this.changeDetector.detectChanges();
      window.print();
    } catch (error) {
      if (scope === this.api.scope()) this.error.set(this.message(error));
    } finally {
      if (scope === this.api.scope()) this.exportBusy.set(false);
    }
  }
  protected async export(): Promise<void> {
    if (!this.can('export') || this.exportBusy()) return;
    this.exportBusy.set(true);
    const scope = this.api.scope(),
      id = this.id();
    try {
      const blob = await this.api.export(id);
      if (this.destroyed || scope !== this.api.scope() || id !== this.id()) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = 'medication-and-mar.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      if (scope === this.api.scope()) this.error.set(this.message(error));
    } finally {
      if (scope === this.api.scope()) this.exportBusy.set(false);
    }
  }
}
