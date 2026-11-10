import { StaffReviewsApi } from './staff-reviews-api.service';
import type { StaffReview } from './staff-reviews.generated';
import { AvailabilityLeaveApi } from './availability-leave-api.service';
import type { WorkforceLeave } from './availability-leave.generated';
import { OnboardingStaffApi, OnboardingPerson } from './onboarding-staff-api.service';
import { CompanyUnavailable } from '../shared/company-unavailable';
import { PageLoading } from '../../../shared/layouts/page-loading';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { AcademyStaffTraining } from '../learning/academy/academy-staff-training';
import { CardTonePipe } from '../../../shared/ui/card-tone.pipe';
import { PortalRecordSummary } from '../staff-portal/portal-record-summary';
import { StaffAvailability } from './staff-availability';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  untracked,
  inject,
  signal,
} from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HrService } from './hr.service';
import { StaffFields } from './staff-fields';
import { STAFF_TABS, StaffCheck } from './hr.models';
import { Person, StaffDocument } from '../shared/management.store';
import { staffRecord, checkState, dateValid } from './hr.models';
import { londonInstant } from '../rota/rota.models';
@Component({
  selector: 'cv-staff-profile',
  host: {
    class: 'module-page module-record-tabs people-page hr-profile-page',
    '[class.hr-profile-editing]': 'editing()',
  },
  providers: [OnboardingStaffApi, AvailabilityLeaveApi, StaffReviewsApi],
  imports: [
    CompanyUnavailable,
    PageLoading,
    AcademyStaffTraining,
    CardTonePipe,
    PortalRecordSummary,
    StaffAvailability,
    MatSelectModule,
    CvSelect,
    RouterLink,
    FormsModule,
    DatePipe,
    StaffFields,
    A11yModule,
  ],
  templateUrl: './staff-profile.html',
  styleUrls: [
    './hr.css',
    './hr-record.css',
    './staff-profile-editor.css',
    './staff-status.css',
    './hr-documents.css',
    './hr-employment.css',
    './hr-insights.css',
    './hr-performance.css',
    './hr-tables.css',
    './hr-forms.css',
  ],
})
export class StaffProfile {
  protected readonly staffApi = inject(OnboardingStaffApi);
  protected readonly leaveApi = inject(AvailabilityLeaveApi);
  protected readonly reviewApi = inject(StaffReviewsApi);
  private reviewKey = crypto.randomUUID();
  private leaveKey = crypto.randomUUID();
  protected readonly hr = inject(HrService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly preview = signal<{
    url: string;
    safeUrl: SafeResourceUrl;
    type: string;
    name: string;
  } | null>(null);
  constructor() {
    if (
      this.section === 'reviews' ||
      (['notes', 'audit'].includes(this.section) &&
        this.staffApi.access.can('people', 'performance', 'read') &&
        (this.route.snapshot.queryParamMap.get('context') === 'reviews' ||
          (!this.staffApi.access.can('people', 'onboarding', 'read') &&
            (this.section === 'notes' ||
              !this.staffApi.access.can('people', 'compliance', 'read')))))
    )
      this.staffApi.area.set('performance');

    if (this.section === 'availability') this.staffApi.area.set('leave');
    if (
      (['compliance', 'documents', 'employment'].includes(this.section) ||
        (this.section === 'audit' && !this.staffApi.access.can('people', 'onboarding', 'read'))) &&
      this.staffApi.access.can('people', 'compliance', 'read')
    )
      if (this.staffApi.area() !== 'performance') this.staffApi.area.set('compliance');
    inject(DestroyRef).onDestroy(() => this.closePreview());
    effect(() => {
      const id = this.id;
      const scope = this.staffApi.scope();
      untracked(() => {
        this.cancel();
        this.closePreview();
        this.pendingDocument.set(null);
        this.notice.set('');
        this.note = '';
        this.review = { type: 'Supervision', date: '', assessor: '', discussion: '', outcome: '' };
        this.reviewKey = crypto.randomUUID();
        this.competencyDrafts = {};
        this.showReviewForm = false;
        this.leave = { type: '', start: '', end: '' };
        this.leaveKey = crypto.randomUUID();
        this.requestTitle = '';
        this.reflective = this.staffApi.area() === 'performance';
        this.action = { title: '', owner: '', due: '' };
        this.booking = { courseId: '', date: '', provider: '', type: 'Training' };
        void this.staffApi.load(id).then(() => {
          if (
            id !== this.id ||
            scope !== this.staffApi.scope() ||
            this.staffApi.person()?.id !== id
          )
            return;
          if (this.reviewApi.allowed() && ['reviews', 'overview'].includes(this.section))
            void this.reviewApi.load('', '', id);
          if (!this.period) this.period = this.staffApi.localDate().slice(0, 7);
          if (this.section === 'availability') void this.leaveApi.load('', '', id);
          if (
            this.route.snapshot.queryParamMap.get('edit') === 'true' &&
            this.steps[this.section] !== undefined
          )
            this.edit();
        });
      });
    });
  }
  private readonly route = inject(ActivatedRoute);
  protected readonly companyId = this.staffApi.companyId();
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected get id(): string {
    return this.params().get('id') ?? '';
  }
  protected readonly section = this.route.snapshot.data['staffSection'] as string;
  protected readonly person = this.staffApi.person;
  protected readonly supported = [
    'overview',
    'personal',
    'employment',
    'compliance',
    'training',
    'documents',
    'notes',
    'audit',
    'availability',
    'reviews',
  ];
  protected canEdit(): boolean {
    return (
      this.supported.includes(this.section) &&
      this.staffApi.access.can('people', this.staffApi.area(), 'edit') &&
      (!['personal', 'employment'].includes(this.section) ||
        !!this.staffApi.value()?.capabilities['personal'])
    );
  }
  protected readonly inductionComplete = (task: { complete: boolean }) => task.complete;
  protected recruitmentStages() {
    const p = this.person();
    if (!p) return [];
    const r = p.hr.employment.recruitment;
    return [
      {
        title: 'Application',
        complete: !!(p.application || r?.applicationDate),
        date: r?.applicationDate || p.application?.submitted || '',
      },
      { title: 'Interview', complete: !!r?.interviewDate, date: r?.interviewDate || '' },
      {
        title: 'Checks',
        complete: p.hr.checks.every((c) => c.status === 'Verified' || c.status === 'Not required'),
        date: '',
      },
      { title: 'Offer', complete: !!r?.offerDate, date: r?.offerDate || '' },
      { title: 'Onboarded', complete: !!p.hr.onboardingComplete, date: '' },
    ];
  }
  protected ringValue(value: string | number): number {
    if (typeof value === 'number') return value > 0 ? 100 : 0;
    const n = parseFloat(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  }
  protected ringLabel(value: string | number): string {
    return String(value).length > 6 ? '—' : String(value);
  }
  protected checkPercent(title: string): string {
    const c = this.person()?.hr.checks.find((c) => c.title === title);
    return c?.status === 'Not required'
      ? 'N/A'
      : c?.status === 'Verified' && ['Verified', 'Due soon'].includes(this.checkState(c))
        ? '100%'
        : '0%';
  }
  protected reviewedDocuments(): string {
    const docs = this.documents();
    return docs.length
      ? Math.round(
          (docs.filter(
            (d) => d.status === 'Verified' && (!d.expiry || d.expiry >= this.staffApi.localDate()),
          ).length /
            docs.length) *
            100,
        ) + '%'
      : '0%';
  }
  protected bannerSummary() {
    const p = this.person();
    if (!p) return [];
    return this.section === 'training'
      ? [
          { label: 'Mandatory Training', value: this.mandatoryTraining(), color: '#00a6b7' },
          { label: 'Practical Competency', value: this.competencyRate(), color: '#00a6b7' },
          {
            label: 'Training Due Soon',
            value: p.hr.training.filter((t) => this.trainingState(t) === 'Due soon').length,
            color: '#ff8a00',
          },
          {
            label: 'Expired Courses',
            value: p.hr.training.filter((t) => this.trainingState(t) === 'Expired').length,
            color: '#ff3047',
          },
        ]
      : [
          { label: 'Right to Work', value: this.checkPercent('Right to work'), color: '#00a34e' },
          { label: 'DBS', value: this.checkPercent('DBS check'), color: '#00a34e' },
          { label: 'Records Reviewed', value: this.reviewedDocuments(), color: '#008afa' },
          { label: 'Actions Required', value: this.documentAlerts().length, color: '#ff3047' },
        ];
  }
  protected formatDate(value: string | undefined): string {
    return value && dateValid(value)
      ? new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(new Date(value + 'T12:00:00Z'))
      : 'Not recorded';
  }
  protected staffCheck(title: string): string {
    const c = this.person()?.hr.checks.find((c) => c.title === title);
    if (!c) return 'Not recorded';
    const state = this.checkState(c);
    return state === 'Verified' ? (title === 'DBS check' ? 'Cleared' : 'Valid') : state;
  }
  protected nextReview(type: string): string {
    return (
      this.reviews()
        .filter((r) => r.type === type && r.status !== 'Completed')
        .sort((a, b) => a.date.localeCompare(b.date))[0]?.date || ''
    );
  }
  protected appraisalScore(): string {
    if (!this.reviewApi.loaded()) return 'Unavailable';
    const r = this.reviews()
      .filter(
        (r) => r.type === 'Annual appraisal' && r.status === 'Completed' && r.score !== undefined,
      )
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.completedAt ?? '').localeCompare(a.completedAt ?? '') ||
          b.id.localeCompare(a.id),
      )[0];
    return r?.score === undefined ? 'Not recorded' : r.score.toFixed(1) + ' / 5';
  }
  protected reviewTiming(date: string): string {
    if (!dateValid(date)) return 'Not scheduled';
    if (date < this.staffApi.localDate()) return 'Overdue';
    if (date === this.staffApi.localDate()) return 'Due today';
    const soon = new Date(this.staffApi.localDate() + 'T12:00:00Z');
    soon.setUTCDate(soon.getUTCDate() + 30);
    return date <= soon.toISOString().slice(0, 10) ? 'Due soon' : 'Scheduled';
  }
  protected statTone(stat: { label: string; value: string | number }): string {
    const value = String(stat.value).toLowerCase();
    if (/not recorded|not scheduled|not assessed|not required|n\/a|^—$/.test(value)) return 'muted';
    if (stat.label === 'Next Supervision' || stat.label === 'Next Appraisal') {
      const timing = this.reviewTiming(value);
      return timing === 'Overdue' ? 'bad' : timing.startsWith('Due') ? 'warning' : 'info';
    }
    if (stat.label === 'Appraisal Score') {
      const score = Number.parseFloat(value);
      return score >= 4 ? 'good' : score >= 3 ? 'warning' : 'bad';
    }
    if (stat.label === 'Overdue Actions' || stat.label === 'Expired Courses')
      return Number(stat.value) > 0 ? 'bad' : 'good';
    if (stat.label === 'Training Due Soon') return Number(stat.value) > 0 ? 'warning' : 'good';
    if (['Supervisions Completed', 'Spot Checks Completed', 'Spot Checks'].includes(stat.label))
      return Number(stat.value) > 0 ? 'good' : 'muted';
    if (/expired|overdue|unavailable|invalid|needs development/.test(value)) return 'bad';
    if (/due soon|expiring|pending|not started/.test(value)) return 'warning';
    if (value === 'recorded') return stat.label === 'Availability' ? 'info' : 'warning';
    if (/valid|cleared|available|completed|competent/.test(value)) return 'good';
    if (value.endsWith('%')) {
      const percent = Number.parseFloat(value);
      return percent >= 100 ? 'good' : percent > 0 ? 'warning' : 'bad';
    }
    return typeof stat.value === 'number' && stat.value === 0 ? 'muted' : 'info';
  }
  protected statCaptionTone(stat: {
    label: string;
    value: string | number;
    caption: string;
  }): string {
    if (/not recorded|no renewal date|not scheduled/i.test(stat.caption)) return 'muted';
    return ['Due soon', 'Due today', 'Overdue', 'Scheduled'].includes(stat.caption)
      ? this.statTone(stat)
      : '';
  }
  protected readonly profileStats = computed(() => {
    const p = this.person();
    if (!p) return [];
    if (this.section === 'training')
      return [
        {
          label: 'Mandatory Training Compliance',
          value: this.mandatoryTraining(),
          caption: 'Current mandatory courses',
          icon: 'school',
          color: '#00a6b7',
          section: 'training',
        },
        {
          label: 'Practical Competency Pass Rate',
          value: this.competencyRate(),
          caption: 'Of assessed competencies',
          icon: 'assignment_turned_in',
          color: '#00a34e',
          section: 'training',
        },
        {
          label: 'Training Due Soon',
          value: p.hr.training.filter((t) => this.trainingState(t) === 'Due soon').length,
          caption: 'Within 30 days',
          icon: 'schedule',
          color: '#ff8a00',
          section: 'training',
        },
        {
          label: 'Expired Courses',
          value: p.hr.training.filter((t) => this.trainingState(t) === 'Expired').length,
          caption: 'Require renewal',
          icon: 'warning',
          color: '#ff3047',
          section: 'training',
        },
      ];
    if (this.section === 'reviews')
      return [
        {
          label: 'Supervisions Completed',
          value: this.reviewApi.loaded()
            ? this.reviews().filter((r) => r.type === 'Supervision' && r.status === 'Completed')
                .length
            : '—',
          caption: 'Recorded history',
          icon: 'supervisor_account',
          color: '#008afa',
          section: 'reviews',
        },
        {
          label: 'Spot Checks Completed',
          value: this.reviewApi.loaded()
            ? this.reviews().filter(
                (r) => r.type === 'Field spot check' && r.status === 'Completed',
              ).length
            : '—',
          caption: 'Recorded history',
          icon: 'fact_check',
          color: '#00a34e',
          section: 'reviews',
        },
        {
          label: 'Overdue Actions',
          value: p.hr.actions.filter(
            (a) => a.status !== 'Completed' && a.due < this.staffApi.localDate(),
          ).length,
          caption: 'Awaiting completion',
          icon: 'warning',
          color: '#ff3047',
          section: 'reviews',
        },
        {
          label: 'Appraisal Score',
          value: this.appraisalScore(),
          caption: 'Latest completed appraisal',
          icon: 'star',
          color: '#00a34e',
          section: 'reviews',
        },
        {
          label: 'Reflective Practice Notes',
          value: p.hr.notes.filter((n) => n.reflective).length,
          caption: 'Recorded reflections',
          icon: 'description',
          color: '#9553dc',
          section: 'notes',
        },
      ];
    if (this.section !== 'overview') return [];
    return [
      {
        label: 'Right to Work',
        value: this.staffCheck('Right to work'),
        caption:
          p.hr.checks.find((c) => c.title === 'Right to work')?.expiry ||
          'No renewal date recorded',
        icon: 'badge',
        color: '#00a34e',
        section: 'compliance',
      },
      {
        label: 'DBS Check',
        value: this.staffCheck('DBS check'),
        caption:
          p.hr.checks.find((c) => c.title === 'DBS check')?.expiry || 'No renewal date recorded',
        icon: 'verified_user',
        color: '#00a34e',
        section: 'compliance',
      },
      {
        label: 'Training',
        value: this.mandatoryTraining(),
        caption: 'Mandatory courses current',
        icon: 'school',
        color: '#008afa',
        section: 'training',
      },
      {
        label: 'Next Supervision',
        value: 'Unavailable',
        caption: this.reviewTiming(this.nextReview('Supervision')),
        icon: 'supervisor_account',
        color: '#9553dc',
        section: 'reviews',
      },
      {
        label: 'Next Appraisal',
        value: 'Unavailable',
        caption: this.reviewTiming(this.nextReview('Annual appraisal')),
        icon: 'event',
        color: '#ff3047',
        section: 'reviews',
      },
      {
        label: 'Spot Checks',
        value: 'Unavailable',
        caption: 'Completed observations',
        icon: 'fact_check',
        color: '#00a34e',
        section: 'reviews',
      },
      {
        label: 'Availability',
        value: 'Unavailable',
        caption: 'Availability is not connected',
        icon: 'calendar_month',
        color: '#008afa',
        section: 'availability',
      },
      {
        label: 'Appraisal Score',
        value: this.appraisalScore(),
        caption: 'Manager assessment',
        icon: 'star',
        color: '#ffb000',
        section: 'reviews',
      },
    ];
  });
  protected readonly access = inject(CompanyAccessService);
  protected readonly tabs = STAFF_TABS;
  protected readonly editing = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly busy = signal(false);
  protected readonly ready = (_p: Person) => this.staffApi.readiness();
  protected readonly checkState = (check: StaffCheck) =>
    check.effectiveState ?? checkState(check, this.staffApi.localDate());
  protected readonly record = staffRecord;
  protected readonly steps: Record<string, number> = {
    personal: 0,
    employment: 1,
    availability: 2,
    training: 3,
    documents: 4,
    compliance: 6,
  };
  protected draft: Person | null = null;
  private baseline = '';
  private audit = '';
  protected uploaded(etag: string): void {
    this.audit = etag;
  }
  protected note = '';
  protected reflective = false;
  protected trainingQuery = '';
  protected trainingFilter = '';
  protected trainingState(t: {
    completed: string;
    expiry: string;
    evidenceStatus?: string;
  }): string {
    if (t.evidenceStatus === 'Revoked') return t.completed ? 'Needs verification' : 'Assigned';
    if (!t.completed) return 'Assigned';
    if (t.expiry && t.expiry < this.staffApi.localDate()) return 'Expired';
    const soon = new Date(this.staffApi.localDate() + 'T12:00:00Z');
    soon.setUTCDate(soon.getUTCDate() + 30);
    return t.expiry && t.expiry <= soon.toISOString().slice(0, 10) ? 'Due soon' : 'Completed';
  }
  protected courseRecord(id: string) {
    return this.person()?.hr.training.find((t) => t.courseId === id);
  }
  protected courseCategory(id: string): string {
    return this.courses.find((c) => c.id === id)?.category || 'Training';
  }
  protected prepareBooking(id: string, type: 'Training' | 'Reassessment'): void {
    this.booking.courseId = id;
    this.booking.type = type;
    document
      .getElementById('staff-training-booking')
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }
  protected filteredTraining() {
    return (
      this.person()?.hr.training.filter(
        (t) =>
          this.course(t.courseId).toLowerCase().includes(this.trainingQuery.trim().toLowerCase()) &&
          (!this.trainingFilter || this.trainingState(t) === this.trainingFilter),
      ) ?? []
    );
  }
  protected mandatoryTraining(): string {
    const required = this.courses.filter((c) => c.category === 'Mandatory');
    const valid = required.filter((c) =>
      this.person()?.hr.training.some(
        (t) => t.courseId === c.id && ['Completed', 'Due soon'].includes(this.trainingState(t)),
      ),
    );
    return required.length
      ? Math.round((valid.length / required.length) * 100) + '%'
      : 'Unavailable';
  }
  protected competencyRate(): string {
    const assessed =
      this.person()?.hr.training.filter((t) => t.competency !== 'Not assessed') ?? [];
    return assessed.length
      ? Math.round(
          (assessed.filter((t) => t.competency === 'Competent').length / assessed.length) * 100,
        ) + '%'
      : 'Not assessed';
  }
  protected readonly documentEvent = (event: { action: string }) =>
    event.action.toLowerCase().includes('document');
  protected uploadCategory = 'Employment & HR';
  protected readonly pendingDocument = signal<StaffDocument | null>(null);
  protected readonly uploadBusy = signal(false);
  protected readonly documentTypes = [
    'Right to Work & Identity',
    'DBS & Background Checks',
    'Professional & Training',
    'Employment & HR',
    'References',
    'Driving & Vehicle',
    'Other Records',
  ];
  protected chooseDocument(): void {
    document.getElementById('staff-document-input')?.click();
  }
  protected async documentInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await this.uploadFile(file);
    input.value = '';
  }
  protected async dropDocument(event: DragEvent): Promise<void> {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) await this.uploadFile(file);
  }
  private async uploadFile(file: File): Promise<void> {
    if (!this.canEdit() || this.uploadBusy()) return;
    const id = this.id;
    this.uploadBusy.set(true);
    this.error.set('');
    try {
      const doc = await this.staffApi.upload(file, this.uploadCategory);
      if (id !== this.id || this.companyId !== this.hr.store.companyId())
        throw new Error('The staff selection changed. Choose the document again.');
      this.pendingDocument.set(null);
      this.notice.set('Document uploaded securely.');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'The file could not be uploaded.');
    } finally {
      this.uploadBusy.set(false);
    }
  }
  protected savePendingDocument(): void {
    this.pendingDocument.set(null);
  }
  protected categoryCount(category: string): number {
    return this.documents().filter((d) => (d.category || 'Other Records') === category).length;
  }
  protected documentAlerts(): {
    title: string;
    detail: string;
    section: string;
    button: string;
    tone: string;
  }[] {
    const p = this.person();
    if (!p) return [];
    const alerts = [];
    for (const title of ['Right to work', 'DBS check']) {
      const c = p.hr.checks.find((c) => c.title === title);
      if (c && ['Due soon', 'Expired'].includes(this.checkState(c)))
        alerts.push({
          title: title + ' ' + (this.checkState(c) === 'Expired' ? 'expired' : 'expiring soon'),
          detail: 'Renewal date: ' + c.expiry,
          section: 'compliance',
          button: 'View check',
          tone: this.checkState(c) === 'Expired' ? 'bad' : 'warn',
        });
    }
    const refs = p.hr.checks.find((c) => c.title === 'References');
    if (refs?.status !== 'Not required' && !p.hr.references.length)
      alerts.push({
        title: 'References not recorded',
        detail: 'Add the required employment references.',
        section: 'employment',
        button: 'Add reference',
        tone: 'bad',
      });
    const missing = p.hr.checks.filter((c) => c.status !== 'Not required' && !c.documentId).length;
    if (missing)
      alerts.push({
        title: missing + ' checks without evidence',
        detail: 'Upload and link the supporting documents.',
        section: 'compliance',
        button: 'View requirements',
        tone: 'warn',
      });
    return alerts;
  }
  protected documentQuery = '';
  protected documentCategory = '';
  protected documentStatus = '';
  protected visibleDocuments() {
    return this.documents().filter(
      (d) =>
        (d.name + ' ' + d.category)
          .toLowerCase()
          .includes(this.documentQuery.trim().toLowerCase()) &&
        (!this.documentCategory || (d.category || 'Other Records') === this.documentCategory) &&
        (!this.documentStatus || this.documentState(d) === this.documentStatus),
    );
  }
  protected documentCategories(): string[] {
    return [...new Set(this.documents().map((d) => d.category || 'Other Records'))];
  }
  protected documentState(d: { expiry?: string; status?: string }): string {
    return d.expiry && d.expiry < this.staffApi.localDate()
      ? 'Expired'
      : d.status || 'Pending review';
  }
  protected requestTitle = '';
  protected action = { title: '', owner: '', due: '' };
  protected booking = {
    courseId: '',
    date: '',
    provider: '',
    type: 'Training' as 'Training' | 'Reassessment',
  };
  protected get courses() {
    return this.staffApi.courses();
  }
  protected review = { type: 'Supervision', date: '', assessor: '', discussion: '', outcome: '' };
  protected leave = { type: '', start: '', end: '' };
  protected readonly documents = computed(() => this.person()?.documents ?? []);
  protected showReviewForm = false;
  protected reviewTab = 'Supervision';
  protected readonly reviewTabs = [
    { key: 'Supervision', label: 'Supervision History', icon: 'supervisor_account' },
    { key: 'Field spot check', label: 'Field-Based Spot Checks', icon: 'fact_check' },
    { key: 'Medication observation', label: 'Medication Observations', icon: 'medication' },
    { key: 'Care practice observation', label: 'Care Practice Observations', icon: 'assignment' },
    { key: 'Action plans', label: 'Action Plans', icon: 'assignment_turned_in' },
    { key: 'Annual appraisal', label: 'Annual Appraisal', icon: 'workspace_premium' },
  ];
  protected get dimensions(): string[] {
    return (
      (this.staffApi.value() as unknown as { review_dimensions?: { title: string }[] })
        ?.review_dimensions ?? []
    ).map((d) => d.title);
  }
  protected get reviewTypes() {
    return (
      (
        this.staffApi.value() as unknown as {
          review_types?: { id: string; title: string; requires_rating: boolean }[];
        }
      )?.review_types ?? []
    );
  }
  protected canScheduleReview(): boolean {
    return this.staffApi.access.can('people', 'performance', 'create');
  }
  protected competencyDrafts: Record<string, Record<string, number | null>> = {};
  protected dimensionDraft(id: string) {
    return (this.competencyDrafts[id] ??= Object.fromEntries(
      this.dimensions.map((d) => [d, null]),
    ));
  }
  protected latestAppraisal() {
    return this.reviews()
      .filter((r) => r.type === 'Annual appraisal' && r.status === 'Completed')
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.completedAt ?? '').localeCompare(a.completedAt ?? '') ||
          b.id.localeCompare(a.id),
      )[0];
  }
  protected radarPoints(level?: number): string {
    const ratings = this.latestAppraisal()?.competencies;
    if (level === undefined && !this.dimensions.every((d) => ratings?.some((r) => r.title === d)))
      return '';
    return this.dimensions
      .map((d, i) => {
        const score = level ?? ratings!.find((r) => r.title === d)!.score;
        const angle = (i / this.dimensions.length) * Math.PI * 2 - Math.PI / 2;
        return (
          (130 + ((70 * score) / 5) * Math.cos(angle)).toFixed(1) +
          ',' +
          (100 + ((70 * score) / 5) * Math.sin(angle)).toFixed(1)
        );
      })
      .join(' ');
  }
  protected filteredReviews() {
    return this.reviews()
      .filter((r) => r.type === this.reviewTab)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  protected reviewTrend() {
    if (!this.reviewApi.loaded()) return [];
    return this.monthlyTrend().map((m) => ({
      month: m.month,
      supervision: this.reviews().filter(
        (r) => r.date.startsWith(m.month) && r.type === 'Supervision' && r.status === 'Completed',
      ).length,
      spots: this.reviews().filter(
        (r) =>
          r.date.startsWith(m.month) && r.type === 'Field spot check' && r.status === 'Completed',
      ).length,
    }));
  }
  protected reviewLine(key: 'supervision' | 'spots'): string {
    const values = this.reviewTrend();
    const max = Math.max(1, ...values.flatMap((v) => [v.supervision, v.spots]));
    return values.map((v, i) => 30 + i * 48 + ',' + (150 - (v[key] / max) * 115)).join(' ');
  }
  protected readonly reviews = this.reviewApi.rows;
  protected readonly leaves = this.leaveApi.rows;
  protected readonly canRequestLeave = () => this.staffApi.access.can('people', 'leave', 'create');
  protected readonly leaveTypes = computed(
    () =>
      (this.staffApi.value() as unknown as { leave_types?: { id: string; name: string }[] })
        ?.leave_types ?? [],
  );
  protected period = this.staffApi.localDate().slice(0, 7);
  protected movePeriod(delta: number): void {
    const d = new Date(this.period + '-01T12:00:00Z');
    if (Number.isNaN(d.getTime())) return;
    d.setUTCMonth(d.getUTCMonth() + delta);
    this.period = d.toISOString().slice(0, 7);
  }
  protected periodLabel(): string {
    const d = new Date(this.period + '-01T12:00:00Z');
    return Number.isNaN(d.getTime())
      ? 'Choose month'
      : new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(d);
  }
  protected performanceKpis() {
    const all = ([] as NonNullable<ReturnType<typeof this.hr.store.data>['rota']>['visits']).filter(
      (v) => v.staffIds.includes(this.id) && v.date.startsWith(this.period),
    );
    const cancellations = all.length
      ? Math.round((all.filter((v) => v.state === 'Cancelled').length / all.length) * 1000) / 10 +
        '%'
      : '—';
    return [
      {
        title: 'Visit Punctuality',
        value: this.punctuality() === 'Not recorded' ? '—' : this.punctuality(),
        caption: 'Recorded start at or before scheduled',
        icon: 'schedule',
        color: '#00a34e',
      },
      {
        title: 'Completed Calls',
        value: this.completedVisits(),
        caption: 'Visits with completed attendance',
        icon: 'check_circle',
        color: '#00a34e',
      },
      {
        title: 'Missed Calls',
        value: '—',
        caption: 'Not recorded',
        icon: 'cancel',
        color: '#ff3047',
      },
      {
        title: 'Continuity of Care',
        value: '—',
        caption: 'Not recorded',
        icon: 'diversity_3',
        color: '#008afa',
      },
      {
        title: 'Service User Compliments',
        value: '—',
        caption: 'Not recorded',
        icon: 'star',
        color: '#00a34e',
      },
      {
        title: 'Family Feedback (Avg)',
        value: '—',
        caption: 'Not recorded',
        icon: 'favorite',
        color: '#ef4e85',
      },
      {
        title: 'Note Quality',
        value: '—',
        caption: 'Not assessed',
        icon: 'description',
        color: '#008afa',
      },
      {
        title: 'Medication Accuracy',
        value: '—',
        caption: 'Not assessed',
        icon: 'medication',
        color: '#00a34e',
      },
      {
        title: 'Incident Involvement',
        value: '—',
        caption: 'Not recorded',
        icon: 'warning',
        color: '#ff3047',
      },
      {
        title: 'Cancellation Rate',
        value: cancellations,
        caption: 'Cancelled / all assigned visits',
        icon: 'block',
        color: '#ff3047',
      },
      {
        title: 'Extra-Mile Evidence',
        value: '—',
        caption: 'Not recorded',
        icon: 'emoji_events',
        color: '#008afa',
      },
      {
        title: 'Overall Quality Score',
        value: '—',
        caption: 'Not assessed',
        icon: 'workspace_premium',
        color: '#008afa',
      },
    ];
  }
  protected attendanceCount(): number {
    return this.performanceVisits().filter((v) =>
      v.attendance.some((a) => a.personId === this.id && a.start),
    ).length;
  }
  protected readonly heatDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly heatSlots = ['06–09', '09–12', '12–15', '15–18', '18–22'];
  protected lateCell(day: number, slot: number): number | null {
    if (!this.attendanceCount()) return null;
    const starts = [6, 9, 12, 15, 18];
    return this.performanceVisits().filter((v) => {
      const a = v.attendance.find((a) => a.personId === this.id && a.start);
      const hour = Number(v.start.slice(0, 2));
      const weekday = (new Date(v.date + 'T12:00:00Z').getUTCDay() + 6) % 7;
      const expected = londonInstant(v.date, v.start);
      return (
        !!a &&
        !!expected &&
        weekday === day &&
        hour >= starts[slot] &&
        hour < (slot === 4 ? 22 : starts[slot + 1]) &&
        Date.parse(a.start) > Date.parse(expected)
      );
    }).length;
  }
  protected lateTone(value: number | null): string {
    return value === null
      ? 'empty'
      : value === 0
        ? 'zero'
        : value === 1
          ? 'one'
          : value === 2
            ? 'two'
            : 'three';
  }
  protected clientPunctuality(id: string): string {
    const visits = this.performanceVisits().filter(
      (v) => v.clientId === id && v.attendance.some((a) => a.personId === this.id && a.start),
    );
    if (!visits.length) return 'Not recorded';
    return (
      Math.round(
        (visits.filter((v) => {
          const actual = v.attendance.find((a) => a.personId === this.id)!;
          const expected = londonInstant(v.date, v.start);
          return !!expected && Date.parse(actual.start) <= Date.parse(expected);
        }).length /
          visits.length) *
          100,
      ) + '%'
    );
  }
  protected strengthRatings() {
    return this.latestAppraisal()?.competencies?.filter((c) => c.score >= 4) ?? [];
  }
  protected developmentRatings() {
    return this.latestAppraisal()?.competencies?.filter((c) => c.score < 3) ?? [];
  }
  protected periodEnd(): string {
    const d = new Date(this.period + '-01T12:00:00Z');
    if (Number.isNaN(d.getTime())) return this.staffApi.localDate();
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(0);
    return d.toISOString().slice(0, 10);
  }
  protected performanceVisits() {
    return ([] as NonNullable<ReturnType<typeof this.hr.store.data>['rota']>['visits']).filter(
      (v) =>
        v.staffIds.includes(this.id) && v.date.startsWith(this.period) && v.state !== 'Cancelled',
    );
  }
  protected completedVisits(): number {
    return this.performanceVisits().filter((v) =>
      v.attendance.some((a) => a.personId === this.id && a.start && a.end),
    ).length;
  }
  protected punctuality(): string {
    const visits = this.performanceVisits().filter((v) =>
      v.attendance.some((a) => a.personId === this.id && a.start),
    );
    if (!visits.length) return 'Not recorded';
    const onTime = visits.filter((v) => {
      const a = v.attendance.find((a) => a.personId === this.id)!;
      const scheduled = londonInstant(v.date, v.start);
      return !!scheduled && Date.parse(a.start) <= Date.parse(scheduled);
    }).length;
    return Math.round((onTime / visits.length) * 100) + '%';
  }
  protected course(id: string): string {
    return this.courses.find((c) => c.id === id)?.title ?? id;
  }
  protected edit(): void {
    const p = this.person();
    if (!p || !this.canEdit()) return;
    this.draft = structuredClone(p);
    this.baseline = JSON.stringify(this.draft);
    this.audit = this.staffApi.value()?.etag ?? '';
    this.editing.set(true);
    this.error.set('');
  }
  protected cancel(reload = false): void {
    this.editing.set(false);
    this.draft = null;
    this.error.set('');
    if (reload) void this.staffApi.load(this.id, true);
  }
  protected async save(): Promise<void> {
    if (!this.draft || this.busy()) return;
    if (this.draft.id !== this.id) {
      this.error.set('The selected employee changed. Cancel these edits before continuing.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.staffApi.save(this.draft as OnboardingPerson, this.section, this.audit);
      this.cancel();
      this.notice.set('Staff details saved securely.');
    } catch (error) {
      this.error.set(this.staffApi.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  private async commit(change: (p: Person) => void, action: string): Promise<boolean> {
    const person = this.person();
    if (!person || this.busy()) return false;
    const p = structuredClone(person);
    change(p);
    this.busy.set(true);
    this.error.set('');
    try {
      await this.staffApi.commit(person, p);
      this.notice.set('Changes saved securely.');
      return true;
    } catch (error) {
      this.error.set(this.staffApi.message(error));
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  protected async addNote(): Promise<void> {
    if (!this.note.trim()) return;
    if (
      await this.commit(
        (p) => {
          p.hr!.notes.push({
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            author: this.hr.auth.currentUser()!.name,
            text: this.note.trim(),
            reflective: this.reflective,
          });
        },
        this.reflective ? 'Reflective practice added' : 'Note added',
      )
    )
      this.note = '';
  }
  protected async requestDocument(): Promise<void> {
    if (!this.requestTitle.trim()) return;
    if (
      await this.commit((p) => {
        p.hr!.requests.push({
          id: crypto.randomUUID(),
          title: this.requestTitle.trim(),
          at: new Date().toISOString(),
          status: 'Open',
        });
      }, 'Document request recorded')
    ) {
      this.requestTitle = '';
      this.notice.set('Request saved securely. No message has been sent.');
    }
  }
  protected async fulfill(id: string): Promise<void> {
    await this.commit((p) => {
      p.hr!.requests = p.hr!.requests.map((r) => (r.id === id ? { ...r, status: 'Fulfilled' } : r));
    }, 'Document request fulfilled');
  }
  protected async verifyDocument(id: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.staffApi.verify(id);
      this.notice.set('Document verification saved.');
    } catch (error) {
      this.error.set(this.staffApi.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async previewDocument(id: string): Promise<void> {
    const d = this.documents().find((doc) => doc.id === id);
    if (!d) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(d.type)) {
      this.notice.set('Use Download to open this document in its supported application.');
      return;
    }
    try {
      const blob = await this.staffApi.file(id);
      this.closePreview();
      const url = URL.createObjectURL(blob);
      this.preview.set({
        url,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url),
        type: d.type,
        name: d.name,
      });
    } catch (error) {
      this.error.set(this.staffApi.message(error));
    }
  }
  protected closePreview(): void {
    const p = this.preview();
    if (p) URL.revokeObjectURL(p.url);
    this.preview.set(null);
  }
  protected async download(id: string): Promise<void> {
    const d = this.documents().find((doc) => doc.id === id);
    if (!d) return;
    try {
      const blob = await this.staffApi.file(id),
        url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = d.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      this.error.set(this.staffApi.message(error));
    }
  }
  protected async addAction(): Promise<void> {
    if (!this.action.title.trim() || !this.action.owner.trim() || !dateValid(this.action.due)) {
      this.error.set('Enter action, owner and due date.');
      return;
    }
    if (
      await this.commit((p) => {
        p.hr!.actions.push({
          id: crypto.randomUUID(),
          ...this.action,
          status: 'Open',
          evidence: '',
        });
      }, 'Action plan item added')
    )
      this.action = { title: '', owner: '', due: '' };
  }
  protected async completeAction(id: string, evidence: string): Promise<void> {
    if (!evidence.trim()) {
      this.error.set('Record completion evidence before closing the action.');
      return;
    }
    await this.commit((p) => {
      p.hr!.actions = p.hr!.actions.map((a) =>
        a.id === id ? { ...a, status: 'Completed', evidence } : a,
      );
    }, 'Action plan item completed');
  }
  protected async bookTraining(): Promise<void> {
    if (
      !this.booking.courseId ||
      !dateValid(this.booking.date) ||
      this.booking.date < this.staffApi.localDate() ||
      !this.booking.provider.trim()
    ) {
      this.error.set('Choose a course, a date from today onward and a provider or assessor.');
      return;
    }
    if (
      this.person()?.hr.bookings?.some(
        (b) =>
          b.status === 'Scheduled' &&
          b.courseId === this.booking.courseId &&
          b.date === this.booking.date &&
          b.type === this.booking.type,
      )
    ) {
      this.error.set('This training session is already scheduled.');
      return;
    }
    if (
      await this.commit((p) => {
        p.hr!.bookings!.push({ id: crypto.randomUUID(), ...this.booking, status: 'Scheduled' });
      }, this.booking.type + ' scheduled')
    ) {
      this.booking = { courseId: '', date: '', provider: '', type: 'Training' };
      this.notice.set('Session saved securely. No provider notification has been sent.');
    }
  }
  protected async cancelBooking(id: string): Promise<void> {
    await this.commit((p) => {
      p.hr!.bookings = p.hr!.bookings!.map((b) =>
        b.id === id ? { ...b, status: 'Cancelled' } : b,
      );
    }, 'Training booking cancelled');
  }
  protected monthlyTrend(): { month: string; assigned: number; completed: number }[] {
    const months = [];
    const now = new Date(this.period + '-01T12:00:00Z');
    if (Number.isNaN(now.getTime())) return [];
    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(now);
      date.setUTCMonth(date.getUTCMonth() - offset);
      const month = date.toISOString().slice(0, 7);
      const visits = (
        [] as NonNullable<ReturnType<typeof this.hr.store.data>['rota']>['visits']
      ).filter(
        (v) => v.staffIds.includes(this.id) && v.date.startsWith(month) && v.state !== 'Cancelled',
      );
      months.push({
        month,
        assigned: visits.length,
        completed: visits.filter((v) => v.attendance.some((a) => a.personId === this.id && a.end))
          .length,
      });
    }
    return months;
  }
  protected trendHeight(value: number): number {
    const max = Math.max(1, ...this.monthlyTrend().map((t) => t.assigned));
    return (value / max) * 130;
  }
  protected assignedClients(): { id: string; name: string; visits: number }[] {
    const groups = new Map<string, { id: string; name: string; visits: number }>();
    for (const visit of this.performanceVisits()) {
      const c = groups.get(visit.clientId) ?? {
        id: visit.clientId,
        name: visit.clientName,
        visits: 0,
      };
      c.visits++;
      groups.set(c.id, c);
    }
    return [...groups.values()];
  }
  protected async scheduleReview(): Promise<void> {
    if (this.busy() || !this.canScheduleReview()) return;
    const kind = this.reviewTypes.find((t) => t.title === this.review.type);
    if (!kind || !dateValid(this.review.date) || !this.review.assessor.trim()) {
      this.error.set('Choose a review type, date and assessor.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.reviewApi.create(
        {
          staff_id: this.id,
          type_id: kind.id,
          date: this.review.date,
          assessor: this.review.assessor.trim(),
          reason: '',
        },
        this.reviewKey,
      );
      this.reviewKey = crypto.randomUUID();
      this.review = { type: 'Supervision', date: '', assessor: '', discussion: '', outcome: '' };
      this.showReviewForm = false;
      this.notice.set('Review scheduled.');
      await Promise.all([this.reviewApi.load('', '', this.id), this.staffApi.load(this.id, true)]);
    } catch (error) {
      this.error.set(this.reviewApi.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async completeReview(
    id: string,
    discussion: string,
    outcome: string,
    rating = '',
  ): Promise<void> {
    const row = this.reviews().find((r) => r.id === id);
    if (!row || !row.can_complete || this.busy()) return;
    const competencies = Object.entries(this.competencyDrafts[id] ?? {})
      .filter(([, v]) => v !== null)
      .map(([title, score]) => ({ title, score: score!, observation: '' }));
    const score = rating.trim() ? Number(rating) : null;
    if (
      !discussion.trim() ||
      !outcome.trim() ||
      (row.type === 'Annual appraisal' && score === null) ||
      (score !== null && (!Number.isFinite(score) || score < 1 || score > 5)) ||
      competencies.some((c) => !Number.isFinite(c.score) || c.score < 1 || c.score > 5)
    ) {
      this.error.set('Record the discussion, outcome and valid ratings before completion.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.reviewApi.complete(row, {
        discussion: discussion.trim(),
        outcome: outcome.trim(),
        score: score === null ? null : String(score),
        competencies: competencies.map((c) => ({ ...c, score: String(c.score) })),
        reason: 'Completed following recorded discussion and outcome.',
      });
      this.notice.set('Completed review saved and locked.');
      await Promise.all([this.reviewApi.load('', '', this.id), this.staffApi.load(this.id, true)]);
    } catch (error) {
      this.error.set(this.reviewApi.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async requestLeave(): Promise<void> {
    if (this.busy() || !this.canRequestLeave()) return;
    if (
      !this.leave.type ||
      !dateValid(this.leave.start) ||
      !dateValid(this.leave.end) ||
      this.leave.end < this.leave.start
    ) {
      this.error.set('Choose a leave type and valid dates.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.leaveApi.request(
        {
          staff_id: this.id,
          type_id: this.leave.type,
          start: this.leave.start,
          end: this.leave.end,
          reason: '',
        },
        this.leaveKey,
      );
      this.leaveKey = crypto.randomUUID();
      this.leave = { type: '', start: '', end: '' };
      this.notice.set('Leave request submitted.');
      await Promise.all([this.staffApi.load(this.id, true), this.leaveApi.load('', '', this.id)]);
    } catch (error) {
      this.error.set(this.leaveApi.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async leaveStatus(
    id: string,
    status: 'Approved' | 'Rejected' | 'Cancelled',
  ): Promise<void> {
    const row = this.leaves().find((r) => r.id === id);
    if (!row || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.leaveApi.transition(
        row,
        ({ Approved: 'approve', Rejected: 'reject', Cancelled: 'cancel' } as const)[status],
      );
      this.notice.set('Leave ' + status.toLowerCase() + '.');
      await Promise.all([this.staffApi.load(this.id, true), this.leaveApi.load('', '', this.id)]);
    } catch (error) {
      this.error.set(this.leaveApi.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected exportPerformance(): void {
    if (!this.hr.can('export') || !this.person()) return;
    const cell = (v: string) =>
      '"' + (/^\s*[=+@-]|^[\t\r\n]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"';
    const rows = [
      ['Staff reference', this.person()!.hr.reference],
      ['Month', this.period],
      ['Assigned visits', String(this.performanceVisits().length)],
      ['Completed attendance', String(this.completedVisits())],
      ['On-time attendance', this.punctuality()],
      [],
      ['Date', 'Service user', 'Visit', 'Scheduled start', 'Scheduled end'],
      ...this.performanceVisits().map((v) => [v.date, v.clientName, v.callName, v.start, v.end]),
    ];
    this.hr.store.download(
      'staff-performance-' + this.period + '.csv',
      rows.map((row) => row.map(cell).join(',')).join('\r\n'),
      'text/csv',
    );
  }
  private hasChanges(): boolean {
    return (
      !!this.pendingDocument() ||
      this.uploadBusy() ||
      (this.editing() && this.baseline !== JSON.stringify(this.draft)) ||
      !!(
        this.note.trim() ||
        this.requestTitle.trim() ||
        this.action.title.trim() ||
        this.action.owner.trim() ||
        this.action.due ||
        this.booking.courseId ||
        this.booking.date ||
        this.booking.provider.trim() ||
        this.review.date ||
        this.review.assessor.trim() ||
        this.leave.start ||
        this.leave.end
      )
    );
  }
  canLeave(): boolean {
    return (
      !this.hasChanges() ||
      window.confirm('You have unsaved staff details. Leave without saving them?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected beforeUnload(
    event: BeforeUnloadEvent,
  ): void {
    if (this.hasChanges()) event.preventDefault();
  }
}
