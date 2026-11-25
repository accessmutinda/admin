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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { CompanyDatePipe } from '../../../shared/pipes/company-date.pipe';
import { ModuleDesign } from '../shared/module-design';
import { CareHeader } from './care-header';
import { CareContactsApi } from './care-contacts-api.service';
import { MarReport } from './mar-report';
import { medicationInstant, medicationLocalTime } from './medication-time';
import {
  CovertAuthorityRead,
  CovertAuthorityWrite,
  MedicationMarReport,
  MedicationWitnessRead,
} from './medication.generated';
import { witnessLabel } from './medication-witness-label';
import {
  MedicationApi,
  MedicationData,
  MarRecordDraft,
  SavedMedication,
  SavedAdministration,
} from './medication-api.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { ServiceUserState } from '../shared/service-user-state';
import {
  Prescription,
  SUPPORT_LEVELS,
  MEDICATION_ROUTES,
  blankPrescription,
  medicationActive,
  weekDates,
} from './care.models';
import { addDays, londonDate } from '../rota/rota.models';
@Component({
  providers: [MedicationApi, ServiceUsersApi, CareContactsApi],
  selector: 'cv-medication',
  imports: [
    ModuleDesign,
    CareHeader,
    MarReport,
    FormsModule,
    A11yModule,
    MatMenuModule,
    MatSelectModule,
    CvSelect,
    CompanyDatePipe,
    ServiceUserState,
  ],
  host: {
    class: 'module-page operations-page',
    '[class.mar-print-authorized]': 'printReport() !== null',
  },
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
  protected readonly witnessLabel = witnessLabel;
  protected readonly api = inject(MedicationApi);
  protected readonly data = signal<MedicationData | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly fetching = signal(false);
  protected readonly exportBusy = signal(false);
  protected readonly printReport = signal<MedicationMarReport | null>(null);
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
        this.editorBaseline = '';
        this.witnessRequest.set(null);
        this.authorities.set([]);
        this.authorityChanged = false;
        this.modal.set('');
        this.fetching.set(false);
        this.saving.set(false);
        this.exportBusy.set(false);
        this.printReport.set(null);
        this.data.set(null);
        this.marMonthOverride.set('');
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
    effect((onCleanup) => {
      const reference = this.witnessReference();
      const id = this.id();
      const scope = this.api.scope();
      const readable = this.api.readable();
      let current = true;
      onCleanup(() => {
        current = false;
      });
      untracked(() => {
        this.witnessReview.set(null);
        this.witnessReviewError.set('');
        this.witnessConfirmed = false;
        this.witnessReviewBusy.set(!!(id && readable && reference));
        if (id && readable && reference) {
          void this.api
            .witnessApproval(id, reference.medication, reference.approval)
            .then(
              (value) => {
                if (current && scope === this.api.scope()) this.witnessReview.set(value);
              },
              (error: unknown) => {
                if (current) this.witnessReviewError.set(this.message(error));
              },
            )
            .finally(() => {
              if (current) this.witnessReviewBusy.set(false);
            });
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
  private readonly query = this.route.queryParamMap
    ? toSignal(this.route.queryParamMap)
    : undefined;
  protected readonly witnessReference = computed(() => {
    const query = this.query?.();
    const medication = query?.get('witnessMedication');
    const approval = query?.get('witnessApproval');
    const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
    return medication && approval && uuid.test(medication) && uuid.test(approval)
      ? { medication, approval }
      : null;
  });
  protected readonly witnessReview = signal<MedicationWitnessRead | null>(null);
  protected readonly witnessReviewError = signal('');
  protected readonly witnessReviewBusy = signal(false);
  protected witnessConfirmed = false;
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
    await this.open('medication', undefined, true);
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
  protected readonly marMonthOverride = signal('');
  protected readonly marRevision = signal(0);
  protected readonly recordTimezone = computed(() => this.data()?.timezone ?? 'Europe/London');
  protected readonly recordOutcomes = computed(() => this.data()?.outcomes ?? []);
  protected readonly marMonth = computed(
    () => this.marMonthOverride() || this.data()?.today.slice(0, 7) || '',
  );
  protected readonly marSheet = computed<'standard' | 'controlled'>(() =>
    this.sheet() === 'Controlled' ? 'controlled' : 'standard',
  );
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
  protected medicationName(id: string): string {
    const m = this.prescriptions().find((m) => m.id === id);
    return m ? m.name + ' ' + m.strength : 'Historical prescription';
  }
  protected isCurrentRecord(id: string): boolean {
    return this.records().some((a) => a.id === id);
  }
  protected reviewed: SavedAdministration | undefined;
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
  protected record: Omit<
    MarRecordDraft,
    'actualAt' | 'witnessApprovalId' | 'covertAuthorityId' | 'covertAcknowledged'
  > & {
    medicationId: string;
    correctionOf?: string;
    actualLocal: string;
  } = {
    medicationId: '',
    date: londonDate(),
    time: '08:00',
    outcome: 'Given',
    doseUnits: null,
    actualLocal: '',
    reason: '',
    response: '',
  };
  private editorBaseline = '';
  private original: SavedMedication | undefined;
  private intentKey = '';
  private intentBody = '';
  private editorScope = '';
  private sourceId = '';
  protected readonly authorities = signal<CovertAuthorityRead[]>([]);
  protected readonly authorityLabels: Record<CovertAuthorityRead['status'], string> = {
    pending: 'Pending approval',
    approved: 'Approved',
    scheduled: 'Approved, scheduled',
    expired: 'Expired',
    revoked: 'Revoked',
    review_due: 'Review overdue',
    superseded: 'Superseded',
  };
  protected authorityDraft = this.blankAuthority();
  protected authorityConfirmed = false;
  protected authorityRevoking = '';
  protected authorityRevocationReason = '';
  private authorityAcknowledgement = '';
  private authorityChanged = false;
  private readonly witnessRequest = signal<{
    snapshot: string;
    value: MedicationWitnessRead;
  } | null>(null);
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.editorDirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  canLeave(): boolean {
    return !this.editorDirty() || window.confirm('Discard the unsaved medication entry?');
  }
  private editorDirty(): boolean {
    const kind = this.modal();
    return !!kind && this.editorSnapshot(kind) !== this.editorBaseline;
  }
  private editorSnapshot(kind: string): string {
    switch (kind) {
      case 'medication': {
        const { times, weekdays, ...draft } = this.draft;
        return JSON.stringify([draft, this.timeText, [...weekdays].sort((a, b) => a - b)]);
      }
      case 'record':
        return JSON.stringify([this.record, this.authorityAcknowledgement]);
      case 'covert':
        return JSON.stringify([
          this.authorityDraft,
          this.authorityConfirmed,
          this.authorityRevocationReason,
        ]);
      case 'stock':
        return JSON.stringify([this.stockChange, this.reason]);
      case 'discontinue':
        return JSON.stringify(this.reason);
      default:
        return '';
    }
  }
  protected async open(kind: string, m?: Prescription, asNeeded = false): Promise<void> {
    if (
      this.fetching() ||
      this.saving() ||
      !(kind === 'record'
        ? this.can('create') || this.can('edit')
        : this.can(
            kind === 'covert' ? 'read' : kind === 'discontinue' ? 'archive' : m ? 'edit' : 'create',
          ))
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
      const authorities =
        fresh?.covert && (kind === 'record' || kind === 'covert')
          ? await this.api.covertAuthorities(id, fresh)
          : [];
      if (
        this.destroyed ||
        generation !== this.editorGeneration ||
        scope !== this.api.scope() ||
        id !== this.id()
      )
        return;
      if (kind === 'record' && !fresh?.requiresMar)
        throw Error('The selected prescription no longer requires a MAR record.');
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
            ...(asNeeded ? { frequency: 'PRN' as const, times: [] } : {}),
            start: this.data()?.today ?? londonDate(),
            controlled: this.sheet() === 'Controlled',
          };
      this.timeText = this.draft.times.join(', ');
      this.intentKey = '';
      this.intentBody = '';
      this.reviewed = undefined;
      this.authorities.set(authorities);
      if (kind === 'covert') {
        this.authorityDraft = this.blankAuthority();
        this.authorityConfirmed = false;
        this.authorityRevoking = '';
        this.authorityRevocationReason = '';
        this.authorityChanged = false;
      }
      if (kind === 'record') {
        const existing = !this.can('create') ? this.medicationRecords()[0] : undefined;
        this.setRecord(existing);
      }
      this.editorBaseline = this.editorSnapshot(kind);
      this.modal.set(kind);
    } catch (error) {
      if (generation === this.editorGeneration && scope === this.api.scope() && id === this.id())
        this.error.set(this.message(error));
    } finally {
      if (generation === this.editorGeneration) this.fetching.set(false);
    }
  }
  protected close(): void {
    if (!this.saving() && this.canLeave()) {
      this.editorGeneration++;
      this.fetching.set(false);
      this.editorBaseline = '';
      this.witnessRequest.set(null);
      this.modal.set('');
      this.error.set('');
      if (this.authorityChanged) {
        this.authorityChanged = false;
        void this.reload();
      }
    }
  }
  protected move(days: number): void {
    if (this.period() === 'Month') {
      const date = new Date(this.week().slice(0, 7) + '-01T12:00:00Z');
      date.setUTCMonth(date.getUTCMonth() + Math.sign(days));
      this.week.set(date.toISOString().slice(0, 10));
    } else this.week.set(addDays(this.week(), days));
  }
  protected cell(m: Prescription, date: string, time: string): SavedAdministration | undefined {
    return this.records().find(
      (a) => a.medicationId === m.id && a.date === date && a.time === time,
    );
  }
  protected async startRecord(): Promise<void> {
    const available = this.recordMedicines();
    const medication =
      available.find(
        (m) => !m.discontinuedAt && medicationActive(m, this.data()?.today ?? londonDate()),
      ) ?? available[0];
    if (medication) await this.open('record', medication);
  }
  protected chooseMedication({ source, value }: MatSelectChange): void {
    source.value = this.selectedId;
    if (value === this.selectedId || this.fetching() || this.saving()) return;
    const medication = this.recordMedicines().find((m) => m.id === value);
    if (medication && this.canLeave()) void this.open('record', medication);
  }
  private setRecord(existing?: SavedAdministration): void {
    if (existing?.outcome === 'Void') return;
    this.witnessRequest.set(null);
    this.authorityAcknowledgement = '';
    this.reviewed = existing;
    this.record = {
      medicationId: this.draft.id,
      date: existing?.date ?? this.data()?.today ?? londonDate(),
      time: existing?.time ?? this.draft.times[0] ?? '',
      outcome: existing?.outcome ?? 'Given',
      doseUnits: existing?.outcome === 'Given' ? existing.doseUnits : null,
      actualLocal: existing?.actualAt
        ? medicationLocalTime(existing.actualAt, this.recordTimezone())
        : '',
      reason: '',
      response: existing?.response ?? '',
      ...(existing ? { correctionOf: existing.id } : {}),
    };
  }
  protected medicationRecords(): SavedAdministration[] {
    return this.records().filter((a) => a.medicationId === this.selectedId && a.outcome !== 'Void');
  }
  protected chooseRecord({ source, value }: MatSelectChange): void {
    source.value = this.record.correctionOf ?? '';
    this.selectRecord(value);
  }
  protected selectRecord(id: string): void {
    if (this.fetching() || this.saving() || id === (this.record.correctionOf ?? '')) return;
    const existing = this.medicationRecords().find((a) => a.id === id);
    if ((id ? !existing || !this.can('edit') : !this.can('create')) || !this.canLeave()) return;
    this.setRecord(existing);
    this.editorBaseline = this.editorSnapshot('record');
  }
  protected toggleDay(day: number): void {
    this.draft.weekdays = this.draft.weekdays.includes(day)
      ? this.draft.weekdays.filter((d) => d !== day)
      : [...this.draft.weekdays, day];
  }
  protected recordReasonRequired(): boolean {
    return this.record.outcome !== 'Given' || !!this.record.correctionOf;
  }
  protected requiresCovertAuthority(): boolean {
    return this.draft.covert && this.record.outcome === 'Given';
  }
  private recordActualLocal(): string {
    return this.draft.frequency === 'PRN'
      ? `${this.record.date}T${this.record.time}`
      : this.record.actualLocal;
  }
  private recordActualInstant(local: string): string | null {
    const zone = this.recordTimezone();
    const previous = this.reviewed?.actualAt;
    return local && previous && medicationLocalTime(previous, zone) === local
      ? previous
      : local
        ? medicationInstant(local, zone)
        : null;
  }
  protected applicableAuthority(
    actual = this.recordActualInstant(this.recordActualLocal()),
  ): CovertAuthorityRead | undefined {
    if (!actual) return undefined;
    const instant = Date.parse(actual);
    const day = medicationLocalTime(actual, this.recordTimezone()).slice(0, 10);
    const authority = this.authorities().find(
      (item) =>
        item.approvedAt && Date.parse(item.approvedAt) <= instant && item.effectiveFrom <= day,
    );
    if (
      authority &&
      day <= authority.effectiveTo &&
      day <= authority.reviewDue &&
      (!authority.revokedAt || Date.parse(authority.revokedAt) > instant)
    )
      return authority;
    return undefined;
  }
  protected displayedAuthority(): CovertAuthorityRead | undefined {
    return (
      this.applicableAuthority() ??
      this.authorities().find((item) => item.status === 'approved') ??
      this.authorities()[0]
    );
  }
  protected acknowledgeAuthority(checked: boolean): void {
    this.authorityAcknowledgement = checked ? this.authorityAcknowledgementKey() : '';
  }
  protected hasAcknowledgedAuthority(): boolean {
    return (
      !!this.authorityAcknowledgement &&
      this.authorityAcknowledgement === this.authorityAcknowledgementKey()
    );
  }
  private authorityAcknowledgementKey(): string {
    const actual = this.recordActualInstant(this.recordActualLocal());
    const authority = this.requiresCovertAuthority() && this.applicableAuthority(actual);
    return authority ? JSON.stringify([authority.id, actual, this.record.correctionOf]) : '';
  }
  private blankAuthority(): CovertAuthorityWrite {
    return {
      decisionReference: '',
      prescriber: '',
      careLead: '',
      representative: '',
      instructions: '',
      effectiveFrom: '',
      effectiveTo: '',
      reviewDue: '',
    };
  }
  protected async transitionAuthority(
    authority: CovertAuthorityRead,
    action: 'approve' | 'revoke',
  ): Promise<void> {
    if (
      !this.original ||
      this.saving() ||
      this.fetching() ||
      this.modal() !== 'covert' ||
      !this.can('approve')
    )
      return;
    const id = this.id();
    const generation = this.editorGeneration;
    this.saving.set(true);
    this.error.set('');
    try {
      const records = await this.api.covertAuthorities(id, this.original, undefined, {
        authority,
        body:
          action === 'approve'
            ? { action, confirmed: this.authorityConfirmed }
            : { action, reason: this.authorityRevocationReason.trim() },
      });
      if (generation !== this.editorGeneration || this.destroyed) return;
      this.authorities.set(records);
      this.authorityChanged = true;
      this.authorityConfirmed = false;
      this.authorityRevoking = '';
      this.authorityRevocationReason = '';
    } catch (error) {
      if (generation === this.editorGeneration) this.error.set(this.message(error));
    } finally {
      if (generation === this.editorGeneration) this.saving.set(false);
    }
  }
  private recordDraft(): MarRecordDraft | null {
    const { actualLocal, ...draft } = this.record;
    const record: MarRecordDraft = {
      ...draft,
      doseUnits: draft.outcome === 'Given' ? draft.doseUnits : null,
    };
    if (this.recordReasonRequired() && !record.reason.trim()) {
      const message = 'Enter a reason for this outcome or correction.';
      this.fieldErrors.set({ reason: [message] });
      this.error.set(message);
      return null;
    }
    if (
      record.outcome === 'Given' &&
      (record.doseUnits === null || !Number.isFinite(record.doseUnits) || record.doseUnits < 0.001)
    ) {
      const message = 'Enter a dose quantity of at least 0.001 stock units.';
      this.fieldErrors.set({ doseUnits: [message] });
      this.error.set(message);
      return null;
    }
    if (record.outcome === 'Given') {
      const local = this.recordActualLocal();
      record.actualAt = this.recordActualInstant(local);
      if ((local || this.requiresCovertAuthority()) && !record.actualAt) {
        const message = 'Enter a valid, unambiguous actual administration date and time.';
        this.fieldErrors.set({ [this.draft.frequency === 'PRN' ? 'time' : 'actualAt']: [message] });
        this.error.set(message);
        return null;
      }
      if (this.requiresCovertAuthority()) {
        const authority = this.applicableAuthority(record.actualAt);
        if (!authority || !this.hasAcknowledgedAuthority()) {
          this.error.set(
            'Review and acknowledge the approved covert authority for the actual administration time.',
          );
          return null;
        }
        record.covertAuthorityId = authority.id;
        record.covertAcknowledged = true;
      }
    }
    return record;
  }
  protected requiresWitness(): boolean {
    return this.draft.controlled && this.record.outcome === 'Given';
  }
  protected currentWitness(): MedicationWitnessRead | null {
    const request = this.witnessRequest();
    return request?.snapshot === this.editorSnapshot('record') ? request.value : null;
  }
  protected witnessApproved(): boolean {
    const witness = this.currentWitness();
    return witness?.status === 'approved' && Date.parse(witness.expiresAt) > Date.now();
  }
  protected witnessLink(witness: MedicationWitnessRead): string {
    const link = new URL(window.location.href);
    link.search = new URLSearchParams({
      witnessMedication: witness.medicationId,
      witnessApproval: witness.id,
    }).toString();
    link.hash = '';
    return link.href;
  }
  protected async updateWitness(check: boolean): Promise<void> {
    if (!this.requiresWitness() || this.saving() || this.fetching() || !this.original) return;
    const previous = this.currentWitness();
    const draft = this.recordDraft();
    if (!draft || (check && !previous)) return;
    const snapshot = this.editorSnapshot('record');
    const generation = this.editorGeneration;
    const id = this.id();
    const scope = this.api.scope();
    this.saving.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    try {
      const value =
        check && previous
          ? await this.api.witnessApproval(id, previous.medicationId, previous.id)
          : await this.api.requestWitness(id, this.original, draft, this.reviewed);
      if (!this.destroyed && generation === this.editorGeneration && scope === this.api.scope())
        this.witnessRequest.set({ snapshot, value });
    } catch (error) {
      if (generation === this.editorGeneration && scope === this.api.scope()) {
        await this.showRecordError(error, id, generation);
      }
    } finally {
      if (generation === this.editorGeneration) this.saving.set(false);
    }
  }
  private async showRecordError(error: unknown, id: string, generation: number): Promise<void> {
    const fields = error instanceof ApiError ? error.fieldErrors : {};
    this.fieldErrors.set(fields);
    this.error.set(this.message(error));
    if (fields['witnessApprovalId'] || fields['covertAuthorityId']) this.witnessRequest.set(null);
    if (fields['covertAuthorityId'] && this.original) {
      this.authorityAcknowledgement = '';
      const records = await this.api.covertAuthorities(id, this.original).catch(() => []);
      if (!this.destroyed && generation === this.editorGeneration) this.authorities.set(records);
    }
  }
  protected async attestWitness(): Promise<void> {
    const reference = this.witnessReference();
    if (
      !reference ||
      !this.witnessReview()?.canAttest ||
      !this.witnessConfirmed ||
      this.witnessReviewBusy()
    )
      return;
    const id = this.id();
    const scope = this.api.scope();
    const current = () =>
      !this.destroyed &&
      id === this.id() &&
      scope === this.api.scope() &&
      reference === this.witnessReference();
    this.witnessReviewBusy.set(true);
    this.witnessReviewError.set('');
    try {
      const value = await this.api.witnessApproval(
        id,
        reference.medication,
        reference.approval,
        true,
      );
      if (current()) this.witnessReview.set(value);
    } catch (error) {
      if (current()) this.witnessReviewError.set(this.message(error));
    } finally {
      if (current()) this.witnessReviewBusy.set(false);
    }
  }
  protected earlierRecordVersions(): SavedAdministration[] {
    const entries = new Map(this.history().map((entry) => [entry.id, entry]));
    const history: SavedAdministration[] = [];
    let previous = this.reviewed?.correctionOf;
    while (previous) {
      const entry = entries.get(previous);
      if (!entry) break;
      history.push(entry);
      entries.delete(previous);
      previous = entry.correctionOf;
    }
    return history;
  }
  protected async save(): Promise<void> {
    const kind = this.modal();
    if (!kind || this.saving() || this.fetching()) return;
    if (this.sourceId !== this.id() || this.editorScope !== this.api.scope()) {
      this.error.set('The selected service user or workspace changed. Reopen the editor.');
      return;
    }
    const record = kind === 'record' ? this.recordDraft() : null;
    if (kind === 'record') {
      if (!record) return;
      if (this.requiresWitness()) {
        if (!this.witnessApproved()) {
          this.error.set('An eligible witness must attest before saving this controlled dose.');
          return;
        }
        record.witnessApprovalId = this.currentWitness()?.id;
      }
    }
    if (kind === 'medication')
      this.draft.times =
        this.draft.frequency === 'PRN'
          ? []
          : this.timeText
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
    const body = JSON.stringify([
      kind,
      this.draft,
      record,
      this.stockChange,
      this.reason,
      kind === 'covert' ? this.authorityDraft : null,
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
      if (kind === 'medication') await this.api.save(id, this.draft, this.original, this.intentKey);
      else if (kind === 'covert' && this.original)
        await this.api.covertAuthorities(id, this.original, {
          draft: this.authorityDraft,
          key: this.intentKey,
        });
      else if (kind === 'record' && this.original && record)
        await this.api.record(id, this.original, record, this.reviewed, this.intentKey);
      else if (this.original)
        await this.api.command(
          id,
          this.original,
          kind,
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
      this.editorBaseline = '';
      this.witnessRequest.set(null);
      this.authorityChanged = false;
      this.modal.set('');
      if (kind === 'record') this.marRevision.update((revision) => revision + 1);
      this.notice.set(
        kind === 'covert' ? 'Covert authority proposal recorded.' : 'Medication record saved.',
      );
      await this.reload();
    } catch (error) {
      if (generation === this.editorGeneration && scope === this.api.scope()) {
        await this.showRecordError(error, id, generation);
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
    const period = { month: this.marMonth(), sheet: this.marSheet() };
    let opened = false;
    try {
      await this.api.export(id, period);
      const report = await this.api.marReport(id, period.month, period.sheet);
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        id !== this.id() ||
        !this.client() ||
        this.marMonth() !== period.month ||
        this.marSheet() !== period.sheet ||
        !this.can('export')
      )
        return;
      this.printReport.set(report);
      this.changeDetector.detectChanges();
      window.print();
      opened = true;
    } catch (error) {
      if (scope === this.api.scope()) this.error.set(this.message(error));
    } finally {
      if (!opened && scope === this.api.scope()) this.clearPrintReport();
    }
  }
  @HostListener('window:afterprint')
  protected finishPrint(): void {
    if (this.printReport()) this.clearPrintReport();
  }
  private clearPrintReport(): void {
    this.printReport.set(null);
    this.exportBusy.set(false);
  }
  protected async export(scopeType: 'monthly' | 'history' = 'monthly'): Promise<void> {
    if (!this.can('export') || this.exportBusy()) return;
    this.exportBusy.set(true);
    this.notice.set('');
    this.error.set('');
    const scope = this.api.scope(),
      id = this.id();
    const period =
      scopeType === 'monthly' ? { month: this.marMonth(), sheet: this.marSheet() } : undefined;
    try {
      const blob = await this.api.export(id, period);
      if (this.destroyed || scope !== this.api.scope() || id !== this.id()) return;
      if (period && (!blob || blob.size === 0)) {
        this.notice.set(
          `No MAR administrations recorded for ${period.month} on the ${period.sheet} sheet.`,
        );
        return;
      }
      if (!blob) throw Error('The MAR export returned no file. Please try again.');
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = period
        ? `mar-${period.month}-${period.sheet}-${id}.csv`
        : `mar-history-${id}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      if (scope === this.api.scope()) this.error.set(this.message(error));
    } finally {
      if (scope === this.api.scope()) this.exportBusy.set(false);
    }
  }
}
