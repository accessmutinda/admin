import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NgTemplateOutlet } from '@angular/common';
import { ServiceUserOverviewDialog, OverviewCard } from './service-user-overview-dialog';
import { ServiceUsersApi, DirectoryUser } from './service-users-api.service';
import { ServiceUserState } from '../shared/service-user-state';
import { ServiceUserDirectory } from '../care/service-user-directory';
import { ClientOverview } from './client-overview';
import { CareHeader } from '../care/care-header';
import { age, validDate } from '../care/care.models';
import { ApiError } from '../../../core/auth/auth-api';
import { ModuleDesign } from '../shared/module-design';
import {
  HostListener,
  TemplateRef,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  computed,
  effect,
  untracked,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ToastService } from '../../../shared/ui/toast.service';
import { RotaService } from '../rota/rota.service';
import { callIconSrc } from '../rota/call-icons';
import { RISK_FLAGS, RotaCall, RotaClient, completedVisit, londonDate } from '../rota/rota.models';
import { AccessRequired } from '../shared/access-required';
import { ManagementStore } from '../shared/management.store';
import {
  CLIENT_SECTIONS,
  CLIENT_SECTION_GROUPS,
  GENDER_OPTIONS,
  PERSONAL_FIELDS,
  SEXUALITY_OPTIONS,
  SEXUALITY_OTHER,
  ClientEntry,
  emptyClientFile,
  joinSexuality,
  sexualityLabel,
  splitSexuality,
} from './client-file.models';

const RECORD_SECTIONS = [
  'diagnoses',
  'risks',
  'moving',
  'capacity',
  'consent',
  'medication',
  'allergies',
  'access',
  'tasks',
  'support',
  'documents',
];

const PROFILE_FIELD_LABELS: Record<string, string> = {
  name: 'Full name',
  reference: 'Client reference',
  address: 'Address',
  postcode: 'Postcode',
  phone: 'Phone',
  email: 'Email',
  funding: 'Funding',
  fundingName: 'Funding name',
  sexualityName: 'Sexuality option',
  genderName: 'Gender option',
  priority: 'Care priority',
  active: 'Record status',
  photo: 'Profile photo',
  photo_id: 'Profile photo',
  riskFlags: 'Care alerts',
  'representative.name': 'Contact name',
  'representative.relationship': 'Relationship',
  'representative.phone': 'Contact phone',
  'representative.email': 'Contact email',
  'primary_gp.name': 'GP practice',
  'primary_gp.phone': 'GP telephone',
  ...Object.fromEntries(PERSONAL_FIELDS.map((field) => ['details.' + field.key, field.label])),
};

