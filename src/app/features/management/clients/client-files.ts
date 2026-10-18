import { ServiceUserDirectory } from '../care/service-user-directory';
import { ClinicalSummary } from '../care/clinical-summary';
import { age } from '../care/care.models';
import { ModuleDesign } from '../shared/module-design';
import { HostListener, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ToastService } from '../../../shared/ui/toast.service';
import { RotaService } from '../rota/rota.service';
import { RISK_FLAGS, RotaClient, completedVisit, londonDate } from '../rota/rota.models';
import { AccessRequired } from '../shared/access-required';
import { ManagementStore } from '../shared/management.store';
import {
  CLIENT_SECTIONS,
  CLIENT_SECTION_GROUPS,
  PERSONAL_FIELDS,
  ClientEntry,
  emptyClientFile,
} from './client-file.models';

@Component({
  selector: 'cv-client-files',
  imports: [
    ModuleDesign,
    ServiceUserDirectory,
    ClinicalSummary,
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
  protected readonly service = inject(RotaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly store = inject(ManagementStore);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id'));
  protected readonly client = computed(() =>
    this.service.data().clients.find((c) => c.id === this.id()),
  );
  protected readonly file = computed(() => this.client()?.file ?? emptyClientFile());
  protected readonly today = londonDate();
  protected readonly age = age;
  protected readonly photoLoading = signal(false);
  protected readonly timeSensitive = computed(
    () =>
      this.service
        .data()
        .visits.filter(
          (v) =>
            v.state !== 'Cancelled' &&
            v.timeSensitive &&
            v.date >= this.today &&
            v.date <= new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        ).length,
  );
  protected readonly capacityAlerts = computed(
    () =>
      this.service
        .data()
        .clients.filter(
          (c) =>
            c.active &&
            ['Lacks capacity', 'Fluctuates'].includes(
              c.file?.sections['capacity']?.['status'] ?? '',
            ),
        ).length,
  );
  protected readonly workspaceTabs = [
    { label: 'Medication & MAR', path: 'medication' },
    { label: 'Visits & Allocation', path: 'visits' },
    { label: 'Contacts', path: 'contacts' },
    { label: 'Documents', path: 'documents' },
    { label: 'Family Portal', path: 'family' },
    { label: 'Audit Trail', path: 'audit' },
  ];
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
  protected editOverviewSection(key: string): void {
    this.setSection(key);
    this.editSection();
  }
  protected preferredStaff(): string[] {
    return (this.values['preferredStaff'] ?? '').split(',').filter(Boolean);
  }
  protected setPreferredStaff(ids: string[]): void {
    this.values['preferredStaff'] = ids.join(',');
  }
  protected staffChoices() {
    return this.store.staff();
  }
  protected async uploadPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement,
      photo = input.files?.[0];
    input.value = '';
    if (!photo) return;
    if (
      !['image/png', 'image/jpeg'].includes(photo.type) ||
      photo.size <= 0 ||
      photo.size > 1024 * 1024
    ) {
      this.error.set('Choose a nonempty JPEG or PNG up to 1 MB.');
      return;
    }
    const draft = this.draft;
    const workspace = this.store.companyId();
    this.photoLoading.set(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read photo.'));
        reader.readAsDataURL(photo);
      });
      if (
        this.editing() !== 'profile' ||
        this.draft !== draft ||
        workspace !== this.store.companyId()
      )
        return;
      draft.file!.photo = data;
    } catch {
      this.error.set('Could not read photo. Try again.');
    } finally {
      this.photoLoading.set(false);
    }
  }
  protected readonly headerFlags = computed(() => {
    const file = this.file();
    const calls = this.service.data().calls.filter((c) => c.clientId === this.id() && c.active);
    const kin =
      file.contacts?.find((c) => c.nextOfKin)?.name ?? this.client()?.representative?.name;
    return [
      file.sections['capacity']?.['status']
        ? 'Capacity: ' + file.sections['capacity']['status']
        : '',
      file.sections['capacity']?.['welfareLpa'] ? 'LPA: Health & Welfare' : '',
      file.sections['capacity']?.['financeLpa'] ? 'LPA: Property & Finance' : '',
      calls.some((c) => c.timeSensitive) ? 'Time-sensitive calls' : '',
      file.sections['access']?.['location'] ? 'Key safe recorded' : '',
      kin ? 'Next of kin: ' + kin : '',
    ].filter(Boolean);
  });
  protected readonly sections = CLIENT_SECTIONS;
  protected readonly sectionGroups = CLIENT_SECTION_GROUPS.map((group) => ({
    label: group.label,
    sections: group.keys.map((key) => CLIENT_SECTIONS.find((section) => section.key === key)!),
  }));
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
  protected readonly personalFields = PERSONAL_FIELDS;
  protected readonly riskFlags = RISK_FLAGS;
  protected readonly sectionKey = signal('overview');
  protected readonly section = computed(() =>
    this.sections.find((s) => s.key === this.sectionKey())!,
  );
  protected readonly query = signal('');
  protected readonly status = signal('All');
  protected readonly editing = signal('');
  protected readonly error = signal('');
  protected readonly showCode = signal(false);
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
  protected readonly active = computed(
    () => this.service.data().clients.filter((c) => c.active).length,
  );
  protected readonly reviews = computed(
    () =>
      this.service.data().clients.filter((c) => {
        const date = c.file?.sections['plan']?.['review'];
        return c.active && date && date <= this.today;
      }).length,
  );
  protected readonly highRisk = computed(
    () =>
      this.service
        .data()
        .clients.filter(
          (c) =>
            c.active &&
            (c.priority === 'High' ||
              c.file?.entries['risks']?.some((r) => r.status === 'Active' && r.level === 'High')),
        ).length,
  );
  protected readonly calls = computed(() =>
    this.service.data().calls.filter((c) => c.clientId === this.id()),
  );
  protected readonly visits = computed(() =>
    this.service
      .data()
      .visits.filter((v) => v.clientId === this.id() && v.state !== 'Cancelled')
      .sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`)),
  );
  protected readonly entries = computed(() => this.file().entries[this.sectionKey()] ?? []);
  protected readonly activeRisks = computed(() =>
    (this.file().entries['risks'] ?? []).filter((r) => r.status === 'Active'),
  );
  protected readonly completedTasks = computed(
    () => (this.file().entries['tasks'] ?? []).filter((r) => r.status === 'Completed').length,
  );
  protected readonly completedVisit = completedVisit;
  protected draft: RotaClient = this.blankClient();
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
    return this.file().sections[this.sectionKey()]?.[key] ?? '';
  }
  protected setSection(key: string): void {
    this.sectionKey.set(key);
    this.showCode.set(false);
  }
  protected discard(): void {
    this.editing.set('');
    this.error.set('');
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
    this.draft = create ? this.blankClient() : structuredClone(this.client()!);
    this.draft.file ??= emptyClientFile();
    this.draft.representative ??= { name: '', relationship: '', phone: '', email: '' };
    this.sourceId = create ? '' : this.draft.id;
    this.sourceWorkspace = this.store.companyId();
    this.error.set('');
    this.editing.set('profile');
  }
  protected editSection(): void {
    this.sourceId = this.id()!;
    this.sourceWorkspace = this.store.companyId();
    this.values = structuredClone(this.file().sections[this.sectionKey()] ?? {});
    this.error.set('');
    this.editing.set('section');
  }
  protected editEntry(entry?: ClientEntry): void {
    this.sourceId = this.id()!;
    this.sourceWorkspace = this.store.companyId();
    this.entry = entry ? structuredClone(entry) : this.blankEntry();
    this.error.set('');
    this.editing.set('entry');
  }
  protected toggleRisk(flag: (typeof RISK_FLAGS)[number]): void {
    this.draft.riskFlags = this.draft.riskFlags?.includes(flag)
      ? this.draft.riskFlags.filter((f) => f !== flag)
      : [...(this.draft.riskFlags ?? []), flag];
  }
  protected save(): void {
    if (this.photoLoading()) {
      this.error.set('Wait for the photo to finish loading.');
      return;
    }
    if (this.sourceWorkspace !== this.store.companyId()) {
      this.error.set(
        'The workspace changed. Discard this draft before editing the current workspace.',
      );
      return;
    }
    if (this.sourceId && this.sourceId !== this.id()) {
      this.error.set('The selected client changed. Discard this draft and reopen the editor.');
      return;
    }
    let client: RotaClient;
    if (this.editing() === 'profile') client = structuredClone(this.draft);
    else {
      if (!this.client()) return;
      client = structuredClone(this.client()!);
      client.file ??= emptyClientFile();
      if (this.editing() === 'section')
        client.file.sections[this.sectionKey()] = structuredClone(this.values);
      if (this.editing() === 'entry') {
        if (!this.entry.name.trim()) {
          this.error.set('Enter a name for this record.');
          return;
        }
        client.file.entries[this.sectionKey()] = [
          ...(client.file.entries[this.sectionKey()] ?? []).filter((e) => e.id !== this.entry.id),
          { ...this.entry, name: this.entry.name.trim() },
        ];
      }
    }
    client.file!.updatedAt = new Date().toISOString();
    const error = this.service.saveClient(client);
    if (error) {
      this.error.set(error);
      return;
    }
    this.discard();
    this.toast.success('Client record saved.');
    if (!this.id()) void this.router.navigate(['/manage/clients', client.id]);
  }
  protected print(): void {
    if (this.service.can('export')) window.print();
  }
}
