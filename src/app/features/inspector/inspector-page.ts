import { Component, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../shared/ui/select';
import { InspectorService } from './inspector.service';
import {
  InspectionMetrics,
  InspectionMetric,
  InspectionQuestions,
  InspectionFields,
} from './inspector-widgets';
import {
  CATEGORIES,
  INSPECTOR_PAGES,
  QUESTIONS,
  RATINGS,
  InspectionDraft,
  InspectorDocument,
  InspectorFinding,
  Question,
  csv,
} from './inspector.models';
import { decodeDocument, download, zip } from './inspector-download';
import { RotaClient } from '../management/rota/rota.models';

interface RegisterRow {
  id: string;
  cells: string[];
  detail: Record<string, unknown>;
}
@Component({
  selector: 'cv-inspector-page',
  imports: [
    A11yModule,
    FormsModule,
    RouterLink,
    NgTemplateOutlet,
    MatSelectModule,
    CvSelect,
    InspectionMetrics,
    InspectionQuestions,
    InspectionFields,
  ],
  templateUrl: './inspector-page.html',
  styleUrls: [
    './inspector-banner.css',
    './inspector-dialog.css',
    './inspector-actions.css',
    './inspector-workflows.css',
    './inspector-page.css',
    './inspector-records.css',
  ],
})
export class InspectorPage {
  readonly data = inject(InspectorService);
  private readonly route = inject(ActivatedRoute);
  readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly page = computed(
    () => INSPECTOR_PAGES.find((p) => p.path === this.routeData()['page']) ?? INSPECTOR_PAGES[0],
  );
  readonly company = this.data.store.company;
  readonly questions = QUESTIONS;
  readonly categories = CATEGORIES;
  readonly ratings = RATINGS;
  readonly search = signal('');
  readonly category = signal('');
  readonly statusFilter = signal('');
  readonly riskFilter = signal('');
  readonly fundingFilter = signal('');
  readonly locationFilter = signal('');
  readonly owner = signal('');
  readonly questionFilter = signal<string[]>([]);
  readonly currentPage = signal(1);
  readonly sortDirection = signal(1);
  readonly selected = signal<string[]>([]);
  readonly message = signal('');
  readonly error = signal('');
  readonly activeTab = signal('Overview');
  readonly selectedClient = signal('');
  readonly month = signal(this.data.today.slice(0, 7));
  readonly selectedDay = signal('');
  readonly rangeStart = signal('');
  readonly rangeEnd = signal('');
  readonly draft = signal<InspectionDraft>(structuredClone(this.data.state().draft));
  readonly dirty = signal(false);
  readonly noteTab = signal('Overall Summary');
  readonly noteTabs = ['Overall Summary', ...QUESTIONS.map((q) => q.key), 'Additional Notes'];
  readonly contextId = signal(this.data.store.companyId());
  readonly modalOpen = signal(false);
  readonly modalKind = signal<'detail' | 'upload' | 'finding' | 'report' | 'setup'>('detail');
  readonly modalTitle = signal('');
  readonly record = signal<RegisterRow | null>(null);
  readonly client = signal<RotaClient | null>(null);
  readonly uploadFile = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly uploadName = signal('');
  readonly uploadCategory = signal('Policies');
  readonly uploadQuestion = signal<Question>('Safe');
  readonly uploadExpiry = signal('');
  readonly finding = signal<InspectorFinding>(this.emptyFinding());
  readonly modalError = signal('');
  readonly owners = computed(() =>
    [...new Set(this.data.documents().map((d) => d.owner))].filter(Boolean).sort(),
  );
  readonly documents = computed(() =>
    this.data
      .documents()
      .filter((d) => {
        const term = this.search().trim().toLowerCase();
        return (
          (!term ||
            [d.name, d.category, d.owner, d.source, ...d.questions]
              .join(' ')
              .toLowerCase()
              .includes(term)) &&
          (!this.category() || d.category === this.category()) &&
          (!this.statusFilter() || d.status === this.statusFilter()) &&
          (!this.owner() || d.owner === this.owner()) &&
          (!this.questionFilter().length ||
            d.questions.some((q) => this.questionFilter().includes(q)))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name) * this.sortDirection()),
  );
  readonly selectedDocuments = computed(() =>
    this.data.documents().filter((d) => this.selected().includes(d.id)),
  );
  readonly allSelected = computed(
    () =>
      this.visibleDocuments().length > 0 &&
      this.visibleDocuments().every((d) => this.selected().includes(d.id)),
  );
  readonly visibleDocuments = computed(() =>
    this.documents().slice((this.currentPage() - 1) * 8, this.currentPage() * 8),
  );
  readonly findings = computed(() => this.data.state().draft.findings);
  readonly scopedVisits = computed(() =>
    this.data.visits().filter((v) => v.date.startsWith(this.month())),
  );
  readonly scopedMar = computed(() =>
    this.data
      .administrations()
      .filter(
        (a) =>
          (!this.selectedClient() || a.clientId === this.selectedClient()) &&
          (!this.rangeStart() || a.date >= this.rangeStart()) &&
          (!this.rangeEnd() || a.date <= this.rangeEnd()),
      ),
  );
  readonly register = computed(() => this.buildRegister());
  readonly locations = computed(() =>
    [...new Set(this.data.clients().map((c) => c.postcode))].filter(Boolean).sort(),
  );
  readonly filteredRows = computed(() =>
    this.register()
      .rows.filter(
        (r) =>
          (!this.riskFilter() || r.cells.includes(this.riskFilter())) &&
          (!this.fundingFilter() || r.cells.includes(this.fundingFilter())) &&
          (!this.locationFilter() ||
            this.data.clients().find((c) => c.id === r.id)?.postcode === this.locationFilter()) &&
          (!this.search() ||
            r.cells.join(' ').toLowerCase().includes(this.search().toLowerCase())) &&
          (!this.statusFilter() || r.cells.includes(this.statusFilter())),
      )
      .sort((a, b) => a.cells[0].localeCompare(b.cells[0]) * this.sortDirection()),
  );
  readonly visibleRows = computed(() =>
    this.filteredRows().slice((this.currentPage() - 1) * 8, this.currentPage() * 8),
  );
  readonly count = computed(() =>
    this.page().path === 'documents' ? this.documents().length : this.filteredRows().length,
  );
  readonly pages = computed(() => Math.max(1, Math.ceil(this.count() / 8)));
  readonly startRow = computed(() => (this.count() ? (this.currentPage() - 1) * 8 + 1 : 0));
  readonly endRow = computed(() => Math.min(this.currentPage() * 8, this.count()));
  readonly metrics = computed<InspectionMetric[]>(() => this.buildMetrics());
  readonly calendar = computed(() => {
    const [year, month] = this.month().split('-').map(Number);
    if (!year || !month) return [];
    const first = new Date(Date.UTC(year, month - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(Date.UTC(year, month - 1, i - offset + 1)).toISOString().slice(0, 10);
      const visits = this.scopedVisits().filter((v) => v.date === date);
      return {
        date,
        day: Number(date.slice(-2)),
        inMonth: date.startsWith(this.month()),
        count: visits.length,
        completed: visits.filter((v) => this.data.status(v) === 'Completed').length,
        issues: visits.filter((v) => ['Unallocated', 'No attendance'].includes(this.data.status(v)))
          .length,
      };
    });
  });
  readonly readiness = computed(() => [
    { label: 'Provider registration recorded', complete: !!this.company()?.compliance?.cqcNumber },
    {
      label: 'Evidence available for all five key questions',
      complete: QUESTIONS.every((q) =>
        this.data.documents().some((d) => d.questions.includes(q.key)),
      ),
    },
    {
      label: 'All inspection findings resolved',
      complete:
        this.findings().length > 0 && this.findings().every((f) => f.status === 'Completed'),
    },
    {
      label: 'All key questions assessed',
      complete: QUESTIONS.every(
        (q) =>
          !!this.data.state().draft.ratings[q.key] &&
          this.data.state().draft.ratings[q.key] !== 'Not assessed',
      ),
    },
    { label: 'Inspection summary recorded', complete: !!this.data.state().draft.summary.trim() },
  ]);
  readonly readyCount = computed(() => this.readiness().filter((r) => r.complete).length);
  constructor() {
    effect(() => {
      this.page();
      this.params();
      this.riskFilter.set('');
      this.fundingFilter.set('');
      this.locationFilter.set('');
      this.search.set(this.params().get('q') ?? '');
      this.category.set('');
      this.statusFilter.set('');
      this.owner.set('');
      this.questionFilter.set([]);
      this.currentPage.set(1);
      this.activeTab.set('Overview');
    });
    effect(() => {
      const id = this.data.store.companyId();
      if (id !== this.contextId()) {
        this.contextId.set(id);
        this.draft.set(structuredClone(this.data.state().draft));
        this.dirty.set(false);
        this.selected.set([]);
        this.client.set(null);
        this.selectedClient.set('');
        this.clearFilters();
        this.message.set('');
        this.error.set('');
        this.modalOpen.set(false);
      }
    });
    effect(() => {
      if (this.currentPage() > this.pages()) this.currentPage.set(this.pages());
    });
  }
  canLeave(): boolean {
    return (
      !this.dirty() || window.confirm('Leave this page and discard unsaved inspection changes?')
    );
  }
  date(value: string | undefined): string {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Europe/London',
        }).format(date);
  }
  percent(count: number, total: number): string {
    return total ? Math.round((count / total) * 100) + '%' : '—';
  }
  filterChanged(): void {
    this.currentPage.set(1);
  }
  clearFilters(): void {
    this.riskFilter.set('');
    this.fundingFilter.set('');
    this.locationFilter.set('');
    this.search.set('');
    this.category.set('');
    this.statusFilter.set('');
    this.owner.set('');
    this.questionFilter.set([]);
    this.currentPage.set(1);
  }
  setQuestion(question: string, checked: boolean): void {
    this.questionFilter.update((values) =>
      checked ? [...values, question] : values.filter((q) => q !== question),
    );
    this.filterChanged();
  }
  toggleDocument(id: string, checked: boolean): void {
    this.selected.update((ids) =>
      checked ? [...new Set([...ids, id])] : ids.filter((value) => value !== id),
    );
  }
  toggleVisible(checked: boolean): void {
    this.visibleDocuments().forEach((d) => this.toggleDocument(d.id, checked));
  }
  updateDraft(key: 'summary' | 'type' | 'start' | 'end', value: string): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
    this.dirty.set(true);
  }
  updateNote(value: string): void {
    this.draft.update((d) => ({ ...d, notes: { ...d.notes, [this.noteTab()]: value } }));
    this.dirty.set(true);
  }
  updateRating(question: string, rating: string): void {
    this.draft.update((d) => ({ ...d, ratings: { ...d.ratings, [question]: rating } }));
    this.dirty.set(true);
  }
  save(): boolean {
    this.error.set('');
    this.message.set('');
    if (this.draft().start && this.draft().end && this.draft().end < this.draft().start) {
      this.error.set('The inspection end date must be on or after the start date.');
      return false;
    }
    const error = this.data.saveDraft(this.draft(), this.contextId());
    if (error) {
      this.error.set(error);
      return false;
    }
    this.draft.set(structuredClone(this.data.state().draft));
    this.dirty.set(false);
    this.message.set('Inspection draft saved on this device.');
    return true;
  }
  reload(): void {
    if (this.dirty() && !window.confirm('Discard your changes and reload the saved inspection?'))
      return;
    this.draft.set(structuredClone(this.data.state().draft));
    this.dirty.set(false);
    this.error.set('');
  }
  openModal(kind: 'detail' | 'upload' | 'finding' | 'report' | 'setup', title: string): void {
    this.modalKind.set(kind);
    this.modalTitle.set(title);
    this.modalError.set('');
    this.modalOpen.set(true);
  }
  closeModal(): void {
    if (this.uploading()) return;
    this.modalOpen.set(false);
  }
  openRecord(row: RegisterRow): void {
    this.record.set(row);
    this.client.set(
      this.page().path === 'service-users'
        ? (this.data.clients().find((c) => c.id === row.id) ?? null)
        : null,
    );
    this.activeTab.set('Overview');
    this.openModal('detail', row.cells[0]);
  }
  openUpload(): void {
    this.uploadFile.set(null);
    this.uploadName.set('');
    this.uploadExpiry.set('');
    this.openModal('upload', 'Upload inspection evidence');
  }
  fileChanged(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.uploadFile.set(file);
    if (file) this.uploadName.set(file.name);
  }
  async upload(): Promise<void> {
    const file = this.uploadFile(),
      companyId = this.contextId();
    this.modalError.set('');
    if (!file || !this.uploadName().trim()) {
      this.modalError.set('Choose a file and enter a document name.');
      return;
    }
    if (file.size > 5 * 1024 * 1024 || !file.size) {
      this.modalError.set('Choose a non-empty file up to 5 MB.');
      return;
    }
    if (!/\.(pdf|png|jpe?g|txt|csv|docx|xlsx)$/i.test(file.name)) {
      this.modalError.set('Use PDF, PNG, JPG, TXT, CSV, DOCX or XLSX.');
      return;
    }
    this.uploading.set(true);
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const document: InspectorDocument = {
        id: 'inspection:' + crypto.randomUUID(),
        name: this.uploadName().trim(),
        category: this.uploadCategory(),
        questions: [this.uploadQuestion()],
        owner: this.data.auth.currentUser()?.name ?? 'Inspector',
        updated: new Date().toISOString(),
        version: '1.0',
        expiry: this.uploadExpiry(),
        status: 'Pending review',
        content,
        source: 'Inspection upload',
      };
      const error = this.data.addDocument(document, companyId);
      if (error) this.modalError.set(error);
      else {
        this.modalOpen.set(false);
        this.message.set('Evidence saved on this device.');
      }
    } catch {
      this.modalError.set('Could not read this file. Select it again and retry.');
    } finally {
      this.uploading.set(false);
    }
  }
  emptyFinding(): InspectorFinding {
    return {
      id: '',
      question: 'Safe',
      type: 'Strength',
      text: '',
      owner: '',
      due: '',
      status: 'Open',
      evidenceIds: [],
      at: '',
      by: '',
    };
  }
  openFinding(value?: InspectorFinding): void {
    this.finding.set(value ? structuredClone(value) : this.emptyFinding());
    this.openModal('finding', value ? 'Edit finding' : 'Add inspection finding');
  }
  findingField(key: string, value: string): void {
    this.finding.update((f) => ({ ...f, [key]: value }));
  }
  findingEvidence(id: string, checked: boolean): void {
    this.finding.update((f) => ({
      ...f,
      evidenceIds: checked
        ? [...new Set([...f.evidenceIds, id])]
        : f.evidenceIds.filter((value) => value !== id),
    }));
  }
  saveFinding(): void {
    const value = this.finding();
    if (!value.text.trim()) {
      this.modalError.set('Enter the finding.');
      return;
    }
    if (value.type === 'Required action' && (!value.owner.trim() || !value.due)) {
      this.modalError.set('Required actions need an owner and due date.');
      return;
    }
    const next = {
      ...value,
      id: value.id || crypto.randomUUID(),
      at: new Date().toISOString(),
      by: this.data.auth.currentUser()?.name ?? 'Inspector',
    };
    this.finding.set(next);
    this.draft.update((d) => ({
      ...d,
      findings: [...d.findings.filter((f) => f.id !== next.id), next],
    }));
    this.dirty.set(true);
    if (this.save()) this.closeModal();
    else this.modalError.set(this.error());
  }
  exportRegister(): void {
    const register = this.register();
    download(
      csv([register.columns, ...this.filteredRows().map((r) => r.cells)]),
      this.page().path + '.csv',
      'text/csv;charset=utf-8',
    );
  }
  downloadDocument(document: InspectorDocument): void {
    try {
      download(
        decodeDocument(document.content) as BlobPart,
        document.name,
        'application/octet-stream',
      );
    } catch {
      this.error.set('This record has no downloadable file content.');
    }
  }
  pack(all = false): void {
    this.error.set('');
    const documents = all ? this.data.documents() : this.selectedDocuments();
    if (!documents.length) {
      this.error.set('Select at least one document for the evidence pack.');
      return;
    }
    try {
      const manifest = csv([
        ['Document', 'Category', 'Key questions', 'Source', 'Status', 'Owner', 'Updated'],
        ...documents.map((d) => [
          d.name,
          d.category,
          d.questions.join('; '),
          d.source,
          d.status,
          d.owner,
          d.updated,
        ]),
      ]);
      const files = documents.map((d, i) => ({
        name: `${i + 1}-${d.name}`,
        data: decodeDocument(d.content),
      }));
      files.push({ name: 'evidence-index.csv', data: new TextEncoder().encode(manifest) });
      download(zip(files) as BlobPart, 'inspection-evidence.zip', 'application/zip');
      this.message.set(`Evidence pack downloaded (${documents.length} documents).`);
    } catch {
      this.error.set(
        'A selected document has unavailable file content. Remove it from the pack and retry.',
      );
    }
  }
  showReport(): void {
    this.openModal('report', 'Draft inspection report');
  }
  printReport(): void {
    window.print();
  }
  downloadReport(): void {
    download(
      JSON.stringify(
        {
          provider: this.company()?.name,
          providerId: this.company()?.id,
          inspection: this.data.state().draft,
          evidence: this.data.documents().map(({ content, ...metadata }) => metadata),
        },
        null,
        2,
      ),
      'inspection-report.json',
      'application/json',
    );
  }
  changeMonth(delta: number): void {
    const [year, month] = this.month().split('-').map(Number);
    this.month.set(new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7));
    this.selectedDay.set('');
    this.currentPage.set(1);
  }
  evidenceCount(question: string): number {
    return this.data.documents().filter((d) => d.questions.some((q) => q === question)).length;
  }
  findingCount(type: string): number {
    return this.findings().filter((f) => f.type === type).length;
  }
  readableKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }
  pipelineCount(stage: string): number {
    return this.data.store.applicants().filter((p) => p.stage === stage).length;
  }
  categoryCount(category: string): number {
    return this.data.documents().filter((d) => d.category === category).length;
  }
  reviewedIncidents(): number {
    return this.data.incidents().filter((i) => i.status === 'Reviewed' || i.status === 'Completed')
      .length;
  }
  completedFindings(): number {
    return this.findings().filter((f) => f.type === 'Required action' && f.status === 'Completed')
      .length;
  }
  clientRisk(client: RotaClient): string {
    const levels = (client.file?.entries['risks'] ?? [])
      .filter((r) => r.status === 'Active')
      .map((r) => r.level);
    return (
      ['High', 'Medium', 'Low'].find((level) =>
        levels.includes(level as 'High' | 'Medium' | 'Low'),
      ) ?? 'Not assessed'
    );
  }
  staffName(id: string): string {
    return this.data.staff().find((p) => p.id === id)?.name || id || 'Not assigned';
  }
  clientDocuments(id: string): InspectorDocument[] {
    return this.data.documents().filter((d) => d.id.startsWith('care:' + id + ':'));
  }
  evidenceName(id: string): string {
    return this.data.documents().find((d) => d.id === id)?.name || 'Source no longer available';
  }
  private buildMetrics(): InspectionMetric[] {
    const metric = (
      label: string,
      value: string | number,
      detail: string,
      icon: string,
      color = '#008afa',
      progress?: number,
    ): InspectionMetric => ({ label, value, detail, icon, color, progress });
    const documents = this.data.documents(),
      staff = this.data.staff(),
      visits = this.scopedVisits();
    switch (this.page().path) {
      case 'staffing':
        return [
          metric('Total staff', staff.length, 'Hired workforce records', 'groups'),
          metric(
            'Open vacancies',
            this.data.store.openVacancies().length,
            'Current workspace',
            'work',
          ),
          metric(
            'Verified DBS checks',
            staff.filter((p) =>
              p.hr?.checks.some(
                (c) =>
                  /DBS/i.test(c.title) &&
                  c.status === 'Verified' &&
                  (!c.expiry || c.expiry >= this.data.today),
              ),
            ).length,
            'Verified and not expired',
            'shield',
            '#00a34e',
          ),
          metric(
            'Training certificates',
            documents.filter((d) => d.category === 'Training Certificates').length,
            'Saved file evidence',
            'school',
            '#008d9f',
          ),
        ];
      case 'medication': {
        const mar = this.scopedMar();
        const given = mar.filter((a) => a.outcome === 'Given').length;
        return [
          metric(
            'Active prescriptions',
            this.data
              .prescriptions()
              .filter(
                (p) =>
                  !p.discontinuedAt &&
                  (!p.end || p.end >= this.data.today) &&
                  (!p.start || p.start <= this.data.today),
              ).length,
            'All service users',
            'medication',
          ),
          metric(
            'Recorded administrations',
            mar.length,
            'Selected person and dates',
            'description',
            '#008d9f',
          ),
          metric(
            'Given',
            this.percent(given, mar.length),
            `${given} of ${mar.length} recorded outcomes`,
            'check_circle',
            '#00a34e',
            mar.length ? (given / mar.length) * 100 : undefined,
          ),
          metric(
            'Other outcomes',
            mar.filter((a) => a.outcome !== 'Given').length,
            'Refused, omitted or absent',
            'warning',
            '#ff8a00',
          ),
        ];
      }
      case 'incidents':
        return [
          metric(
            'Recorded incidents',
            this.data.incidents().length,
            'Care and visit evidence',
            'warning',
            '#ff3047',
          ),
          metric(
            'Safeguarding concerns',
            this.data.incidents().filter((i) => i.category === 'Safeguarding').length,
            'Recorded concerns',
            'shield',
            '#00a34e',
          ),
          metric(
            'Awaiting review',
            this.data
              .incidents()
              .filter((i) => i.status === 'Awaiting review' || i.status === 'Active').length,
            'Source record status',
            'pending_actions',
            '#ff8a00',
          ),
          metric(
            'Inspection concerns',
            this.findingCount('Concern'),
            'Saved inspection findings',
            'flag',
            '#8138cf',
          ),
        ];
      case 'quality':
        return [
          metric(
            'Assessments',
            this.data.quality().assessments.length,
            'Saved quality records',
            'fact_check',
          ),
          metric(
            'Signed off',
            this.data.quality().assessments.filter((a) => a.status === 'Signed off').length,
            'Completed review and sign-off',
            'verified',
            '#00a34e',
          ),
          metric(
            'Open corrective actions',
            this.data.quality().actions.filter((a) => a.status !== 'Completed').length,
            'From quality assessments',
            'assignment',
            '#ff8a00',
          ),
          metric(
            'Evidence coverage',
            QUESTIONS.filter((q) => this.evidenceCount(q.key)).length + '/5',
            'Key questions with linked files',
            'description',
            '#008d9f',
          ),
        ];
      case 'visits':
        return [
          metric('Published visits', visits.length, this.month(), 'calendar_month'),
          metric(
            'Completed',
            visits.filter((v) => this.data.status(v) === 'Completed').length,
            'All assigned carers checked out',
            'check_circle',
            '#00a34e',
          ),
          metric(
            'In progress',
            visits.filter((v) => this.data.status(v) === 'In progress').length,
            'Recorded check-in',
            'schedule',
            '#008d9f',
          ),
          metric(
            'No attendance',
            visits.filter((v) => this.data.status(v) === 'No attendance').length,
            'Ended without recorded attendance',
            'warning',
            '#ff3047',
          ),
          metric(
            'Unallocated',
            visits.filter((v) => this.data.status(v) === 'Unallocated').length,
            'Fewer carers than required',
            'person_alert',
            '#ff8a00',
          ),
        ];
      case 'reports':
      case 'notes':
        return [
          metric(
            'Strengths',
            this.findingCount('Strength'),
            'Saved inspection findings',
            'check_circle',
            '#00a34e',
          ),
          metric(
            'Concerns',
            this.findingCount('Concern'),
            'Areas for further review',
            'warning',
            '#ff8a00',
          ),
          metric(
            'Required actions',
            this.findingCount('Required action'),
            'Provider follow-up',
            'assignment_late',
            '#ff3047',
          ),
          metric(
            'Evidence references',
            new Set(this.findings().flatMap((f) => f.evidenceIds)).size,
            'Linked to saved findings',
            'description',
          ),
        ];
      default:
        return [
          metric('Evidence documents', documents.length, 'Across source modules', 'description'),
          metric(
            'Service users',
            this.data.clients().length,
            'Current workspace records',
            'group',
            '#008d9f',
          ),
          metric('Staff records', staff.length, 'Hired workforce', 'groups', '#008afa'),
          metric(
            'Open findings',
            this.findings().filter((f) => f.status !== 'Completed').length,
            'Saved inspection findings',
            'assignment_late',
            '#ff8a00',
          ),
          metric(
            'Expired evidence',
            documents.filter((d) => d.status === 'Expired').length,
            'Requires review',
            'event_busy',
            '#ff3047',
          ),
        ];
    }
  }
  private buildRegister(): { title: string; columns: string[]; rows: RegisterRow[] } {
    const row = (id: string, cells: unknown[], detail: Record<string, unknown>): RegisterRow => ({
      id,
      cells: cells.map((c) => String(c ?? 'Not recorded')),
      detail,
    });
    switch (this.page().path) {
      case 'service-users':
        return {
          title: 'Service user records',
          columns: [
            'Name',
            'Reference',
            'Location',
            'Care plan review',
            'Risk status',
            'Funding',
            'Status',
          ],
          rows: this.data.clients().map((c) =>
            row(
              c.id,
              [
                c.name,
                c.reference,
                c.address,
                this.date(c.file?.sections['plan']?.['review']),
                this.clientRisk(c),
                c.funding,
                c.active ? 'Active' : 'Inactive',
              ],
              {
                Reference: c.reference,
                Address: c.address,
                Postcode: c.postcode,
                Funding: c.funding,
                'Visit priority': c.priority,
                'Care plan': c.file?.sections['plan'] ?? {},
                'Care goals': c.file?.entries['plan'] ?? [],
                Risks: c.file?.entries['risks'] ?? [],
                'Risk flags': c.riskFlags ?? [],
                Contacts: c.file?.contacts ?? [],
                'Last updated': this.date(c.file?.updatedAt),
              },
            ),
          ),
        };
      case 'staffing':
        return {
          title: 'Workforce compliance records',
          columns: [
            'Name',
            'Role',
            'Location',
            'Employment',
            'Verified checks',
            'Training records',
            'Status',
          ],
          rows: this.data.staff().map((p) =>
            row(
              p.id,
              [
                p.name,
                p.role,
                p.location,
                p.hr?.employment.type || 'Not recorded',
                p.hr?.checks.filter((c) => c.status === 'Verified').length ?? 0,
                p.hr?.training.length ?? 0,
                p.hr?.status || 'Not recorded',
              ],
              {
                Role: p.role,
                Location: p.location,
                Employment: p.hr?.employment.type || 'Not recorded',
                Checks: p.hr?.checks ?? [],
                Training: p.hr?.training ?? [],
                References: p.hr?.references ?? [],
                'File evidence': (p.documents ?? []).map((d) => ({
                  name: d.name,
                  status: d.status,
                  expiry: d.expiry,
                })),
              },
            ),
          ),
        };
      case 'medication': {
        if (
          this.activeTab() === 'Medication profiles' ||
          this.activeTab() === 'Controlled drugs' ||
          this.activeTab() === 'PRN prescriptions'
        ) {
          const prescriptions = this.data
            .prescriptions()
            .filter(
              (p) =>
                (!this.selectedClient() || p.clientId === this.selectedClient()) &&
                (this.activeTab() !== 'Controlled drugs' || p.controlled) &&
                (this.activeTab() !== 'PRN prescriptions' || p.frequency === 'PRN'),
            );
          return {
            title: this.activeTab(),
            columns: [
              'Medicine',
              'Service user',
              'Dose',
              'Route',
              'Frequency',
              'Controlled',
              'Status',
            ],
            rows: prescriptions.map((p) =>
              row(
                p.id,
                [
                  p.name,
                  p.client,
                  p.dose,
                  p.route,
                  p.frequency,
                  p.controlled ? 'Yes' : 'No',
                  p.discontinuedAt ? 'Discontinued' : 'Active',
                ],
                {
                  Medicine: p.name,
                  Strength: p.strength,
                  Dose: p.dose,
                  Frequency: p.frequency,
                  Times: p.times.join(', '),
                  Route: p.route,
                  Indication: p.indication,
                  Prescriber: p.prescriber,
                  Pharmacy: p.pharmacy,
                  'Stock recorded': p.stock ?? 'Not recorded',
                  'Stock location': p.stockLocation,
                  'PRN indication': p.prnIndication,
                  'PRN maximum': p.prnMax ?? 'Not recorded',
                  Notes: p.notes,
                },
              ),
            ),
          };
        }
        return {
          title: 'Medication administration record',
          columns: [
            'Service user',
            'Date',
            'Time',
            'Medicine',
            'Outcome',
            'Recorded by',
            'Witness',
          ],
          rows: this.scopedMar().map((a) =>
            row(
              a.id,
              [
                a.client,
                this.date(a.date),
                a.time,
                a.medication,
                a.outcome,
                a.by,
                a.witness || 'Not recorded',
              ],
              {
                Medicine: a.medication,
                Date: a.date,
                Time: a.time,
                Outcome: a.outcome,
                Reason: a.reason,
                Response: a.response,
                'Recorded by': a.by,
                Witness: a.witness || 'Not recorded',
                'Recorded at': a.at,
                'Correction of': a.correctionOf || 'Not applicable',
              },
            ),
          ),
        };
      }
      case 'incidents':
        return {
          title: 'Incident & safeguarding timeline',
          columns: ['Event', 'Service user', 'Date', 'Category', 'Risk level', 'Status'],
          rows: this.data.incidents().map((i) =>
            row(i.id, [i.name, i.client, this.date(i.date), i.category, i.level, i.status], {
              Event: i.name,
              'Service user': i.client,
              Date: i.date,
              Category: i.category,
              Detail: i.detail,
              Status: i.status,
            }),
          ),
        };
      case 'quality':
        return {
          title: 'Quality assessments',
          columns: ['Assessment', 'Subject', 'Assessor', 'Date', 'Review date', 'Status'],
          rows: this.data.quality().assessments.map((a) =>
            row(
              a.id,
              [
                a.context || a.templateId,
                a.subjectName,
                a.assessorName,
                this.date(a.date),
                this.date(a.reviewDate),
                a.status,
              ],
              {
                Subject: a.subjectName,
                Assessor: a.assessorName,
                Date: a.date,
                Status: a.status,
                Answers: a.answers,
                Outcome: a.outcome,
                Recommendations: a.recommendations,
                Signature: a.signature ?? 'Not recorded',
                'Audit history': a.audit,
              },
            ),
          ),
        };
      case 'visits':
        return {
          title: 'Visit activity',
          columns: ['Service user', 'Date', 'Time', 'Call', 'Allocated carers', 'Status'],
          rows: this.scopedVisits()
            .filter((v) => !this.selectedDay() || v.date === this.selectedDay())
            .map((v) =>
              row(
                v.id,
                [
                  v.clientName,
                  this.date(v.date),
                  v.start + ' – ' + v.end,
                  v.callName,
                  v.staffIds
                    .map((id) => this.data.staff().find((p) => p.id === id)?.name ?? id)
                    .join(', ') || 'Unassigned',
                  this.data.status(v),
                ],
                {
                  'Service user': v.clientName,
                  Date: v.date,
                  Time: v.start + ' – ' + v.end,
                  Address: v.address,
                  'Carers required': v.carers,
                  Tasks: v.tasks,
                  Attendance: v.attendance,
                  Exception: v.exception || 'None recorded',
                  Allocation: v.allocation,
                },
              ),
            ),
        };
      case 'reports':
      case 'notes':
        return {
          title: 'Inspection findings',
          columns: ['Finding', 'Key question', 'Type', 'Owner', 'Due date', 'Status'],
          rows: this.findings().map((f) =>
            row(
              f.id,
              [f.text, f.question, f.type, f.owner || 'Not assigned', this.date(f.due), f.status],
              {
                Question: f.question,
                Type: f.type,
                Finding: f.text,
                Owner: f.owner,
                Due: f.due,
                Status: f.status,
                Evidence: f.evidenceIds.map(
                  (id) =>
                    this.data.documents().find((d) => d.id === id)?.name ??
                    'Source no longer available',
                ),
                'Recorded by': f.by,
                'Recorded at': f.at,
              },
            ),
          ),
        };
      default:
        return {
          title: 'Evidence by key question',
          columns: ['Key question', 'Evidence items', 'Recommendation', 'Review status'],
          rows: QUESTIONS.map((q) =>
            row(
              q.key,
              [
                q.key,
                this.evidenceCount(q.key),
                this.data.state().draft.ratings[q.key] || 'Not assessed',
                this.evidenceCount(q.key) ? 'Evidence available' : 'No linked evidence',
              ],
              {
                'Key question': q.key,
                Recommendation: this.data.state().draft.ratings[q.key] || 'Not assessed',
                Documents: this.data
                  .documents()
                  .filter((d) => d.questions.includes(q.key))
                  .map((d) => ({ name: d.name, source: d.source, status: d.status })),
              },
            ),
          ),
        };
    }
  }
}