@Component({
  selector: 'cv-client-files',
  providers: [ServiceUsersApi],
  imports: [
    NgTemplateOutlet,
    ServiceUserState,
    ModuleDesign,
    ServiceUserDirectory,
    ClientOverview,
    CareHeader,
    DatePipe,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AccessRequired,
  ],
  host: { class: 'module-page operations-page clients-page' },
  templateUrl: './client-files.html',
  styleUrls: [
    './client-files.css',
    './client-record.css',
    './client-enhancements.css',
    './client-profile-editor.css',
  ],
})
export class ClientFiles {
  protected readonly api = inject(ServiceUsersApi);
  protected readonly service = inject(RotaService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly fieldErrors = signal<Record<string, string>>({});
  @ViewChild('profileEditor') private profileEditor!: TemplateRef<unknown>;
  private readonly dialogs = inject(MatDialog);
  private profileDialog?: MatDialogRef<unknown>;
  private overviewDialog?: MatDialogRef<ServiceUserOverviewDialog>;
  protected readonly profileDialogOpen = signal(false);
  protected readonly photoOnly = signal(false);
  private profileScope = '';
  private original: DirectoryUser | null = null;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.profileDialog?.close();
      this.overviewDialog?.close();
    });
    effect(() => {
      this.api.selected()?.version;
      this.id();
      untracked(() => {
        this.accessCode.set('');
        this.showCode.set(false);
        this.printSnapshot.set(null);
      });
    });
    effect(() => {
      const scope = this.api.scope(),
        id = this.id();
      untracked(() => {
        this.profileDialog?.close();
        this.overviewDialog?.close();
        this.profileDialogOpen.set(false);
        this.photoOnly.set(false);
        this.editing.set('');
        this.error.set('');
        this.fieldErrors.set({});
        this.photoLoading.set(false);
        this.draft = this.blankClient();
        this.original = null;
        if (id)
          void this.api.detail(id).then(() => {
            if (
              scope === this.api.scope() &&
              id === this.id() &&
              this.client() &&
              this.route.snapshot.queryParamMap.get('edit') === 'profile' &&
              this.api.access.can('care', 'records', 'edit')
            )
              this.openProfileDialog();
          });
      });
    });
  }
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly store = inject(ManagementStore);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly destroyRef = inject(DestroyRef);
  ngOnInit(): void {
    this.route.queryParamMap?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (!this.editing())
        this.setSection(
          this.sections.some((section) => section.key === params.get('section'))
            ? params.get('section')!
            : 'overview',
        );
    });
    if (
      this.route.snapshot.queryParamMap.get('edit') === 'profile' &&
      this.client() &&
      this.api.access.can('care', 'records', 'edit')
    )
      this.openProfileDialog();
  }
  protected readonly id = computed(() => this.params().get('id'));
  protected readonly client = computed(() =>
    this.api.selected()?.id === this.id() ? this.api.selected()! : undefined,
  );
  protected readonly file = computed(() => this.client()?.file ?? emptyClientFile());
  protected get today(): string {
    return (
      this.client()?.overview?.local_date ??
      this.api.summary()?.local_date ??
      this.api.directory()?.meta.local_date ??
      londonDate()
    );
  }
  protected readonly age = age;
  protected readonly photoLoading = signal(false);
  protected readonly timeSensitive = computed(() => this.api.summary()?.time_sensitive ?? '—');
  protected readonly capacityAlerts = computed(() => this.api.summary()?.capacity_reviews ?? '—');
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.editing() || this.photoLoading()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  canLeave(): boolean {
    return (
      (!this.editing() && !this.photoLoading()) ||
      window.confirm('Discard the unsaved client record?')
    );
  }
  protected openProfileDialog(photoOnly = false): void {
    if (
      !this.client() ||
      !this.api.access.can('care', 'records', 'edit') ||
      this.profileDialogOpen()
    )
      return;
    this.startProfile();
    this.photoOnly.set(photoOnly);
    this.profileDialogOpen.set(true);
    const ref = this.dialogs.open(this.profileEditor, {
      width: photoOnly ? '560px' : '960px',
      panelClass: [
        'service-user-dialog',
        photoOnly ? 'service-user-photo-dialog' : 'service-user-profile-dialog',
      ],
      backdropClass: 'service-user-dialog-backdrop',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: '90vh',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      disableClose: true,
      ariaLabel: photoOnly ? 'Edit profile photo' : 'Edit client details',
    });
    this.profileDialog = ref;
    const cancel = () => {
      if (!this.api.saving() && !this.photoLoading() && window.confirm('Discard unsaved changes?'))
        this.discard();
    };
    ref.backdropClick().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(cancel);
    ref
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.key === 'Escape') cancel();
      });
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.profileDialog === ref) {
          this.profileDialog = undefined;
          this.profileDialogOpen.set(false);
          this.photoOnly.set(false);
          this.editing.set('');
          this.fieldErrors.set({});
          this.error.set('');
        }
      });
  }
  protected editOverviewSection(key: string, goalId?: string): void {
    if (key === 'details') {
      this.openProfileDialog();
      return;
    }
    const person = this.api.selected();
    if (!person?.overview) return;
    if (['plan', 'goal'].includes(key)) {
      if (!this.api.access.can('care', 'planning', key === 'goal' && !goalId ? 'create' : 'edit'))
        return;
    } else if (!this.api.access.can('care', 'records', 'edit')) return;
    const card = key as OverviewCard;
    if (
      ![
        'health',
        'support',
        'communication',
        'preferences',
        'contact',
        'demographics',
        'family',
        'plan',
        'goal',
      ].includes(card)
    )
      return;
    this.overviewDialog = this.dialogs.open(ServiceUserOverviewDialog, {
      width: '800px',
      panelClass: ['service-user-dialog', 'service-user-card-dialog'],
      backdropClass: 'service-user-dialog-backdrop',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: '90vh',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      data: { card, goalId, person: structuredClone(person), api: this.api },
    });
  }
  protected preferredStaff(): string[] {
    return (this.values['preferredStaff'] ?? '').split(',').filter(Boolean);
  }
  protected setPreferredStaff(ids: string[]): void {
    this.values['preferredStaff'] = ids.join(',');
  }
  protected staffChoices() {
    return this.workspaceSection('support')?.staff_choices ?? [];
  }
  protected async uploadPhoto(event: Event): Promise<void> {
    this.clearFieldError('photo');
    const input = event.target as HTMLInputElement,
      photo = input.files?.[0];
    input.value = '';
    if (!photo) return;
    if (
      !['image/png', 'image/jpeg'].includes(photo.type) ||
      photo.size <= 0 ||
      photo.size > 1024 * 1024
    ) {
      this.showFieldErrors({ photo: 'Choose a nonempty JPEG or PNG up to 1 MB.' });
      return;
    }
    const draft = this.draft;
    const workspace = this.api.scope();
    this.photoLoading.set(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read photo.'));
        reader.readAsDataURL(photo);
      });
      if (this.editing() !== 'profile' || this.draft !== draft || workspace !== this.api.scope())
        return;
      draft.file!.photo = data;
    } catch {
      this.showFieldErrors({ photo: 'Could not read photo. Try again.' });
    } finally {
      this.photoLoading.set(false);
    }
  }
  protected readonly sections = CLIENT_SECTIONS;
  protected readonly sectionGroups = computed(() =>
    CLIENT_SECTION_GROUPS.map((group) => ({
      label: group.label,
      sections: group.keys
        .filter((key) =>
          key === 'plan'
            ? this.canPlan('read')
            : !RECORD_SECTIONS.includes(key) || this.canSectionAction('read', key),
        )
        .map((key) => CLIENT_SECTIONS.find((section) => section.key === key)!),
    })),
  );
  protected readonly allergyRecords = computed(() => this.file().entries['allergies'] ?? []);
  protected readonly activeAllergies = computed(() =>
    this.allergyRecords().filter((entry) => entry.status === 'Active'),
  );
  protected readonly medicationRecords = computed(() => [
    ...(this.file().entries['medication'] ?? []),
    ...(this.file().medications ?? [])
      .filter((m) => !m.discontinuedAt && m.start <= this.today && (!m.end || m.end >= this.today))
      .map((m) => ({
        id: m.id,
        name: m.name + ' ' + m.strength,
        detail: m.dose + ' · ' + m.route + ' · ' + m.times.join(', '),
        date: m.start,
        level: 'Medium' as const,
        status: 'Active' as const,
      })),
  ]);
  protected readonly activeMedication = computed(() =>
    this.medicationRecords().filter((entry) => entry.status === 'Active'),
  );
  protected hasSectionDetails(key: string): boolean {
    return Object.values(this.file().sections[key] ?? {}).some(
      (value) => value.trim() && value !== 'Not recorded',
    );
  }
  protected reviewState(client: RotaClient): { label: string; tone: string } {
    const date = this.review(client);
    if (!date) return { label: 'Not recorded', tone: 'neutral' };
    if (date < this.today) return { label: 'Overdue', tone: 'danger' };
    if (date === this.today) return { label: 'Due today', tone: 'warning' };
    const days =
      (Date.parse(date + 'T00:00:00Z') - Date.parse(this.today + 'T00:00:00Z')) / 86400000;
    return days <= 30
      ? { label: 'Due soon', tone: 'warning' }
      : { label: 'Scheduled', tone: 'info' };
  }
  protected canPlan(action: 'read' | 'edit' | 'create'): boolean {
    const plan = this.client()?.overview?.care_plan;
    return (
      !!plan &&
      this.api.access.can('care', 'planning', action) &&
      (action === 'create' ? plan.can_create_goal : action === 'edit' ? plan.can_edit : true)
    );
  }
  protected readonly personalFields = PERSONAL_FIELDS;
  protected readonly fundingAdd = '__add_funding__';
  protected readonly fundingOptions = signal(['Local authority', 'Private', 'NHS']);
  protected fundingChoice = 'Local authority';
  protected fundingName = '';
  protected readonly fundingBusy = signal(false);
  private fundingLoad = 0;
  protected readonly sexualityOther = SEXUALITY_OTHER;
  protected readonly sexualityLabel = sexualityLabel;
  protected readonly genderAdd = '__add_gender__';
  protected readonly genderOptions = signal([...GENDER_OPTIONS]);
  protected genderChoice = '';
  protected genderName = '';
  private genderLoad = 0;
  protected readonly sexualityAdd = '__add_sexuality__';
  protected readonly sexualityOptions = signal([...SEXUALITY_OPTIONS]);
  protected sexualityChoice = '';
  protected sexualityDetail = '';
  protected sexualityName = '';
  private sexualityBaseline = '';
  private sexualityLoad = 0;
  protected readonly riskFlags = RISK_FLAGS;
  protected readonly sectionKey = signal(
    CLIENT_SECTIONS.some(
      (section) => section.key === this.route.snapshot.queryParamMap.get('section'),
    )
      ? this.route.snapshot.queryParamMap.get('section')!
      : 'overview',
  );
  protected readonly section = computed(() =>
    this.sections.find((s) => s.key === this.sectionKey())!,
  );
  protected readonly query = signal('');
  protected readonly status = signal('All');
  protected readonly editing = signal('');
  protected readonly error = signal('');
  protected readonly showCode = signal(false);
  protected readonly accessCode = signal('');
  protected readonly accessCodeLoading = signal(false);
  protected readonly printSnapshot = signal<DirectoryUser | null>(null);
  protected readonly printBusy = signal(false);
  protected readonly clients = computed(() =>
    this.service
      .data()
      .clients.filter(
        (c) =>
          (this.status() === 'All' || c.active === (this.status() === 'Active')) &&
          `${c.name} ${c.reference} ${c.postcode} ${c.address}`
            .toLowerCase()
            .includes(this.query().trim().toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  protected readonly active = computed(() => this.api.summary()?.active ?? '—');
  protected readonly reviews = computed(() => null);
  protected readonly highRisk = computed(
    () => this.api.summary()?.high_risk ?? this.api.summary()?.high_priority ?? '—',
  );
  protected readonly callIconSrc = callIconSrc;
  protected readonly calls = computed<Partial<RotaCall>[]>(() =>
    this.client()?.overview
      ? this.client()!.overview!.record.packages.map((call) => ({ ...call, active: true }))
      : this.service.data().calls.filter((c) => c.clientId === this.id()),
  );
  protected readonly visits = computed(() => this.client()?.overview?.workspace.visits ?? []);
  protected readonly entries = computed(() => this.file().entries[this.sectionKey()] ?? []);
  protected readonly activeRisks = computed(() =>
    (this.file().entries['risks'] ?? []).filter((r) => r.status === 'Active'),
  );
  protected readonly completedTasks = computed(
    () => (this.file().entries['tasks'] ?? []).filter((r) => r.status === 'Completed').length,
  );
  protected readonly completedVisit = (visit: { state: string }): boolean =>
    visit.state === 'Completed';
  protected draft: RotaClient = this.blankClient();
  protected gpPractice = '';
  protected gpPhone = '';
  protected values: Record<string, string> = {};
  protected entry: ClientEntry = this.blankEntry();
  protected sourceId = '';
  private sourceWorkspace = '';
  protected updatedAt(): string {
    return this.file().updatedAt
      ? new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London',
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(this.file().updatedAt))
      : '';
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
  }
  protected review(c: RotaClient): string {
    return c.file?.sections['plan']?.['review'] ?? '';
  }
  protected reviewDue(c: RotaClient): boolean {
    return !!this.review(c) && this.review(c) <= this.today;
  }
  protected count(c: RotaClient): number {
    return this.service.data().calls.filter((call) => call.clientId === c.id && call.active).length;
  }
  protected value(key: string): string {
    if (this.sectionKey() === 'access' && key === 'code') return this.accessCode();
    return this.fieldValue(this.client(), this.sectionKey(), key);
  }
  protected selectWorkspaceSection(key: string): void {
    if (this.editing()) return;
    if (key === 'plan') {
      void this.router.navigate(['/manage/care-plans', this.client()!.id]);
      return;
    }
    this.setSection(key);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: key === 'plan' ? 'plan' : null, edit: null },
      queryParamsHandling: 'merge',
    });
  }
  protected setSection(key: string): void {
    this.sectionKey.set(key);
    this.showCode.set(false);
    this.accessCode.set('');
  }
  protected discard(): void {
    if (this.api.saving()) return;
    this.editing.set('');
    this.error.set('');
    this.fieldErrors.set({});
    this.profileDialog?.close();
  }
  private blankEntry(): ClientEntry {
    return {
      id: crypto.randomUUID(),
      name: '',
      detail: '',
      date: londonDate(),
      level: 'Medium',
      status: 'Active',
    };
  }
  private blankClient(): RotaClient {
    return {
      id: crypto.randomUUID(),
      name: '',
      reference: '',
      address: '',
      postcode: '',
      funding: 'Local authority',
      priority: 'Standard',
      active: true,
      phone: '',
      email: '',
      riskFlags: [],
      representative: { name: '', relationship: '', phone: '', email: '' },
      file: emptyClientFile(),
    };
  }
  protected startProfile(create = false): void {
    if (create) {
      this.photoOnly.set(false);
      this.profileDialogOpen.set(false);
    }
    this.draft = create ? this.blankClient() : structuredClone(this.client()!);
    this.draft.file ??= emptyClientFile();
    this.draft.representative ??= { name: '', relationship: '', phone: '', email: '' };
    this.sourceId = create ? '' : this.draft.id;
    this.sourceWorkspace = this.api.companyId();
    this.profileScope = this.api.scope();
    this.original = create ? null : this.api.selected();
    this.gpPractice = this.original?.overview?.primary_gp?.name ?? '';
    this.gpPhone = this.original?.overview?.primary_gp?.phone ?? '';
    this.loadSexuality();
    this.sexualityName = '';
    void this.loadSexualityOptions();
    this.genderChoice = this.draft.file?.details['gender'] ?? '';
    this.genderName = '';
    void this.loadGenderOptions();
    this.fundingChoice = this.draft.funding || 'Local authority';
    this.fundingName = '';
    void this.loadFunding();
    this.error.set('');
    this.fieldErrors.set({});
    this.editing.set('profile');
  }
  protected editSection(): void {
    if (RECORD_SECTIONS.includes(this.sectionKey())) {
      this.openRecordDialog(this.sectionKey());
      return;
    }
    if (this.sectionKey() === 'family' || this.sectionKey() === 'plan') {
      this.editOverviewSection(this.sectionKey());
      return;
    }
    this.sourceId = this.id()!;
    this.sourceWorkspace = this.store.companyId();
    this.values = structuredClone(this.file().sections[this.sectionKey()] ?? {});
    this.error.set('');
    this.editing.set('section');
  }
  protected editEntry(entry?: ClientEntry): void {
    if (RECORD_SECTIONS.includes(this.sectionKey())) {
      this.openRecordDialog(this.sectionKey(), entry?.id ?? null);
      return;
    }
    if (this.sectionKey() === 'plan') {
      this.editOverviewSection('goal', entry?.id);
      return;
    }
    this.sourceId = this.id()!;
    this.sourceWorkspace = this.store.companyId();
    this.entry = entry ? structuredClone(entry) : this.blankEntry();
    this.error.set('');
    this.editing.set('entry');
  }
  private async loadFunding(): Promise<void> {
    const scope = this.profileScope;
    const request = ++this.fundingLoad;
    try {
      const list = await this.api.fundingOptions();
      if (
        request !== this.fundingLoad ||
        scope !== this.api.scope() ||
        this.editing() !== 'profile'
      )
        return;
      const names = list.options.map((option) => option.name);
      const current = this.draft.funding;
      if (current && !names.some((name) => name.toLowerCase() === current.toLowerCase()))
        names.push(current);
      this.fundingOptions.set(names);
      if (this.fundingChoice === this.fundingAdd) return;
      const selected = this.fundingChoice || current;
      const match = names.find((name) => name.toLowerCase() === selected.toLowerCase());
      this.fundingChoice = match ?? names[0] ?? '';
      if (this.fundingChoice) this.draft.funding = this.fundingChoice;
    } catch {
      if (request !== this.fundingLoad || scope !== this.api.scope()) return;
    }
  }
  protected setFunding(value: string): void {
    this.fundingChoice = value;
    if (value !== this.fundingAdd) {
      this.draft.funding = value;
      this.fundingName = '';
    }
    this.clearFieldError('funding');
    this.clearFieldError('fundingName');
  }
  protected setFundingName(value: string): void {
    this.fundingName = value;
    this.clearFieldError('fundingName');
  }
  private async chosenFunding(scope: string): Promise<string> {
    if (this.fundingChoice !== this.fundingAdd) return this.fundingChoice;
    const name = this.fundingName.trim();
    try {
      return (await this.api.addFunding(name, scope)).name;
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== 'funding_conflict') throw error;
      const list = await this.api.fundingOptions();
      if (scope !== this.api.scope()) throw error;
      const match = list.options.find((option) => option.name.toLowerCase() === name.toLowerCase());
      if (!match) throw error;
      return match.name;
    }
  }
  private async loadGenderOptions(): Promise<void> {
    const scope = this.profileScope;
    const request = ++this.genderLoad;
    try {
      const list = await this.api.genderOptions();
      if (request !== this.genderLoad || scope !== this.api.scope() || this.editing() !== 'profile')
        return;
      const names = list.options.map((option) => option.name);
      const current = this.draft.file?.details['gender'] ?? '';
      if (current && !names.some((name) => name.toLowerCase() === current.toLowerCase()))
        names.push(current);
      this.genderOptions.set(names);
      if (this.genderChoice === this.genderAdd) return;
      const selected = this.genderChoice || current;
      const match = names.find((name) => name.toLowerCase() === selected.toLowerCase());
      if (!match) return;
      this.genderChoice = match;
      if (this.draft.file) this.draft.file.details['gender'] = match;
    } catch {
      if (request !== this.genderLoad || scope !== this.api.scope()) return;
    }
  }
  protected setGender(value: string): void {
    this.genderChoice = value;
    if (value !== this.genderAdd && this.draft.file) {
      this.draft.file.details['gender'] = value;
      this.genderName = '';
    }
    this.clearFieldError('details.gender');
    this.clearFieldError('genderName');
  }
  protected setGenderName(value: string): void {
    this.genderName = value;
    this.clearFieldError('genderName');
  }
  private async chosenGender(scope: string): Promise<void> {
    if (this.genderChoice !== this.genderAdd) return;
    const name = this.genderName.trim();
    let created: string;
    try {
      created = (await this.api.addGender(name, scope)).name;
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== 'gender_conflict') throw error;
      const list = await this.api.genderOptions();
      if (scope !== this.api.scope()) throw error;
      const match = list.options.find((option) => option.name.toLowerCase() === name.toLowerCase());
      if (!match) throw error;
      created = match.name;
    }
    if (!this.genderOptions().some((option) => option.toLowerCase() === created.toLowerCase()))
      this.genderOptions.update((options) => [...options, created]);
    this.genderName = '';
    this.setGender(created);
  }
  private loadSexuality(): void {
    this.sexualityBaseline = this.draft.file?.details['sexuality'] ?? '';
    const parts = splitSexuality(this.sexualityBaseline, this.sexualityOptions());
    this.sexualityChoice = parts.choice;
    this.sexualityDetail = parts.detail;
  }
  private async loadSexualityOptions(): Promise<void> {
    const scope = this.profileScope;
    const request = ++this.sexualityLoad;
    try {
      const list = await this.api.sexualityOptions();
      if (
        request !== this.sexualityLoad ||
        scope !== this.api.scope() ||
        this.editing() !== 'profile'
      )
        return;
      const names = list.options.map((option) => option.name);
      const stored = splitSexuality(this.sexualityBaseline, names);
      if (
        stored.choice &&
        stored.choice !== SEXUALITY_OTHER &&
        !names.some((name) => name.toLowerCase() === stored.choice.toLowerCase())
      )
        names.push(stored.choice);
      const opened = splitSexuality(this.sexualityBaseline, this.sexualityOptions());
      const touched =
        this.sexualityChoice !== opened.choice || this.sexualityDetail !== opened.detail;
      this.sexualityOptions.set(names);
      if (this.sexualityChoice === this.sexualityAdd || touched) return;
      this.sexualityChoice = stored.choice;
      this.sexualityDetail = stored.detail;
      this.applySexuality();
    } catch {
      if (request !== this.sexualityLoad || scope !== this.api.scope()) return;
    }
  }
  protected setSexualityChoice(choice: string): void {
    this.sexualityChoice = choice;
    if (choice === this.sexualityAdd) this.sexualityDetail = '';
    else {
      if (choice !== SEXUALITY_OTHER) this.sexualityDetail = '';
      this.applySexuality();
    }
    this.clearFieldError('details.sexuality');
    this.clearFieldError('details.sexualityDetail');
    this.clearFieldError('sexualityName');
  }
  protected setSexualityName(value: string): void {
    this.sexualityName = value;
    this.clearFieldError('sexualityName');
  }
  private async chosenSexuality(scope: string): Promise<void> {
    if (this.sexualityChoice !== this.sexualityAdd) {
      this.applySexuality();
      return;
    }
    const name = this.sexualityName.trim();
    let created: string;
    try {
      created = (await this.api.addSexuality(name, scope)).name;
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== 'sexuality_conflict') throw error;
      const list = await this.api.sexualityOptions();
      if (scope !== this.api.scope()) throw error;
      const match = list.options.find((option) => option.name.toLowerCase() === name.toLowerCase());
      if (!match) throw error;
      created = match.name;
    }
    if (!this.sexualityOptions().some((option) => option.toLowerCase() === created.toLowerCase()))
      this.sexualityOptions.update((options) => [...options, created]);
    this.sexualityName = '';
    this.setSexualityChoice(created);
  }
  protected setSexualityDetail(detail: string): void {
    this.sexualityDetail = detail;
    this.applySexuality();
    this.clearFieldError('details.sexualityDetail');
  }
  private applySexuality(): void {
    if (!this.draft.file) return;
    const loaded = splitSexuality(this.sexualityBaseline, this.sexualityOptions());
    const unchanged =
      this.sexualityChoice === loaded.choice && this.sexualityDetail === loaded.detail;
    this.draft.file.details['sexuality'] = unchanged
      ? this.sexualityBaseline
      : joinSexuality(this.sexualityChoice, this.sexualityDetail);
  }
  protected toggleRisk(flag: (typeof RISK_FLAGS)[number]): void {
    this.clearFieldError('riskFlags');
    this.draft.riskFlags = this.draft.riskFlags?.includes(flag)
      ? this.draft.riskFlags.filter((f) => f !== flag)
      : [...(this.draft.riskFlags ?? []), flag];
  }
  protected fieldError(key: string): string {
    return this.fieldErrors()[key] ?? '';
  }
  protected clearFieldError(key: string): void {
    if (!this.fieldErrors()[key]) return;
    this.fieldErrors.update((errors) => {
      const next = { ...errors };
      delete next[key];
      return next;
    });
    if (!Object.keys(this.fieldErrors()).length) this.error.set('');
  }
  private showFieldErrors(errors: Record<string, string>): void {
    this.fieldErrors.set(errors);
    this.error.set('Please check the highlighted fields.');
    this.changeDetector.detectChanges();
    const host = this.profileDialog
      ? document.getElementById(this.profileDialog.id)
      : this.element.nativeElement;
    const control = host?.querySelector<HTMLElement>(
      '.client-profile-editor :is(input, textarea, mat-select)[aria-invalid="true"]',
    );
    control?.focus({ preventScroll: true });
    control?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }
  private validateProfile(): boolean {
    const errors: Record<string, string> = {};
    if (
      !this.photoOnly() &&
      !this.gpPractice.trim() &&
      (this.gpPhone.trim() || this.original?.overview?.primary_gp)
    )
      errors['primary_gp.name'] = 'Enter the GP practice name.';
    for (const key of ['name', 'reference', 'address', 'postcode'] as const) {
      if (!this.draft[key].trim()) errors[key] = PROFILE_FIELD_LABELS[key] + ' is required.';
    }
    const email = this.draft.email?.trim(),
      contactEmail = this.draft.representative?.email?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors['email'] = 'Enter a valid email address.';
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
      errors['representative.email'] = 'Enter a valid contact email address.';
    const contact = this.draft.representative;
    if (contact && Object.values(contact).some((value) => value.trim()) && !contact.name.trim())
      errors['representative.name'] =
        'Contact name is required when entering representative details.';
    const dob = this.draft.file?.details['dob'];
    if (dob && (!validDate(dob) || dob > this.today))
      errors['details.dob'] = 'Enter a valid date of birth on or before today.';
    if (!this.photoOnly()) {
      if (this.fundingChoice === this.fundingAdd) {
        const name = this.fundingName.trim();
        if (!name) errors['fundingName'] = 'Enter a funding name.';
        else if (name.length > 30)
          errors['fundingName'] = 'Funding must be 30 characters or fewer.';
      } else if (!this.fundingChoice.trim()) errors['funding'] = 'Funding is required.';
    }
    if (this.genderChoice === this.genderAdd) {
      const name = this.genderName.trim();
      if (!name) errors['genderName'] = 'Enter a gender option.';
      else if (name.length > 80) errors['genderName'] = 'Gender must be 80 characters or fewer.';
    }
    if (this.sexualityChoice === this.sexualityAdd) {
      const name = this.sexualityName.trim();
      if (!name) errors['sexualityName'] = 'Enter a sexuality option.';
      else if (name.length > 80)
        errors['sexualityName'] = 'Sexuality must be 80 characters or fewer.';
    } else if (this.sexualityChoice === SEXUALITY_OTHER && !this.sexualityDetail.trim())
      errors['details.sexualityDetail'] = 'Please specify the sexual orientation.';
    else if ((this.draft.file?.details['sexuality'] ?? '').length > 200)
      errors['details.sexualityDetail'] = 'Sexual orientation must be 200 characters or fewer.';
    if (Object.keys(errors).length) {
      this.showFieldErrors(errors);
      return false;
    }
    return true;
  }
  private profileError(error: unknown): void {
    const errors: Record<string, string> = {};
    if (error instanceof ApiError) {
      for (const [path, messages] of Object.entries(error.fieldErrors)) {
        const field =
          path === 'photo_id' ? 'photo' : path.startsWith('riskFlags.') ? 'riskFlags' : path;
        if (PROFILE_FIELD_LABELS[field]) {
          errors[field] = messages.some((message) => /may not be blank|is required/i.test(message))
            ? PROFILE_FIELD_LABELS[field] + ' is required.'
            : messages.join(' ');
        }
      }
      if (error.code === 'reference_conflict') errors['reference'] = error.message;
      if (this.genderChoice === this.genderAdd && error.fieldErrors['name'])
        errors['genderName'] = error.fieldErrors['name'].join(' ');
      else if (this.sexualityChoice === this.sexualityAdd && error.fieldErrors['name'])
        errors['sexualityName'] = error.fieldErrors['name'].join(' ');
      else if (this.fundingChoice === this.fundingAdd && error.fieldErrors['name'])
        errors['fundingName'] = error.fieldErrors['name'].join(' ');
    }
    if (Object.keys(errors).length) this.showFieldErrors(errors);
    else
      this.error.set(
        error instanceof Error ? error.message : 'The service user could not be saved.',
      );
  }
  protected async save(): Promise<void> {
    if (this.editing() === 'profile') {
      if (this.photoLoading() || this.api.saving() || this.fundingBusy()) return;
      this.fieldErrors.set({});
      this.error.set('');
      if (!this.validateProfile()) return;
      const scope = this.profileScope;
      this.fundingBusy.set(true);
      try {
        if (!this.photoOnly()) {
          const funding = await this.chosenFunding(scope);
          if (scope !== this.api.scope()) return;
          this.draft.funding = funding;
          this.fundingChoice = funding;
          if (!this.fundingOptions().some((name) => name.toLowerCase() === funding.toLowerCase()))
            this.fundingOptions.update((options) => [...options, funding]);
          this.fundingName = '';
          await this.chosenSexuality(scope);
          if (scope !== this.api.scope()) return;
          await this.chosenGender(scope);
          if (scope !== this.api.scope()) return;
        }
        const originalGp = this.original?.overview?.primary_gp;
        const name = this.gpPractice.trim();
        const phone = this.gpPhone.trim();
        const gp =
          name && (name !== originalGp?.name || phone !== originalGp?.phone)
            ? { ...(originalGp ? { id: originalGp.id, etag: originalGp.etag } : {}), name, phone }
            : undefined;
        const row =
          this.photoOnly() && this.original
            ? await this.api.savePhoto(this.draft, this.original, scope)
            : await this.api.save(this.draft, this.original, scope, gp);
        if (scope !== this.api.scope()) return;
        this.discard();
        this.toast.success('Client record saved.');
        if (!this.id()) void this.router.navigate(['/manage/clients', row.id]);
      } catch (error) {
        if (scope === this.api.scope()) this.profileError(error);
      } finally {
        this.fundingBusy.set(false);
      }
      return;
    }
    this.error.set('This record section is not connected to the backend yet.');
    return;
  }
  private workspaceSection(key: string) {
    return this.client()?.overview?.workspace.sections.find((section) => section.key === key);
  }
  protected canSectionAction(action: 'read' | 'edit' | 'create', key = this.sectionKey()): boolean {
    if (key === 'plan') return this.canPlan(action);
    if (RECORD_SECTIONS.includes(key)) {
      const section = this.workspaceSection(key);
      const owner =
        (
          { risks: 'risks', medication: 'medication', tasks: 'recording' } as Record<string, string>
        )[key] ?? 'records';
      return (
        !!section &&
        this.api.access.can('care', owner, action) &&
        (action === 'read' || (action === 'edit' ? section.can_edit : section.can_create))
      );
    }
    return this.api.access.can('care', 'records', action);
  }
  private openRecordDialog(sectionKey: string, entryId?: string | null): void {
    const person = this.api.selected();
    if (
      !person?.overview ||
      !this.canSectionAction(entryId === null ? 'create' : 'edit', sectionKey)
    )
      return;
    this.overviewDialog = this.dialogs.open(ServiceUserOverviewDialog, {
      width: '800px',
      panelClass: ['service-user-dialog', 'service-user-card-dialog'],
      backdropClass: 'service-user-dialog-backdrop',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: '90vh',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      data: {
        card: entryId === undefined ? 'record-section' : 'record-entry',
        sectionKey,
        entryId: entryId ?? undefined,
        person: structuredClone(person),
        api: this.api,
      },
    });
  }
  protected hasAccessCode(): boolean {
    return !!this.workspaceSection('access')?.has_code;
  }
  protected async toggleAccessCode(): Promise<void> {
    if (this.showCode()) {
      this.showCode.set(false);
      this.accessCode.set('');
      return;
    }
    const id = this.id(),
      version = this.client()?.version,
      scope = this.api.scope();
    if (!id || this.accessCodeLoading()) return;
    this.accessCodeLoading.set(true);
    try {
      const source = await this.api.getRecordSection(id, 'access');
      if (
        scope !== this.api.scope() ||
        this.id() !== id ||
        this.client()?.version !== version ||
        this.sectionKey() !== 'access'
      )
        return;
      this.accessCode.set(source.fields.find((field) => field.key === 'code')?.value ?? '');
      this.showCode.set(true);
    } catch (error) {
      if (scope === this.api.scope())
        this.toast.error(
          error instanceof Error ? error.message : 'The access code could not be opened.',
        );
    } finally {
      this.accessCodeLoading.set(false);
    }
  }
  private fieldValue(
    person: DirectoryUser | undefined | null,
    section: string,
    key: string,
  ): string {
    const raw = person?.file?.sections[section]?.[key] ?? '';
    if (section === 'support' && ['preferredStaff', 'backupStaff'].includes(key)) {
      const source = person?.overview?.workspace.sections.find((item) => item.key === 'support');
      if (!source?.staff_read) return 'Unavailable';
      return raw
        .split(',')
        .filter(Boolean)
        .map(
          (id) =>
            source.staff_choices.find((choice) => choice.id === id)?.name ??
            'Unavailable staff record',
        )
        .join(', ');
    }
    return raw;
  }
  protected printFields(key: string, field: string): string {
    return this.fieldValue(this.printSnapshot(), key, field);
  }
  protected printSections() {
    const person = this.printSnapshot();
    return this.sections.filter(
      (section) =>
        section.key !== 'access' &&
        (section.fields || section.entryLabel) &&
        (section.key === 'family' ||
          (section.key === 'plan'
            ? !!person?.overview?.care_plan
            : !!person?.overview?.workspace.sections.some((source) => source.key === section.key))),
    );
  }
  protected async print(): Promise<void> {
    if (!this.id() || this.printBusy()) return;
    const scope = this.api.scope(),
      id = this.id()!;
    this.printSnapshot.set(null);
    this.printBusy.set(true);
    try {
      const person = await this.api.recordSummary(id);
      if (scope !== this.api.scope() || this.id() !== id) return;
      this.printSnapshot.set(person);
      this.changeDetector.detectChanges();
      window.addEventListener('afterprint', () => this.printSnapshot.set(null), { once: true });
      window.print();
    } catch (error) {
      if (scope === this.api.scope())
        this.toast.error(
          error instanceof Error ? error.message : 'The care summary could not be prepared.',
        );
    } finally {
      this.printBusy.set(false);
    }
  }
}
