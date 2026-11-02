import { CarePlanSectionNav } from './care-plan-section-nav';
import { CarePlanPersonalCare } from './care-plan-personal-care';
import { CarePlanIdentityHeader } from './care-plan-identity-header';
import { CarePlanMobility, MobilityLink } from './care-plan-mobility';
import { CarePlanOverview } from './care-plan-overview';
import { CarePlanAboutMeEditor } from './care-plan-about-me-editor';
import { CarePlanAboutMe } from './care-plan-about-me';
import { ScrollingTabs } from './scrolling-tabs';
import {
  WORKSPACE_MODULES,
  CARE_AREA_TABS,
  CARE_WORKFLOW_TABS,
  STAGE_TABS,
  MODULE_TABS,
  moduleForTab,
  SERVICE_USER_RECORDS,
} from './care-plan-workspace.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ASSESSMENT_FIELDS,
  ASSESSMENT_AREAS,
  seededAssessment,
} from './care-plan-assessment.models';
import {
  REVIEW_SOURCE_CATEGORIES,
  WORDING_SCENARIOS,
  ReviewFinding,
  ReviewReport,
  ReviewSource,
  WordingProposal,
  seededReviewReport,
  visibleReviewFindings,
  wordingExample,
} from './care-plan-review.models';
import { ApprovedCareInstructions } from './approved-care-instructions';
import {
  Component,
  ChangeDetectorRef,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CarePlanService } from './care-plan.service';
import {
  ABOUT_ME_FIELDS,
  BodyObservation,
  CarePlanRecord,
  PLAN_FIELDS,
  PLAN_SECTIONS,
  PlanAssessment,
  PlanVersion,
  planIssues,
  planDate,
  sectionError,
} from './care-plan.models';

