import { RiskPrintPreview } from './risk-print-preview';
import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CareService } from './care.service';
import { CareHeader } from './care-header';
import { ModuleDesign } from '../shared/module-design';
import { PLAN_SECTIONS } from './care-plan.models';
import { londonDate } from '../rota/rota.models';
import {
  ASSISTANCE,
  DESIGNED_DOMAINS,
  LIKELIHOOD,
  RISK_DOMAINS,
  REVIEW_TRIGGERS,
  SEVERITY,
  RiskAssessment,
  RiskStatus,
  blankRisk,
  latestRisks,
  riskLevel,
} from './risk-assessment.models';

@Component({
  selector: 'cv-risk-assessments',
  imports: [DatePipe, FormsModule, RouterLink, CareHeader, ModuleDesign, RiskPrintPreview],
  host: { class: 'module-page operations-page' },
  templateUrl: './risk-assessments.html',
  styleUrls: [
    './risk-assessments-preview.css',
    './risk-assessments.css',
    './risk-assessment-navigation.css',
  ],
})
export class RiskAssessments {
  protected readonly care = inject(CareService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') || '');
  protected readonly client = computed(() => this.care.client(this.id()));
  protected readonly register = computed(
    () => this.client()?.file?.riskRegister ?? { revision: 0, assessments: [], history: [] },
  );
  protected readonly risks = computed(() => latestRisks(this.register().assessments));
  protected readonly approved = computed(() =>
    latestRisks(this.register().assessments.filter((a) => a.status === 'Approved')),
  );
  protected readonly legacy = computed(() => this.client()?.file?.entries['risks'] ?? []);
  protected readonly manager = computed(
    () =>
      this.care.rota.can('manage') &&
      ['PO', 'CA', 'RM'].includes(this.care.auth.currentUser()?.roleCode || ''),
  );
  protected readonly canEdit = computed(
    () =>
      this.care.rota.can('manage') &&
      ['PO', 'CA', 'RM', 'CC', 'FS'].includes(this.care.auth.currentUser()?.roleCode || ''),
  );
  protected readonly allowed = computed(() => this.canEdit());
  protected readonly domains = RISK_DOMAINS;
  protected readonly likelihood = LIKELIHOOD;
  protected readonly severity = SEVERITY;
  protected readonly assistance = ASSISTANCE;
  protected readonly triggers = REVIEW_TRIGGERS;
  protected readonly careAreas = PLAN_SECTIONS;
  protected readonly levels = ['Critical', 'High', 'Medium', 'Low'];
  protected readonly harmed = ['Service user', 'Staff', 'Family', 'Public', 'Property', 'Other'];
  protected readonly numbers = [1, 2, 3, 4, 5];
  protected readonly descending = [5, 4, 3, 2, 1];
  protected readonly level = riskLevel;
  protected readonly today = londonDate();
  protected readonly page = signal('overview');
  protected readonly tab = signal('Assessment');
  protected readonly selected = signal<RiskAssessment | null>(null);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected search = '';
  protected levelFilter = '';
  protected statusFilter = '';
  protected typeSearch = '';
  protected reason = '';
  private baseline = '';
  private owner = { id: '', workspace: '', revision: 0 };
  protected readonly navigation = [
    ['overview', 'Risk overview', 'dashboard'],
    ['summary', 'Summary & actions', 'checklist'],
    ['matrix', 'Risk matrix', 'grid_on'],
    ['history', 'Review history', 'history'],
    ['carer', 'Carer view', 'smartphone'],
  ];
  protected readonly commonFields = [
    ['description', 'Description of the risk / how harm could occur'],
    ['circumstances', 'Current circumstances'],
    ['controls', 'Existing controls / current measures'],
    ['instructions', 'Staff / carer instructions'],
    ['escalation', 'Escalation instructions'],
  ];
  constructor() {
    effect(() => {
      const id = this.id(),
        workspace = this.care.store.companyId();
      if (id !== this.owner.id || workspace !== this.owner.workspace) {
        this.selected.set(null);
        this.baseline = '';
        this.owner = { id, workspace, revision: this.register().revision };
        this.page.set('overview');
      }
    });
  }
  protected get filtered() {
    return this.risks().filter(
      (r) =>
        `${r.domain} ${r.specific}`.toLowerCase().includes(this.search.toLowerCase()) &&
        (!this.levelFilter ||
          riskLevel(r.residualLikelihood * r.residualSeverity) === this.levelFilter) &&
        (!this.statusFilter || r.status === this.statusFilter),
    );
  }
  protected pendingActions(risk: RiskAssessment) {
    return risk.actions.filter((a) => a.status !== 'Completed').length;
  }
  protected get sharedApproved() {
    return this.approved().filter((r) => r.visibility.staff);
  }
  protected count(level: string) {
    return this.risks().filter(
      (r) => riskLevel(r.residualLikelihood * r.residualSeverity) === level,
    ).length;
  }
  protected get overdue() {
    return this.risks().filter((r) => r.review && r.review < this.today).length;
  }
  protected get outstanding() {
    return this.risks().flatMap((r) =>
      r.actions
        .filter((a) => a.status !== 'Completed')
        .map((a) => ({ ...a, domain: r.domain, risk: r })),
    );
  }
  protected get editable() {
    return this.canEdit() && this.selected()?.status === 'Draft';
  }
  protected get domainFields(): string[][] {
    return this.fieldsFor(this.selected()?.domain);
  }
  protected fieldsFor(domain?: string): string[][] {
    if (domain === 'Mental Health')
      return [
        ['diagnosis', 'Diagnosis / relevant history'],
        ['baseline', 'Current mental-health status'],
        ['relapse', 'History of relapse / signs of deterioration'],
        ['adherence', 'Medication adherence'],
        ['professionals', 'Professional involvement and contact details'],
        ['triggers', 'Known triggers'],
        ['riskSelf', 'Risks to self'],
        ['riskOthers', 'Risks to others'],
      ];
    if (domain === 'Behaviour / PBS')
      return [
        ['baseline', 'Normal / baseline presentation'],
        ['triggers', 'Known triggers'],
        ['warning', 'Early warning signs'],
        ['escalating', 'Escalating behaviours'],
        ['crisis', 'Crisis behaviours / potential harm'],
        ['riskSelf', 'Risk to service user'],
        ['riskOthers', 'Risk to staff, family, public or property'],
        ['preventative', 'Preventative strategies'],
        ['deescalation', 'De-escalation strategies'],
        ['professionals', 'Professional / PBS involvement'],
        ['should', 'What carers SHOULD do'],
        ['mustNot', 'What carers MUST NOT do'],
        ['recovery', 'Recovery / post-incident support'],
      ];
    if (domain === 'Moving & Handling' || domain === 'Falls & Mobility')
      return [
        ['height', 'Height (cm)'],
        ['weight', 'Weight (kg)'],
        ['bmi', 'BMI'],
        ['mobility', 'Mobility status'],
        ['constraints', 'Handling constraints (disability, weakness, pain)'],
        ['equipment', 'Recommended equipment'],
        ['technique', 'Technique and instructions'],
        ['independent', 'Overall assessment / independence'],
      ];
    if (domain === 'Medication')
      return [
        ['support', 'Current medication support need'],
        ['types', 'Medication types'],
        ['monitoring', 'Monitoring / adherence'],
        ['professionals', 'GP / pharmacy involvement'],
      ];
    if (domain === 'Environmental / Fire')
      return [
        ['property', 'Type of property'],
        ['floor', 'Floor level'],
        ['access', 'Access / key safe'],
        ['pets', 'Pets'],
        ['evacuation', 'Fire safety / evacuation considerations'],
      ];
    if (domain === 'Substance / Alcohol')
      return [
        ['history', 'History / current situation'],
        ['triggers', 'Triggers and signs of relapse'],
        ['professionals', 'Professional involvement'],
      ];
    return [];
  }
  protected get assessmentTabs() {
    return [
      'General details',
      'Assessment',
      ...(this.selected()?.domain === 'Moving & Handling' ? ['Risk analysis'] : []),
      'Risk rating',
      'Action plan',
      'Linked records',
      'Review & approval',
    ];
  }
  protected get personDetails() {
    const c = this.client(),
      details = c?.file?.details ?? {};
    return [
      ['Full name', c?.name],
      ['Preferred name', details['preferredName']],
      ['Date of birth', details['dob']],
      ['NHS number', details['nhs']],
      ['Address', [c?.address, c?.postcode].filter(Boolean).join(', ')],
      ['Telephone', c?.phone],
      ['Email', c?.email],
      ['Primary language', details['language']],
      ['Religion', details['religion']],
      ['GP', c?.file?.contacts?.find((contact) => contact.type === 'GP')?.name],
    ];
  }
  protected addHandlingRisk() {
    const r = this.selected();
    if (!r) return;
    (r.handlingRisks ??= []).push({
      id: crypto.randomUUID(),
      task: '',
      risk: '',
      level: 'Low',
      controls: '',
    });
  }
  protected get checkOptions() {
    switch (this.selected()?.domain) {
      case 'Medication':
        return [
          'Medication refusal',
          'Missed medication',
          'Incorrect dose',
          'PRN medication',
          'Controlled drugs',
          'Medication storage',
          'Prescription collection',
          'Self-administration',
          'Administration by carers',
          'Interaction with alcohol / substances',
          'History of non-compliance',
        ];
      case 'Environmental / Fire':
        return [
          'Fire safety',
          'Smoking',
          'Cooking',
          'Electrical safety',
          'Clutter / trip hazards',
          'Lighting',
          'Stairs',
          'Key safe / access',
          'Unsafe equipment',
          'Pets',
          'Neighbourhood / community risks',
          'Evacuation',
        ];
      case 'Mental Health':
        return [
          'History of psychiatric admission',
          'Risk of relapse',
          'Non-compliance with medication',
          'Distress related to environment',
          'Substance misuse',
        ];
      case 'Substance / Alcohol':
        return [
          'History of alcohol misuse',
          'History of cannabis use',
          'Other substance use',
          'Risk of relapse',
        ];
      default:
        return [];
    }
  }
  protected toggle(list: string[], value: string) {
    const i = list.indexOf(value);
    i < 0 ? list.push(value) : list.splice(i, 1);
  }
  protected go(page: string) {
    if (!this.canLeave()) return;
    this.selected.set(null);
    this.baseline = '';
    this.error.set('');
    this.page.set(page);
  }
  protected changeDomain(domain: string) {
    if (!DESIGNED_DOMAINS.includes(domain)) {
      this.start(domain);
      return;
    }
    const risk = this.selected();
    if (risk) risk.domain = domain;
  }
  protected start(domain: string) {
    if (!this.canEdit() || !this.canLeave()) return;
    const draft = blankRisk(domain);
    this.setSelection(draft);
    this.page.set(DESIGNED_DOMAINS.includes(domain) ? 'assessment' : 'coming');
  }
  protected open(risk: RiskAssessment) {
    if (!this.canLeave()) return;
    this.setSelection(structuredClone(risk));
    this.page.set(DESIGNED_DOMAINS.includes(risk.domain) ? 'assessment' : 'coming');
  }
  private setSelection(risk: RiskAssessment) {
    this.selected.set(risk);
    this.baseline = JSON.stringify(risk);
    this.tab.set('Assessment');
    this.error.set('');
    this.reason = '';
    this.owner = {
      id: this.id(),
      workspace: this.care.store.companyId(),
      revision: this.register().revision,
    };
  }
  protected review() {
    const old = this.selected();
    if (!old || old.status !== 'Approved' || !this.canEdit()) return;
    const draft = structuredClone(old);
    draft.id = crypto.randomUUID();
    draft.version++;
    draft.status = 'Draft';
    draft.date = this.today;
    draft.approver = '';
    draft.approvedAt = '';
    draft.author = '';
    draft.authorId = '';
    this.setSelection(draft);
    this.notice.set('A new draft review is ready. The approved version is preserved.');
  }
  protected addAction() {
    this.selected()?.actions.push({
      id: crypto.randomUUID(),
      text: '',
      owner: '',
      due: '',
      status: 'Open',
    });
  }
  protected save(status: RiskStatus = 'Draft') {
    const risk = this.selected();
    if (!risk) return;
    const error = this.care.saveRiskAssessment(
      this.owner.id,
      this.owner.workspace,
      risk,
      this.owner.revision,
      status,
      this.reason,
    );
    if (error) {
      this.error.set(error);
      return;
    }
    const saved = this.register().assessments.find((a) => a.id === risk.id)!;
    this.setSelection(structuredClone(saved));
    this.notice.set(
      status === 'Approved'
        ? 'Assessment approved. The approved version is available in the carer preview according to visibility.'
        : status === 'In review'
          ? 'Submitted for management review.'
          : 'Draft saved to this workspace.',
    );
  }
  protected dirty() {
    return !!this.selected() && JSON.stringify(this.selected()) !== this.baseline;
  }
  canLeave() {
    return !this.dirty() || window.confirm('Discard unsaved changes to this risk assessment?');
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) event.preventDefault();
  }
  protected print() {
    if (this.care.rota.can('export')) window.print();
  }
  protected bodyLink() {
    return ['/manage/care-plans', this.id()];
  }
  protected incidents() {
    return this.client()?.file?.entries['incidents'] ?? [];
  }
  protected documents() {
    return this.care.documents(this.id());
  }
  protected lineItems(value: string | undefined) {
    return (
      value
        ?.split('\n')
        .map((v) => v.replace(/^[-•]\s*/, ''))
        .filter(Boolean) ?? []
    );
  }
}