@Component({
  selector: 'cv-care-plan',
  imports: [
    CarePlanSectionNav,
    CarePlanPersonalCare,
    CarePlanIdentityHeader,
    CarePlanMobility,
    CarePlanOverview,
    CarePlanAboutMeEditor,
    CarePlanAboutMe,
    ApprovedCareInstructions,
    FormsModule,
    DatePipe,
    RouterLink,
    ScrollingTabs,
  ],
  templateUrl: './care-plan.html',
  styleUrls: [
    './care-shared.css',
    './care-controls.css',
    './care-plan.css',
    './care-plan-workspace.css',
  ],
})
export class CarePlan implements OnDestroy {
  protected readonly service = inject(CarePlanService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly modules = WORKSPACE_MODULES;
  protected editingAboutMe = false;
  protected aboutEditDirty = false;
  protected startAboutEdit() {
    if (this.editable()) {
      this.editingAboutMe = true;
      this.aboutEditDirty = false;
      this.aboutVoiceOpen = false;
    }
  }
  protected cancelAboutEdit() {
    this.editingAboutMe = false;
    this.aboutEditDirty = false;
  }
  private leaveAboutEdit() {
    if (
      this.editingAboutMe &&
      this.aboutEditDirty &&
      !window.confirm('Discard unsaved About Me edits?')
    )
      return false;
    this.cancelAboutEdit();
    return true;
  }
  protected saveAboutEdit(plan: PlanVersion) {
    if (!this.record || !this.editable()) return;
    const error = this.service.commit(
      this.id,
      this.workspace,
      plan,
      this.record.revision,
      'save',
      '',
    );
    this.error.set(error || '');
    if (!error) {
      this.load(plan.id);
      this.cancelAboutEdit();
      this.notice.set('About Me changes saved.');
    }
  }
  protected readonly careAreas = CARE_AREA_TABS;
  protected readonly workflowSteps = CARE_WORKFLOW_TABS;
  protected workspaceView = 'overview';
  protected aboutVoiceOpen = false;
  protected sectionPanel = 'assessment';
  protected readonly sectionPanels = [
    { id: 'assessment', label: 'Current assessment' },
    { id: 'goals', label: 'Goals & outcomes' },
    { id: 'risks', label: 'Risks & escalation' },
    { id: 'instructions', label: 'Carer instructions' },
    { id: 'history', label: 'History' },
    { id: 'linked', label: 'Linked information' },
  ];
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly id =
    this.route.snapshot.paramMap.get('id') || this.route.snapshot.parent?.paramMap.get('id') || '';
  protected readonly workspace = this.service.care.store.companyId();
  protected readonly client = computed(() => this.service.care.client(this.id));
  protected tab = 'Overview';
  protected index = 0;
  protected plan?: PlanVersion;
  protected record?: CarePlanRecord;
  protected error = signal('');
  protected notice = signal('');
  protected get fields() {
    return this.section?.name === 'About Me' ? [...PLAN_FIELDS, ...ABOUT_ME_FIELDS] : PLAN_FIELDS;
  }
  protected readonly assistanceOptions = [
    'Support with washing',
    'Support with oral hygiene',
    'Support with dressing',
    'Support with shaving',
    'Support with toileting',
    'Support with continence care',
    'Support with skin care',
  ];
  protected readonly equipmentOptions = [
    'Shower chair',
    'Bath board',
    'Grab rails',
    'Non-slip mat',
    'Long-handled sponge',
  ];
  protected toggleOption(field: string, option: string, selected: boolean) {
    const lines = (this.section.fields[field] || '')
      .split('\n')
      .filter((line) => line !== option && line.trim());
    if (selected) lines.push(option);
    this.section.fields[field] = lines.join('\n');
    this.section.complete = false;
  }
  protected hasOption(field: string, option: string) {
    return (this.section.fields[field] || '').split('\n').includes(option);
  }
  protected readonly detailFields = [
    ['name', 'Full name'],
    ['preferred', 'Preferred name'],
    ['gender', 'Gender'],
    ['ethnicity', 'Ethnicity'],
    ['marital', 'Marital status'],
    ['dob', 'Date of birth'],
    ['nhs', 'NHS number'],
    ['address', 'Address'],
    ['phone', 'Telephone'],
    ['email', 'Email'],
    ['language', 'Primary language'],
    ['religion', 'Religion / culture'],
    ['allergies', 'Known allergies'],
    ['risks', 'Key risks'],
    ['access', 'Home access / key safe'],
    ['contacts', 'Family, GP, pharmacy and other professionals'],
  ];
  protected readonly capacityFields = [
    ['decision', 'Specific care decision and capacity finding'],
    ['assessment', 'Areas requiring assessment / assessment reference'],
    ['welfare', 'LPA · Health & Welfare'],
    ['finance', 'LPA · Property & Financial Affairs'],
    ['deputy', 'Deputy / advocate and authority'],
    ['bestInterests', 'Best-interest decision, consultation and rationale'],
  ];
  protected readonly sources = [
    'Service user',
    'Service user and family member',
    'Family representative',
    'Attorney/LPA',
    'Advocate',
    'Professional',
    'Other authorised representative',
  ];
  protected readonly assessmentNames = [
    'Falls / Moving & Handling',
    'Medication risk',
    'Behaviour / PBS',
    'Communication',
    'Skin / pressure',
    'Mental Capacity',
    'Dysphagia',
    'Seizure',
    'Environment / fire',
  ];
  protected readonly calls = computed(() =>
    this.service.care.rota.data().calls.filter((c) => c.clientId === this.id && c.active),
  );
  protected readonly wordingScenarios = WORDING_SCENARIOS;
  protected readonly sourceCategories = REVIEW_SOURCE_CATEGORIES;
  protected wordingScenario = 'No change';
  protected wordingProposals: WordingProposal[] = [];
  protected wordingStatus = 'Ready';
  protected report: ReviewReport = seededReviewReport();
  protected reviewSeverity = 'All';
  protected reviewDecision = 'All';
  protected selectedSource?: ReviewSource;
  protected reviewStatus = 'Demo results ready';
  protected transcript = '';
  protected suggestion = '';
  protected voiceField = 'situation';
  protected listening = false;
  private recognition?: {
    start(): void;
    stop(): void;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
    lang: string;
    continuous: boolean;
    interimResults: boolean;
  };
  protected photoConsent = false;
  protected view: 'Front' | 'Back' = 'Front';
  protected observation = this.blankObservation();
  protected assessment: PlanAssessment = this.blankAssessment();
  protected reason = '';
  private clean = '';
  constructor() {
    const stage = this.route.snapshot.queryParamMap.get('stage');
    this.tab = (stage && STAGE_TABS[stage]) || 'Overview';
    const requestedView = this.route.snapshot.queryParamMap.get('view');
    this.workspaceView =
      requestedView && this.modules.some((m) => m.id === requestedView)
        ? requestedView
        : moduleForTab(this.tab);
    if (requestedView && MODULE_TABS[requestedView]) this.tab = MODULE_TABS[requestedView];
    if (
      requestedView === 'care-plan' &&
      stage &&
      CARE_WORKFLOW_TABS.some((step) => step.id === STAGE_TABS[stage])
    )
      this.tab = STAGE_TABS[stage];
    const area = this.route.snapshot.queryParamMap.get('area');
    if (area) this.index = Math.max(0, PLAN_SECTIONS.indexOf(area));
    this.load();
    this.route.queryParamMap?.pipe(takeUntilDestroyed()).subscribe((params) => {
      const requested =
        params.get('view') || moduleForTab(STAGE_TABS[params.get('stage') || ''] || 'Overview');
      if (!this.modules.some((m) => m.id === requested)) return;
      const changesEditorContext =
        requested !== this.workspaceView ||
        (!!params.get('area') && params.get('area') !== PLAN_SECTIONS[this.index]) ||
        (!!params.get('stage') && STAGE_TABS[params.get('stage')!] !== this.tab);
      if (this.editingAboutMe && changesEditorContext && !this.leaveAboutEdit()) {
        this.syncWorkspace(true);
        return;
      }
      this.workspaceView = requested;
      this.tab = MODULE_TABS[requested] || 'Overview';
      const area = params.get('area');
      if (requested === 'care-plan' && area && PLAN_SECTIONS.includes(area)) {
        this.index = PLAN_SECTIONS.indexOf(area);
        this.tab = 'Care sections';
      }
      const stage = params.get('stage');
      if (
        stage &&
        STAGE_TABS[stage] &&
        (moduleForTab(STAGE_TABS[stage]) === requested ||
          (requested === 'care-plan' &&
            CARE_WORKFLOW_TABS.some((step) => step.id === STAGE_TABS[stage])))
      )
        this.tab = STAGE_TABS[stage];
      this.changeDetector.markForCheck();
    });
    effect(() => {
      if (this.service.read(this.id) && !this.record) this.load();
    });
  }
  protected load(version?: string) {
    this.record = this.service.read(this.id)
      ? structuredClone(this.service.read(this.id))
      : undefined;
    this.plan = structuredClone(
      this.record?.versions.find((v) => {
        const requested = version || this.route.snapshot.queryParamMap.get('version');
        if (requested === 'approved') return v.status === 'Approved';
        if (!requested || requested === 'working') return ['Draft', 'In review'].includes(v.status);
        return v.id === requested || v.version === requested;
      }) || this.record?.versions[0],
    );
    this.clean = JSON.stringify(this.plan);
    this.report = structuredClone(this.plan?.reviewReport || seededReviewReport());
    this.wordingProposals = [];
    this.wordingStatus = 'Ready';
  }
  protected start() {
    this.error.set(this.service.initialise(this.id, this.workspace) || '');
    this.load();
  }
  protected editable() {
    return this.plan?.status === 'Draft' && this.service.canEdit();
  }
  protected dirty() {
    return JSON.stringify(this.plan) !== this.clean;
  }
  canLeave() {
    return (
      (!this.dirty() && !this.aboutEditDirty) ||
      window.confirm('Discard unsaved care-plan changes?')
    );
  }
  protected get workingPlan() {
    return this.record?.versions.find((v) => ['Draft', 'In review'].includes(v.status));
  }
  protected get approvedPlan() {
    return this.record?.versions.find((v) => v.status === 'Approved');
  }
  protected initials(name: string) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
  }
  protected openServiceUserRecord(view: string) {
    const record = SERVICE_USER_RECORDS[view];
    if (!record) return;
    void this.router
      .navigate(
        record.path ? ['/manage/clients', this.id, record.path] : ['/manage/clients', this.id],
        { queryParams: record.section ? { section: record.section } : undefined },
      )
      .catch(() =>
        this.error.set('Could not open the service-user record. Your draft is retained.'),
      );
  }
  protected openWorkspace(view: string) {
    if (!SERVICE_USER_RECORDS[view] && !this.leaveAboutEdit()) return;
    if (SERVICE_USER_RECORDS[view]) {
      this.openServiceUserRecord(view);
      return;
    }
    if (!this.modules.some((m) => m.id === view)) return;
    this.workspaceView = view;
    this.tab = view === 'visit-notes' ? 'Visit notes' : MODULE_TABS[view];
    this.syncWorkspace();
  }
  protected openWorkflowTab(tab: string) {
    if (!this.leaveAboutEdit()) return;
    this.tab = tab;
    this.workspaceView = CARE_WORKFLOW_TABS.some((step) => step.id === tab)
      ? 'care-plan'
      : moduleForTab(tab);
    this.syncWorkspace();
  }
  protected selectArea(id: string) {
    const index = Number(id.replace('area-', ''));
    if (Number.isInteger(index) && index >= 0 && index < PLAN_SECTIONS.length)
      this.goSection(index);
  }
  private syncWorkspace(replaceUrl = false) {
    this.changeDetector.markForCheck();
    const stage = Object.keys(STAGE_TABS).find((s) => STAGE_TABS[s] === this.tab) || null;
    void this.router
      .navigate(['/manage/care-plans', this.id], {
        queryParams: {
          view: this.workspaceView,
          stage,
          area: this.tab === 'Care sections' ? PLAN_SECTIONS[this.index] : null,
          version: this.plan?.id || null,
        },
        replaceUrl,
      })
      .catch(() => this.error.set('Could not update the workspace link. Your draft is retained.'));
  }
  protected get personalCareView() {
    return (
      this.service.canEdit() &&
      this.workspaceView === 'care-plan' &&
      this.tab === 'Care sections' &&
      this.index === 1
    );
  }
  protected personalCareAction(action: string) {
    if (action === 'previous') this.goSection(0);
    else if (action === 'next') this.goSection(2);
    else if (action === 'save') this.save();
    else if (action === 'complete') this.markComplete();
    else if (action === 'body') this.openWorkspace('body');
    else if (action === 'skin') {
      const assessment = this.plan?.assessments.find((record) =>
        /skin|pressure/i.test(record.name),
      );
      this.openWorkspace('assessments');
      if (assessment) this.editAssessment(assessment);
      else this.notice.set('No skin assessment is recorded. Use Assessments to add one.');
    } else if (action === 'incidents')
      void this.router.navigate(['/manage/clients', this.id, 'incidents'], {
        queryParams: { related: 'personal-care' },
      });
  }
  protected get mobilityView() {
    return (
      this.service.canEdit() &&
      this.workspaceView === 'care-plan' &&
      this.tab === 'Care sections' &&
      this.index === 2
    );
  }
  protected mobilityAction(action: string) {
    if (action === 'voice') {
      this.openVoice();
      this.recordVoice();
    }
    if (action === 'improve') {
      this.openVoice();
      this.loadWordingExample();
      this.suggest();
    }
    if (action === 'save') this.save();
    if (action === 'complete') this.markComplete();
    if (action === 'add-document')
      void this.router.navigate(['/manage/clients', this.id, 'documents'], {
        queryParams: { create: '1', section: 'Mobility' },
      });
  }
  protected viewMobilityDocument(id: string) {
    if (!this.service.care.documents(this.id).some((document) => document.id === id)) return;
    void this.router.navigate(['/manage/clients', this.id, 'documents'], {
      queryParams: { document: id },
    });
  }
  protected openMobilityRecord(record: MobilityLink) {
    if (record.kind === 'assessment') {
      const assessment = this.plan?.assessments.find((a) => a.id === record.id);
      if (assessment) {
        this.openWorkspace('assessments');
        this.editAssessment(assessment);
      }
    } else if (record.kind === 'incident')
      void this.router.navigate(['/manage/clients', this.id, 'incidents'], {
        queryParams: { entry: record.id },
      });
    else
      void this.router.navigate(['/manage/clients', this.id], {
        queryParams: { section: 'risks', entry: record.id },
      });
  }
  protected overviewAction(action: string) {
    if (action === 'details') {
      void this.router.navigate(['/manage/clients', this.id], {
        queryParams: { section: 'details' },
      });
    } else if (action === 'package') this.openWorkflowTab('Call package');
    else if (action === 'review') this.beginReview();
    else if (action === 'voice') {
      this.goSection(0);
      this.openVoice();
    } else if (action === 'quality' || action === 'body') this.openWorkspace(action);
    else if (action === 'history') void this.router.navigate(['/manage/clients', this.id, 'audit']);
    else if (action === 'contacts' || action === 'risks') this.openServiceUserRecord(action);
    else if (action === 'pdf') this.downloadApproved();
    else if (action === 'view-plan') {
      const target = this.approvedPlan || this.plan;
      if (target && target.id !== this.plan?.id) {
        if (this.dirty() && !window.confirm('Discard unsaved care-plan changes?')) return;
        this.load(target.id);
      }
      this.goSection(0);
    } else if (['incident', 'complaint', 'compliment'].includes(action)) {
      void this.router.navigate(
        ['/manage/clients', this.id, action === 'compliment' ? 'feedback' : 'incidents'],
        { queryParams: { create: action } },
      );
    }
  }
  protected identityHeaderAction(action: string) {
    if (action === 'back') {
      if (this.editingAboutMe) {
        this.leaveAboutEdit();
        return;
      }
      const state = this.location.getState() as { navigationId?: number };
      if ((state?.navigationId || 0) > 1) this.location.back();
      else void this.router.navigate(['/manage/care-plans']);
    } else if (action === 'print') this.printOverview();
    else if (action === 'share') void this.shareOverview();
    else if (action === 'pdf') {
      if (this.approvedPlan) this.downloadApproved();
      else void this.previewPdf();
    } else if (action === 'versions') this.openWorkspace('versions');
    else if (action === 'save' && !this.editingAboutMe) this.save();
    else if (action === 'review') this.beginReview();
    else if (action === 'create') this.start();
  }
  protected printOverview() {
    window.print();
  }
  protected async shareOverview() {
    try {
      const url = new URL(
        '/manage/care-plans/' + encodeURIComponent(this.id),
        window.location.origin,
      );
      if (this.workspaceView !== 'overview') {
        url.searchParams.set('view', this.workspaceView);
        const stage = Object.keys(STAGE_TABS).find((key) => STAGE_TABS[key] === this.tab);
        if (stage) url.searchParams.set('stage', stage);
        if (this.tab === 'Care sections') url.searchParams.set('area', PLAN_SECTIONS[this.index]);
      }
      await navigator.clipboard.writeText(url.href);
      this.notice.set('Care-plan link copied. Access still requires an authorised account.');
    } catch {
      this.error.set('The link could not be copied. Copy the page address from your browser.');
    }
  }
  protected beginReview() {
    const working = this.workingPlan;
    if (working) {
      if (this.plan?.id !== working.id) {
        if (this.dirty() && !window.confirm('Discard unsaved care-plan changes?')) return;
        this.load(working.id);
      }
      this.openWorkflowTab('Client details');
      return;
    }
    if (this.plan?.status === 'Approved') this.save('review');
  }
  protected aboutAction(action: string) {
    if (action === 'edit') this.startAboutEdit();
    if (action === 'voice' || action === 'improve') this.openVoice();
    if (action === 'copy') this.copyPreviousSection();
    if (action === 'contacts') this.openServiceUserRecord('contacts');
    if (action === 'save') this.save();
    if (action === 'complete') this.markComplete();
    if (action === 'previous') this.openWorkspace('overview');
    if (action === 'next') this.goSection(1);
  }
  protected openVoice() {
    this.aboutVoiceOpen = true;
    this.sectionPanel = 'assessment';
    this.openWorkflowTab('Care sections');
    this.changeDetector.detectChanges();
    document
      .getElementById('care-plan-voice-panel')
      ?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }
  protected downloadApproved() {
    if (this.approvedPlan) void this.download(this.approvedPlan);
  }
  protected get contacts() {
    return this.client()?.file?.contacts || [];
  }
  protected sectionFields() {
    const fields = this.fields;
    if (this.sectionPanel === 'goals')
      return fields.filter((f) => ['goal', 'actions'].includes(f[0]));
    if (this.sectionPanel === 'risks')
      return fields.filter((f) => ['risks', 'actions'].includes(f[0]));
    if (this.sectionPanel === 'instructions')
      return fields.filter((f) => ['assistance', 'preferences', 'actions', 'risks'].includes(f[0]));
    return fields;
  }
  protected get previousSection() {
    const version = this.record?.versions.find(
      (v) => v.id !== this.plan?.id && ['Approved', 'Superseded'].includes(v.status),
    );
    return version?.sections.find((s) => s.name === this.section.name);
  }
  protected get sectionHistory() {
    return (this.plan?.events || []).filter((e) => e.detail.includes(this.section.name));
  }
  protected copyPreviousSection() {
    if (!this.editable() || !this.previousSection) return;
    const previous = structuredClone(this.section.fields);
    this.section.fields = structuredClone(this.previousSection.fields);
    this.section.required = this.previousSection.required;
    this.section.complete = false;
    this.plan!.events.push({
      at: new Date().toISOString(),
      by: this.service.care.auth.currentUser()!.name,
      action: 'Previous section wording copied to draft',
      detail: JSON.stringify({
        section: this.section.name,
        previous,
        current: this.section.fields,
      }),
    });
    this.notice.set('Previous wording copied to the draft. Review and save the section.');
  }
  protected get section() {
    return this.plan!.sections[this.index];
  }
  protected get completed() {
    return this.plan?.sections.filter((s) => s.complete || !s.required).length || 0;
  }
  protected issues() {
    return this.plan && this.client() ? planIssues(this.plan, this.client()!, this.calls()) : [];
  }
  protected save(action: 'save' | 'submit' | 'approve' | 'return' | 'review' | 'package' = 'save') {
    if (!this.plan || !this.record) return;
    const id = this.plan.id;
    const error = this.service.commit(
      this.id,
      this.workspace,
      this.plan,
      this.record.revision,
      action,
      this.reason,
    );
    this.error.set(error || '');
    if (!error) {
      this.notice.set(
        action === 'save'
          ? 'Draft saved. The approved plan and live rota are unchanged.'
          : `Care plan ${action} recorded.`,
      );
      this.load(action === 'review' ? 'working' : id);
      if (action === 'approve') void this.download();
      if (action === 'review') this.openWorkflowTab('Client details');
    }
  }
  protected markComplete() {
    const error = sectionError(this.section);
    this.error.set(error);
    if (!error) {
      this.section.complete = true;
      this.save();
    }
  }
  protected goSection(i: number) {
    if (!this.leaveAboutEdit()) return;
    this.workspaceView = 'care-plan';
    this.sectionPanel = 'assessment';
    this.aboutVoiceOpen = false;
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.stop();
    }
    this.listening = false;
    this.index = i;
    this.tab = 'Care sections';
    this.transcript = '';
    this.suggestion = '';
    this.wordingProposals = [];
    this.wordingStatus = 'Ready';
    this.syncWorkspace();
  }
  protected chooseVersion(id: string) {
    if (this.canLeave()) this.load(id);
  }
  protected recordVoice() {
    if (!this.editable()) return;
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) {
      this.error.set(
        'Voice transcription is unavailable in this browser. Enter or paste a transcript below.',
      );
      return;
    }
    if (this.listening) {
      this.recognition?.stop();
      return;
    }
    this.transcriptChanged();
    const r = new Speech();
    this.recognition = r;
    r.lang = 'en-GB';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++)
        this.transcript += (this.transcript ? ' ' : '') + event.results[i][0].transcript;
      this.changeDetector.markForCheck();
    };
    r.onerror = () => {
      this.error.set(
        'Recording could not continue. Check microphone permission or enter the transcript.',
      );
      this.listening = false;
    };
    r.onend = () => {
      this.listening = false;
      this.changeDetector.markForCheck();
    };
    try {
      r.start();
      this.listening = true;
    } catch {
      this.error.set('The microphone could not be started.');
    }
  }
  protected transcriptChanged() {
    this.wordingProposals = [];
    this.suggestion = '';
    this.wordingStatus = 'Transcript ready · generate suggestions';
  }
  protected voiceFieldChanged() {
    this.suggestion =
      this.wordingProposals.find((p) => p.field === this.voiceField && p.decision === 'Pending')
        ?.suggested || '';
  }
  protected loadWordingExample() {
    if (!this.editable()) return;
    this.transcript = wordingExample(this.section, this.wordingScenario, this.fields).transcript;
    this.wordingProposals = [];
    this.suggestion = '';
    this.wordingStatus = 'Transcript ready';
    this.error.set('');
  }
  protected suggest() {
    if (!this.editable()) return;
    if (!this.transcript.trim()) {
      this.error.set('Record or load a transcript first.');
      return;
    }
    if (this.wordingScenario === 'Service unavailable') {
      this.wordingProposals = [];
      this.suggestion = '';
      this.wordingStatus = 'Failed';
      this.error.set(
        'Demo service-unavailable state. Your transcript and existing care wording are retained. Select another scenario and retry.',
      );
      return;
    }
    const example = wordingExample(this.section, this.wordingScenario, this.fields);
    if (this.transcript.trim() === example.transcript) this.wordingProposals = example.proposals;
    else {
      const t = this.transcript.trim().replace(/\s+/g, ' ');
      this.wordingProposals = [
        {
          field: this.voiceField,
          label: this.fields.find((f) => f[0] === this.voiceField)?.[1] || this.voiceField,
          existing: this.section.fields[this.voiceField] || '',
          suggested: t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.'),
          reason: 'Transcript-based frontend preview. Confirm the wording before accepting.',
          decision: 'Pending',
        },
      ];
    }
    this.suggestion =
      this.wordingProposals.find((p) => p.field === this.voiceField)?.suggested || '';
    this.wordingStatus = 'Suggestions ready';
    this.error.set('');
    this.notice.set(
      'Seeded AI demo suggestions prepared. Accept or edit each change; nothing is published automatically.',
    );
  }
  protected decideWording(proposal: WordingProposal, decision: 'Accepted' | 'Rejected') {
    if (!this.plan || !this.editable() || proposal.decision !== 'Pending') return;
    if (decision === 'Accepted' && !proposal.suggested.trim()) {
      this.error.set('Enter suggested wording before accepting.');
      return;
    }
    const previous = this.section.fields[proposal.field] || '';
    if (decision === 'Accepted') {
      this.section.fields[proposal.field] = proposal.suggested;
      this.section.complete = false;
    }
    proposal.decision = decision;
    this.plan.events.push({
      at: new Date().toISOString(),
      by: this.service.care.auth.currentUser()!.name,
      action: `Draft wording ${decision.toLowerCase()}`,
      detail: JSON.stringify({
        section: this.section.name,
        field: proposal.field,
        previous,
        transcript: this.transcript,
        suggested: proposal.suggested,
        mode: 'Demo',
      }),
    });
    this.notice.set(
      `${proposal.label}: ${decision.toLowerCase()}. Save the draft to retain this decision.`,
    );
  }
  protected acceptAllWording() {
    this.wordingProposals.forEach((p) => this.decideWording(p, 'Accepted'));
  }
  protected filteredFindings() {
    return visibleReviewFindings(this.report, this.reviewSeverity, this.reviewDecision);
  }
  protected reviewCount(decision: string) {
    return visibleReviewFindings(this.report).filter((f) => f.decision === decision).length;
  }
  protected categoryEnabled(category: string) {
    return this.report.sources.filter((s) => s.category === category).every((s) => s.enabled);
  }
  protected toggleSourceCategory(category: string, enabled: boolean) {
    this.report.sources
      .filter((s) => s.category === category)
      .forEach((s) => (s.enabled = enabled));
  }
  protected runReview() {
    this.report.generatedAt = new Date().toISOString();
    this.reviewStatus = 'Review completed';
    this.selectedSource = undefined;
    if (this.plan && this.editable()) {
      this.plan.reviewReport = structuredClone(this.report);
      this.plan.events.push({
        at: this.report.generatedAt,
        by: this.service.care.auth.currentUser()!.name,
        action: 'Care-plan review run',
        detail: JSON.stringify({
          mode: 'Demo',
          sources: this.report.sources.filter((s) => s.enabled).map((s) => s.id),
          findings: this.filteredFindings().map((f) => f.id),
        }),
      });
    }
    this.notice.set(
      'AI demo review completed using the selected fictional evidence. Review each finding; nothing was published.',
    );
  }
  protected openSource(id: string) {
    this.selectedSource = this.report.sources.find((s) => s.id === id && s.enabled);
    this.changeDetector.detectChanges();
    document
      .getElementById('care-plan-source-preview')
      ?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }
  protected decideFinding(finding: ReviewFinding, decision: 'Accepted' | 'Rejected') {
    if (!this.plan || !this.editable() || finding.decision !== 'Pending') return;
    if (!finding.rationale.trim()) {
      this.error.set('Record a reviewer rationale before accepting or rejecting this finding.');
      return;
    }
    const section = this.plan.sections.find((s) => s.name === finding.section);
    if (!section) return;
    const previous = section.fields[finding.field] || '';
    if (decision === 'Accepted') {
      if (!finding.suggested.trim()) {
        this.error.set('Enter suggested wording before accepting.');
        return;
      }
      section.fields[finding.field] = finding.suggested;
      section.complete = false;
    }
    finding.decision = decision;
    this.plan.reviewReport = structuredClone(this.report);
    this.plan.events.push({
      at: new Date().toISOString(),
      by: this.service.care.auth.currentUser()!.name,
      action: `Review suggestion ${decision.toLowerCase()}`,
      detail: JSON.stringify({
        mode: 'Demo',
        finding: finding.title,
        section: finding.section,
        field: finding.field,
        previous,
        suggested: finding.suggested,
        sources: finding.sourceIds,
        rationale: finding.rationale,
      }),
    });
    this.error.set('');
    this.notice.set(`Finding ${decision.toLowerCase()}. Save the draft to retain the decision.`);
  }
  protected openFindingArea(name: string) {
    const index = this.plan?.sections.findIndex((s) => s.name === name) ?? -1;
    if (index >= 0) this.goSection(index);
  }
  protected acceptSuggestion() {
    if (!this.editable() || !this.suggestion.trim()) return;
    this.section.fields[this.voiceField] = this.suggestion;
    const matching = this.wordingProposals.find((p) => p.field === this.voiceField);
    if (matching) matching.decision = 'Accepted';
    this.plan!.events.push({
      at: new Date().toISOString(),
      by: this.service.care.auth.currentUser()!.name,
      action: 'Voice suggestion accepted',
      detail: JSON.stringify({
        section: this.section.name,
        field: this.voiceField,
        transcript: this.transcript,
        suggested: this.suggestion,
      }),
    });
    this.section.complete = false;
    this.suggestion = '';
    this.notice.set('Suggested wording applied to this draft. Save to retain it.');
  }
  protected rejectSuggestion() {
    if (this.plan && this.editable() && this.suggestion)
      this.plan.events.push({
        at: new Date().toISOString(),
        by: this.service.care.auth.currentUser()!.name,
        action: 'Voice suggestion rejected',
        detail: JSON.stringify({
          section: this.section.name,
          transcript: this.transcript,
          suggested: this.suggestion,
        }),
      });
    this.suggestion = '';
    this.notice.set('Suggestion rejected. Existing wording retained.');
  }
  protected blankObservation(): BodyObservation {
    return {
      id: '',
      view: 'Front',
      x: 50,
      y: 40,
      location: '',
      type: '',
      description: '',
      size: '',
      pain: '',
      date: new Date().toISOString().slice(0, 10),
      issue: 'New',
      action: '',
      professional: '',
      photo: '',
      related: '',
      status: 'Open',
      history: [],
    };
  }
  protected selectBody(event: MouseEvent) {
    if (!this.editable()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.observation.x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    this.observation.y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    this.observation.view = this.view;
    this.observation.location = `${this.view} · ${this.observation.y < 20 ? 'Head / neck' : this.observation.y < 52 ? 'Upper body' : this.observation.y < 72 ? 'Hip / upper leg' : 'Lower leg / foot'} (${this.observation.x}%, ${this.observation.y}%)`;
  }
  protected editObservation(b: BodyObservation) {
    this.observation = structuredClone(b);
    this.view = b.view;
  }
  protected async attachPhoto(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.photoConsent) {
      this.error.set('Confirm consent for care-record photography before attaching a photograph.');
      return;
    }
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 350000) {
      this.error.set('Choose a PNG or JPEG photograph under 350 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => (this.observation.photo = String(reader.result));
    reader.readAsDataURL(file);
  }
  protected saveObservation() {
    if (!this.plan || !this.editable()) return;
    const b = this.observation;
    if (!b.id) b.view = this.view;
    if (
      !planDate(b.date) ||
      b.date > new Date().toISOString().slice(0, 10) ||
      !Number.isFinite(Date.parse(b.date))
    ) {
      this.error.set('Enter a valid date identified, on or before today.');
      return;
    }
    if (![b.location, b.type, b.description, b.date, b.action].every((v) => v.trim())) {
      this.error.set('Record location, observation type, description, date identified and action.');
      return;
    }
    const old = this.plan.body.find((o) => o.id === b.id);
    b.id ||= crypto.randomUUID();
    b.history = [
      ...(old?.history || []),
      {
        at: new Date().toISOString(),
        by: this.service.care.auth.currentUser()!.name,
        detail: JSON.stringify({
          previous: old ? { ...old, history: [] } : null,
          current: { ...b, history: [] },
        }),
      },
    ];
    this.plan.body = [...this.plan.body.filter((o) => o.id !== b.id), structuredClone(b)];
    this.save();
    if (!this.error()) this.observation = this.blankObservation();
  }
  protected blankAssessment(): PlanAssessment {
    return {
      id: '',
      name: 'Falls / Moving & Handling',
      section: 'Mobility',
      findings: '',
      action: '',
      review: '',
      status: 'Recommended',
      fields: {},
    };
  }
  protected recommend() {
    if (!this.plan || !this.editable()) return;
    const map: [RegExp, string, string][] = [
      [/fall|transfer|mobility/i, 'Falls / Moving & Handling', 'Mobility'],
      [/medication|refus/i, 'Medication risk', 'Medication Support'],
      [/behavio/i, 'Behaviour / PBS', 'Mental Health / Behaviour'],
      [/communicat/i, 'Communication', 'Communication'],
      [/skin|pressure|wound/i, 'Skin / pressure', 'Personal Care'],
      [/swallow/i, 'Dysphagia', 'Nutrition & Hydration'],
      [/seizure/i, 'Seizure', 'Personal Care'],
      [/fire|environment/i, 'Environment / fire', 'Environment & Home Safety'],
    ];
    const text =
      this.plan.sections.map((s) => Object.values(s.fields).join(' ')).join(' ') +
      ' ' +
      this.plan.details['risks'];
    if (this.plan.capacity['concerns'] === 'Yes') map.push([/./, 'Mental Capacity', 'About Me']);
    for (const [pattern, name, section] of map)
      if (pattern.test(text) && !this.plan.assessments.some((a) => a.name === name))
        this.plan.assessments.push({
          ...this.blankAssessment(),
          id: crypto.randomUUID(),
          name,
          section,
        });
    this.notice.set('Recommended assessments added to the draft. Review and save them.');
  }
  protected saveAssessment() {
    if (!this.plan || !this.editable()) return;
    const a = this.assessment;
    if (a.status === 'Completed' && (!a.findings.trim() || !a.action.trim() || !a.review)) {
      this.error.set('Completed assessments need findings, actions and a review date.');
      return;
    }
    const previous = this.plan.assessments.find((x) => x.id === a.id);
    a.id ||= crypto.randomUUID();
    this.plan.assessments = [
      ...this.plan.assessments.filter((x) => x.id !== a.id),
      structuredClone(a),
    ];
    if (a.status === 'Completed') {
      const s = this.plan.sections.find((s) => s.name === a.section)!;
      if (previous?.status === 'Completed') {
        s.fields['risks'] = s.fields['risks']
          .replace(`${previous.name}: ${previous.findings}`, '')
          .trim();
        s.fields['actions'] = s.fields['actions'].replace(previous.action, '').trim();
      }
      s.fields['risks'] = [s.fields['risks'], `${a.name}: ${a.findings}`]
        .filter(Boolean)
        .join('\n');
      s.fields['actions'] = [s.fields['actions'], a.action].filter(Boolean).join('\n');
      s.review = a.review;
      s.complete = false;
    }
    this.save();
    if (!this.error()) this.assessment = this.blankAssessment();
  }
  protected get assessmentFields() {
    return ASSESSMENT_FIELDS[this.assessment.name] || [];
  }
  protected assessmentTypeChanged() {
    this.assessment.fields = {};
    this.assessment.section = ASSESSMENT_AREAS[this.assessment.name] || 'About Me';
  }
  protected loadAssessmentExample() {
    if (!this.editable()) return;
    const existing = this.plan!.assessments.find((a) => a.name === this.assessment.name);
    this.assessment = {
      ...seededAssessment(this.assessment.name, this.plan!.review),
      ...(existing ? { id: existing.id } : {}),
    };
    this.notice.set('Fictional assessment example loaded. Review the findings before saving.');
  }
  protected editAssessment(a: PlanAssessment) {
    this.assessment = { ...structuredClone(a), fields: structuredClone(a.fields || {}) };
  }

  protected weekdays(days: number[]) {
    return days.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
  }
  protected duration(start: string, end: string) {
    const n = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    return (n(end) - n(start) + 1440) % 1440;
  }
  protected async previewPdf() {
    if (!this.plan || !this.service.care.rota.can('export')) return;
    if (['Approved', 'Superseded'].includes(this.plan.status)) {
      await this.download();
      return;
    }
    try {
      const { createCarePlanPdf } = await import('./care-plan-pdf');
      createCarePlanPdf(this.plan).save(`care-plan-draft-v${this.plan.version}.pdf`);
    } catch {
      this.error.set('The PDF could not be created. Please try again.');
    }
  }
  protected async download(version?: PlanVersion) {
    const p = version || this.plan;
    if (
      !p ||
      !['Approved', 'Superseded'].includes(p.status) ||
      !this.service.care.rota.can('export')
    )
      return;
    try {
      const saved = [
        ...(this.client()?.file?.documents || []),
        ...(this.client()?.file?.documentArchive || []),
      ].find((d) => d.id === `care-plan-pdf-${p.id}`);
      if (saved) {
        const link = document.createElement('a');
        link.href = saved.data;
        link.download = `LQCS-care-plan-${this.id}-v${p.version}.pdf`;
        link.click();
        return;
      }
      const { createCarePlanPdf } = await import('./care-plan-pdf');
      const doc = createCarePlanPdf(p);
      const documentId = `care-plan-pdf-${p.id}`;
      if (!this.client()?.file?.documents?.some((d) => d.id === documentId)) {
        const error = this.service.care.saveDocument(this.id, this.workspace, {
          id: documentId,
          name: `LQCS Care Plan v${p.version}`,
          category: 'Care Plan',
          version: p.version,
          status: 'Current',
          issueDate: p.approvedAt.slice(0, 10),
          reviewDate: p.review,
          description:
            'Full approved care plan. Restricted management copy; use section disclosure controls for portal instructions.',
          visibility: { staff: false, family: false, inspector: false },
          data: doc.output('datauristring'),
          mime: 'application/pdf',
          size: doc.output('arraybuffer').byteLength,
          at: new Date().toISOString(),
          by: this.service.care.auth.currentUser()!.name,
        });
        if (error)
          this.error.set(`PDF generated, but the document could not be registered: ${error}`);
      }
      doc.save(`LQCS-care-plan-${this.id}-v${p.version}.pdf`);
    } catch {
      this.error.set(
        'The PDF could not be generated. The approved version is retained; retry the download.',
      );
    }
  }

  ngOnDestroy() {
    this.recognition?.stop();
  }
}
