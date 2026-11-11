import { ServiceUserState } from '../shared/service-user-state';
import { RiskPrintPreview } from './risk-print-preview';
import {
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
  DestroyRef,
  TemplateRef,
  viewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { RiskApi } from './risk-api.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import type {
  RiskRead,
  RiskWrite,
  RiskWorkspace,
  RiskVoiceRead,
  RiskReviewRead,
  RiskSuggestion,
} from './risk.generated';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ApiError } from '../../../core/auth/auth-api';
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
  imports: [
    ServiceUserState,
    DatePipe,
    NgTemplateOutlet,
    FormsModule,
    RouterLink,
    CareHeader,
    ModuleDesign,
    RiskPrintPreview,
    MatDialogModule,
  ],
  providers: [RiskApi, ServiceUsersApi],
  host: { class: 'module-page operations-page' },
  templateUrl: './risk-assessments.html',
  styleUrls: [
    './risk-assessments-preview.css',
    './risk-assessments.css',
    './risk-assessment-navigation.css',
  ],
})
export class RiskAssessments {
  protected readonly api = inject(RiskApi);
  protected readonly records = this.api.records;
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly editor = viewChild.required<TemplateRef<unknown>>('editorPopup');
  private popup: MatDialogRef<unknown> | null = null;
  protected readonly popupOpen = signal(false);
  protected readonly data = signal<RiskWorkspace | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly printBusy = signal(false);
  protected errorFields() {
    return Object.keys(this.fieldErrors());
  }
  protected readonly fieldErrors = signal<Record<string, string[]>>({});
  private original: RiskRead | null = null;
  private epoch = 0;
  private editorEpoch = 0;
  private viewEpoch = 0;
  private reviewEpoch = 0;
  private printEpoch = 0;
  private destroyed = false;
  private intent = '';
  private intentKey = '';
  private editorScope = '';
  private editorId = '';

  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') || '');
  protected readonly client = computed(() =>
    this.records.selected()?.id === this.id() ? this.records.selected() : null,
  );
  protected readonly register = computed(() => ({
    assessments: this.data()?.assessments ?? [],
    history: this.data()?.history ?? [],
  }));
  protected readonly risks = computed(() => latestRisks(this.register().assessments));
  protected readonly approved = computed(() =>
    latestRisks(this.register().assessments.filter((a) => a.status === 'Approved')),
  );
  protected readonly legacy = computed(() => this.data()?.legacy ?? []);
  protected readonly manager = computed(() => this.api.can('approve'));
  protected readonly canEdit = computed(() => this.api.can('edit'));
  protected readonly canCreate = computed(() => this.api.can('create'));
  protected readonly allowed = computed(() => this.api.can('read'));
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
  protected get today() {
    return this.data()?.local_date ?? londonDate();
  }
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
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.clearVoice();
      this.epoch++;
      this.editorEpoch++;
      this.viewEpoch++;
      this.reviewEpoch++;
      this.printEpoch++;
      this.popup?.close();
    });
    effect(() => {
      const id = this.id(),
        scope = this.api.scope();
      untracked(() => {
        this.editorEpoch++;
        this.viewEpoch++;
        this.reviewEpoch++;
        this.printEpoch++;
        this.printBusy.set(false);
        this.clearVoice();
        this.reviewData.set(null);
        this.reviewBusy.set(false);
        this.reviewReason = '';
        this.popup?.close();
        this.popup = null;
        this.popupOpen.set(false);
        this.selected.set(null);
        this.original = null;
        this.baseline = '';
        this.data.set(null);
        this.error.set('');
        this.notice.set('');
        this.fieldErrors.set({});
        this.saving.set(false);
        this.intent = '';
        this.page.set('overview');
        if (id && this.allowed()) {
          void this.records.detail(id);
          void this.load();
        }
      });
    });
  }
  protected async load(): Promise<void> {
    const epoch = ++this.epoch,
      id = this.id(),
      scope = this.api.scope();
    this.loading.set(true);
    try {
      const data = await this.api.load(id);
      if (this.current(epoch, id, scope)) this.data.set(data);
    } catch (error) {
      if (this.current(epoch, id, scope)) {
        this.data.set(null);
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) this.loading.set(false);
    }
  }
  private current(epoch: number, id: string, scope: string): boolean {
    return (
      !this.destroyed &&
      epoch === this.epoch &&
      id === this.id() &&
      scope === this.api.scope() &&
      this.allowed()
    );
  }
  private editorCurrent(epoch: number): boolean {
    return (
      !this.destroyed &&
      epoch === this.editorEpoch &&
      this.editorScope === this.api.scope() &&
      this.editorId === this.id() &&
      this.allowed()
    );
  }
  private fail(error: unknown): void {
    this.error.set(
      error instanceof Error ? error.message : 'Risk assessments could not be loaded.',
    );
    this.fieldErrors.set(error instanceof ApiError ? error.fieldErrors : {});
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
    return (
      !this.saving() &&
      (this.original ? this.canEdit() : this.canCreate()) &&
      this.selected()?.status === 'Draft'
    );
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
    const specialist: Record<string, string[][]> = {
      'Self-Harm / Suicide': [
        ['condition', 'Relevant history and current concerns'],
        ['warningSigns', 'Observed warning signs and known triggers'],
        ['response', 'Agreed immediate response and crisis contacts'],
        ['professionals', 'Professional involvement and safety plan'],
      ],
      Safeguarding: [
        ['condition', 'Safeguarding concerns and relevant history'],
        ['warningSigns', 'Signs of abuse, neglect or exploitation'],
        ['response', 'Protection measures and reporting route'],
        ['professionals', 'Safeguarding lead and involved professionals'],
      ],
      'Nutrition & Hydration': [
        ['condition', 'Dietary needs and nutritional concerns'],
        ['warningSigns', 'Signs of dehydration or unintended weight change'],
        ['preferences', 'Food, drink and cultural preferences'],
        ['response', 'Monitoring and agreed support'],
      ],
      'Skin / Pressure Care': [
        ['condition', 'Skin condition and pressure care needs'],
        ['equipment', 'Pressure relieving equipment'],
        ['warningSigns', 'Signs of skin breakdown'],
        ['response', 'Repositioning, skin checks and escalation'],
      ],
      'Dysphagia / Choking': [
        ['condition', 'Assessed swallowing needs'],
        ['preferences', 'Prescribed food texture and fluid consistency'],
        ['response', 'Eating support and emergency response'],
        ['professionals', 'Speech and language therapy guidance'],
      ],
      'Epilepsy / Seizures': [
        ['condition', 'Seizure history and usual presentation'],
        ['warningSigns', 'Known triggers and warning signs'],
        ['response', 'Recorded seizure and rescue plan'],
        ['professionals', 'Clinical plan and professional contacts'],
      ],
      Diabetes: [
        ['condition', 'Recorded diabetes management needs'],
        ['warningSigns', 'Recognised signs of low or high glucose'],
        ['response', 'Monitoring, treatment support and escalation'],
        ['professionals', 'Current clinical management plan'],
      ],
      'Lone Working / Staff Safety': [
        ['environment', 'Working environment and known hazards'],
        ['warningSigns', 'Situations increasing staff risk'],
        ['response', 'Check-in, support and emergency arrangements'],
        ['equipment', 'Communication and safety equipment'],
      ],
      'Financial Risk': [
        ['condition', 'Support with money and decision-making'],
        ['warningSigns', 'Risks of loss, coercion or exploitation'],
        ['response', 'Agreed safeguards and accountability'],
        ['professionals', 'Authorised representatives and professional involvement'],
      ],
      'Home Access': [
        ['environment', 'Access arrangements and environmental barriers'],
        ['equipment', 'Keys, access aids and equipment'],
        ['response', 'Failed access and emergency arrangements'],
        ['preferences', 'Service-user access preferences'],
      ],
      'Equipment Safety': [
        ['equipment', 'Equipment used and its intended purpose'],
        ['condition', 'Condition, inspection and maintenance information'],
        ['response', 'Safe use, training and fault reporting'],
        ['professionals', 'Supplier or responsible professional'],
      ],
      'Other condition-specific risks': [
        ['condition', 'Condition and assessed needs'],
        ['warningSigns', 'Warning signs and relevant triggers'],
        ['response', 'Agreed condition-specific support'],
        ['professionals', 'Professional guidance and contacts'],
      ],
    };
    return specialist[domain ?? ''] ?? [];
  }
  protected updateBmi(): void {
    const fields = this.selected()?.fields;
    if (!fields) return;
    const height = Number(fields['height']) / 100,
      weight = Number(fields['weight']);
    fields['bmi'] = height > 0 && weight > 0 ? (weight / (height * height)).toFixed(1) : '';
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
      ['GP', details['gp'] || c?.file?.contacts?.find((contact) => contact.type === 'GP')?.name],
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
    if (!this.canLeave() || this.saving()) return;
    this.editorEpoch++;
    this.viewEpoch++;
    this.printEpoch++;
    this.printBusy.set(false);
    this.original = null;
    if (this.page() === 'voice') this.clearVoice();
    this.closePopup();
    this.selected.set(null);
    this.baseline = '';
    this.error.set('');
    this.page.set(page);
    if (page === 'automated') void this.loadReview();
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
    if (!this.canCreate() || this.saving() || !this.canLeave()) return;
    this.editorEpoch++;
    this.viewEpoch++;
    this.printEpoch++;
    this.printBusy.set(false);
    this.closePopup();
    this.original = null;
    const draft = blankRisk(domain);
    draft.date = this.today;
    this.setSelection(draft);
    this.page.set(DESIGNED_DOMAINS.includes(domain) ? 'assessment' : 'coming');
  }
  protected async open(risk: RiskAssessment) {
    if (!this.canLeave() || this.saving()) return;
    const epoch = ++this.editorEpoch;
    this.viewEpoch++;
    this.printEpoch++;
    this.printBusy.set(false);
    this.editorScope = this.api.scope();
    this.editorId = this.id();
    try {
      const fresh = await this.api.detail(this.id(), risk.id);
      if (!this.editorCurrent(epoch)) return;
      this.closePopup();
      this.original = fresh;
      this.setSelection(structuredClone(fresh));
      this.popupOpen.set(true);
      this.popup = this.dialog.open(this.editor(), {
        width: '1100px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - 24px)',
        panelClass: 'service-user-dialog',
        backdropClass: 'service-user-dialog-backdrop',
        ariaLabel: 'Risk assessment',
        role: 'dialog',
        disableClose: true,
      });
      this.popup.backdropClick().subscribe(() => this.cancelEditor());
      this.popup.keydownEvents().subscribe((e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.cancelEditor();
        }
      });
    } catch (error) {
      if (this.editorCurrent(epoch)) this.fail(error);
    }
  }
  private setSelection(risk: RiskAssessment) {
    this.selected.set(risk);
    this.baseline = JSON.stringify(risk);
    this.tab.set('Assessment');
    this.error.set('');
    this.fieldErrors.set({});
    this.reason = '';
    this.editorScope = this.api.scope();
    this.editorId = this.id();
  }
  private closePopup() {
    this.popup?.close();
    this.popup = null;
    this.popupOpen.set(false);
  }
  protected cancelEditor() {
    if (this.saving() || !this.canLeave()) return;
    this.editorEpoch++;
    this.closePopup();
    this.selected.set(null);
    this.original = null;
    this.baseline = '';
  }
  protected async review() {
    if (!this.original || !this.canCreate() || this.saving() || !this.canLeave()) return;
    const reason = this.reason.trim();
    if (!reason) {
      this.error.set('Enter a reason for starting this review in the Reason for change field.');
      return;
    }
    const epoch = this.editorEpoch;
    this.saving.set(true);
    try {
      const fresh = await this.api.command(
        this.id(),
        this.original,
        'review',
        reason,
        this.key({ command: 'review', id: this.original.id, reason }),
      );
      if (!this.editorCurrent(epoch)) return;
      this.original = fresh;
      this.setSelection(structuredClone(fresh));
      await this.load();
      this.notice.set('A new draft review is ready. The approved version is preserved.');
    } catch (error) {
      if (this.editorCurrent(epoch)) this.fail(error);
    } finally {
      if (this.editorCurrent(epoch)) this.saving.set(false);
    }
  }
  private key(value: unknown): string {
    const intent = JSON.stringify(value);
    if (intent !== this.intent) {
      this.intent = intent;
      this.intentKey = crypto.randomUUID();
    }
    return this.intentKey;
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
  protected async save(status: RiskStatus = 'Draft') {
    const risk = this.selected();
    if (!risk || this.saving()) return;
    if (!this.reason.trim()) {
      this.error.set('Record a reason for this change.');
      return;
    }
    const epoch = this.editorEpoch;
    this.saving.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    try {
      let saved = this.original;
      if (risk.status === 'Draft') {
        const body = Object.fromEntries(
          [
            'voice_note_id',
            'review_decision_id',
            'domain',
            'specific',
            'date',
            'review',
            'likelihood',
            'severity',
            'residualLikelihood',
            'residualSeverity',
            'harmed',
            'fields',
            'checks',
            'triggers',
            'actions',
            'tasks',
            'handlingRisks',
            'careArea',
            'incidentIds',
            'documentIds',
            'visibility',
          ].map((k) => [k, (risk as any)[k]]),
        ) as RiskWrite;
        body.review = risk.review || null;
        body.handlingRisks = (risk.handlingRisks ?? []) as RiskWrite['handlingRisks'];
        body.reason = this.reason.trim();
        saved = await this.api.save(this.id(), body, this.original, this.key(body));
        if (!this.editorCurrent(epoch)) return;
        this.original = saved;
        this.selected.set(structuredClone(saved));
        this.baseline = JSON.stringify(saved);
      }
      if (!saved) throw Error('Save the draft first.');
      if (status !== 'Draft' || risk.status === 'In review') {
        const command =
          status === 'Approved' ? 'approve' : status === 'In review' ? 'submit' : 'return';
        saved = await this.api.command(
          this.id(),
          saved,
          command,
          this.reason.trim(),
          this.key({ command, id: saved.id, etag: saved.etag, reason: this.reason.trim() }),
        );
        if (!this.editorCurrent(epoch)) return;
      }
      this.original = saved;
      this.setSelection(structuredClone(saved));
      await this.load();
      if (this.editorCurrent(epoch))
        this.notice.set(
          status === 'Approved'
            ? 'Assessment approved.'
            : status === 'In review'
              ? 'Submitted for management review.'
              : 'Draft saved.',
        );
    } catch (error) {
      if (this.editorCurrent(epoch)) this.fail(error);
    } finally {
      if (this.editorCurrent(epoch)) this.saving.set(false);
    }
  }
  protected dirty() {
    return (
      (!!this.selected() && JSON.stringify(this.selected()) !== this.baseline) ||
      (this.page() === 'voice' &&
        (!!this.voiceTranscript.trim() ||
          !!this.audioFile ||
          this.voiceRecording() ||
          this.dictating()))
    );
  }
  canLeave() {
    return (
      !this.saving() &&
      (!this.dirty() || window.confirm('Discard unsaved changes to this risk assessment?'))
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) event.preventDefault();
  }
  protected print() {
    if (
      !this.api.can('export') ||
      this.printBusy() ||
      this.saving() ||
      this.voiceBusy() ||
      !this.canLeave()
    )
      return;
    if (this.page() === 'voice') this.clearVoice();
    this.editorEpoch++;
    this.viewEpoch++;
    this.closePopup();
    this.selected.set(null);
    this.original = null;
    this.baseline = '';
    const scope = this.api.scope(),
      id = this.id(),
      epoch = ++this.printEpoch;
    this.printBusy.set(true);
    void this.api
      .load(id, true)
      .then((data) => {
        if (
          this.destroyed ||
          epoch !== this.printEpoch ||
          scope !== this.api.scope() ||
          id !== this.id()
        )
          return;
        this.data.set({ ...data, history: this.data()?.history ?? [] });
        this.page.set('pdf');
        this.cd.detectChanges();
        window.print();
      })
      .catch((error) => {
        if (epoch === this.printEpoch && scope === this.api.scope() && id === this.id())
          this.fail(error);
      })
      .finally(() => {
        if (epoch === this.printEpoch) this.printBusy.set(false);
      });
  }
  protected bodyLink() {
    return ['/manage/care-plans', this.id()];
  }
  protected incidents() {
    return [] as { id: string; name: string; date: string }[];
  }
  protected documents() {
    return this.data()?.documents ?? [];
  }
  protected lineItems(value: string | undefined) {
    return (
      value
        ?.split('\n')
        .map((v) => v.replace(/^[-•]\s*/, ''))
        .filter(Boolean) ?? []
    );
  }

  protected readonly voiceRecording = signal(false);
  protected readonly voiceBusy = signal(false);
  protected readonly voiceNote = signal<RiskVoiceRead | null>(null);
  protected voiceTranscript = '';
  protected voiceDomain = 'General';
  protected voiceSpecific = '';
  protected voiceAudio = '';
  protected voiceIncludeAudio = true;
  protected readonly voiceStatus = signal('');
  protected readonly dictating = signal(false);
  protected readonly reviewData = signal<RiskReviewRead | null>(null);
  protected readonly reviewBusy = signal(false);
  protected reviewReason = '';
  private audioIntent = '';
  private audioFile: File | null = null;
  private recorder: MediaRecorder | null = null;
  private microphone: MediaStream | null = null;
  private recognition: any = null;
  private recordingTimer: ReturnType<typeof setTimeout> | null = null;
  private voiceGeneration = 0;
  private clearVoice(): void {
    this.voiceGeneration++;
    this.recognition?.stop();
    this.recognition = null;
    this.dictating.set(false);
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.recorder = null;
    this.microphone?.getTracks().forEach((t) => t.stop());
    this.microphone = null;
    if (this.recordingTimer) clearTimeout(this.recordingTimer);
    this.recordingTimer = null;
    if (this.voiceAudio) URL.revokeObjectURL(this.voiceAudio);
    this.voiceAudio = '';
    this.audioFile = null;
    this.voiceTranscript = '';
    this.voiceSpecific = '';
    this.voiceNote.set(null);
    this.voiceRecording.set(false);
    this.voiceBusy.set(false);
    this.voiceStatus.set('');
  }
  protected resetVoice(): void {
    if (this.voiceBusy()) return;
    if (this.voiceTranscript && !window.confirm('Discard this voice transcript and recording?'))
      return;
    this.clearVoice();
  }
  protected async recordVoice(): Promise<void> {
    if (!this.canCreate() || this.voiceRecording() || this.voiceBusy()) return;
    const generation = this.voiceGeneration;
    this.voiceBusy.set(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined')
        throw Error(
          'Audio recording is unavailable in this browser. Enter the checked transcript below.',
        );
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== this.voiceGeneration || this.destroyed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.microphone = stream;
      const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!type)
        throw Error(
          'This browser has no supported recording format. Enter the checked transcript below.',
        );
      const recorder = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 32000 }),
        chunks: Blob[] = [];
      let size = 0;
      this.recorder = recorder;
      this.voiceNote.set(null);
      recorder.ondataavailable = (e) => {
        if (generation !== this.voiceGeneration) return;
        if (e.data.size) {
          size += e.data.size;
          chunks.push(e.data);
          if (size > 10485760) this.stopVoice();
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (generation !== this.voiceGeneration) return;
        this.voiceRecording.set(false);
        if (size > 10485760) {
          this.voiceStatus.set('The recording exceeded 10 MB. Record a shorter note.');
          return;
        }
        if (this.voiceAudio) URL.revokeObjectURL(this.voiceAudio);
        const blob = new Blob(chunks, { type: type.split(';')[0] });
        this.audioIntent = crypto.randomUUID();
        this.audioFile = new File(
          [blob],
          'risk-recording.' +
            (type.startsWith('audio/webm') ? 'webm' : type.startsWith('audio/ogg') ? 'ogg' : 'm4a'),
          { type: blob.type },
        );
        this.voiceAudio = URL.createObjectURL(blob);
        this.voiceStatus.set('Recording ready. Check or enter the transcript before continuing.');
      };
      recorder.onerror = () => {
        this.voiceStatus.set('Recording failed. Stop and try again, or enter the transcript.');
        this.stopVoice();
      };
      recorder.start(1000);
      this.voiceRecording.set(true);
      this.voiceStatus.set('Recording. Maximum five minutes.');
      this.recordingTimer = setTimeout(() => this.stopVoice(), 300000);
    } catch (error) {
      this.microphone?.getTracks().forEach((t) => t.stop());
      this.voiceStatus.set(error instanceof Error ? error.message : 'Microphone access failed.');
    } finally {
      if (generation === this.voiceGeneration) this.voiceBusy.set(false);
    }
  }
  protected stopVoice(): void {
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.recognition?.stop();
    if (this.recordingTimer) clearTimeout(this.recordingTimer);
    this.recordingTimer = null;
  }
  protected async dictate(): Promise<void> {
    const Speech = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const generation = this.voiceGeneration;
    try {
      if (!Speech?.available)
        throw Error(
          'On-device dictation is unavailable in this browser. Listen to the recording and enter the transcript.',
        );
      const available = await Speech.available({ langs: ['en-GB'], processLocally: true });
      if (generation !== this.voiceGeneration) return;
      if (available !== 'available')
        throw Error(
          'The English (UK) on-device language pack is unavailable. Use Install dictation, or enter the transcript.',
        );
      const recognition = new Speech();
      if (!('processLocally' in recognition))
        throw Error('On-device dictation is unavailable. Enter the transcript.');
      recognition.processLocally = true;
      recognition.lang = 'en-GB';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        if (generation !== this.voiceGeneration) return;
        for (let i = event.resultIndex; i < event.results.length; i++)
          if (event.results[i].isFinal)
            this.voiceTranscript +=
              (this.voiceTranscript ? ' ' : '') + event.results[i][0].transcript;
      };
      recognition.onerror = () => {
        if (generation === this.voiceGeneration)
          this.voiceStatus.set('Dictation stopped. Check the transcript or enter it manually.');
      };
      recognition.onend = () => {
        if (generation === this.voiceGeneration) this.dictating.set(false);
      };
      this.recognition = recognition;
      recognition.start();
      this.dictating.set(true);
      this.voiceStatus.set(
        'On-device dictation is listening. Check the words before creating a draft.',
      );
    } catch (error) {
      if (generation === this.voiceGeneration)
        this.voiceStatus.set(error instanceof Error ? error.message : 'Dictation is unavailable.');
    }
  }
  protected async installDictation(): Promise<void> {
    const Speech = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    try {
      if (!Speech?.install)
        throw Error('This browser cannot install on-device dictation. Enter the transcript.');
      this.voiceStatus.set('Installing the English (UK) on-device language pack…');
      const ok = await Speech.install({ langs: ['en-GB'] });
      this.voiceStatus.set(
        ok
          ? 'Dictation is ready. Select Dictate.'
          : 'The language pack could not be installed. Enter the transcript.',
      );
    } catch (error) {
      this.voiceStatus.set(error instanceof Error ? error.message : 'Dictation is unavailable.');
    }
  }
  protected async voiceDraft(): Promise<void> {
    if (!this.canCreate() || this.voiceBusy() || this.voiceRecording() || this.dictating()) return;
    if (!this.voiceTranscript.trim() || !this.voiceSpecific.trim()) {
      this.voiceStatus.set('Enter the specific risk and check the transcript before continuing.');
      return;
    }
    const generation = this.voiceGeneration;
    this.voiceBusy.set(true);
    try {
      let note = this.voiceNote();
      if (
        !note ||
        note.transcript !== this.voiceTranscript.trim() ||
        note.domain !== this.voiceDomain
      ) {
        note = await this.api.saveVoice(
          this.id(),
          this.voiceTranscript.trim(),
          this.voiceDomain,
          this.voiceIncludeAudio ? this.audioFile : null,
          this.key({
            transcript: this.voiceTranscript.trim(),
            domain: this.voiceDomain,
            file: this.voiceIncludeAudio ? this.audioIntent : '',
          }),
        );
        if (generation !== this.voiceGeneration) return;
        this.voiceNote.set(note);
      }
      if (note.state === 'quarantined') {
        note = await this.api.voice(this.id(), note.id);
        if (generation !== this.voiceGeneration) return;
        this.voiceNote.set(note);
      }
      if (note.state !== 'clean') {
        this.voiceStatus.set(
          note.state === 'rejected'
            ? 'The audio was rejected. Remove it and try the checked transcript only.'
            : 'The recording is waiting for scanning. Select Check scan and create draft when ready.',
        );
        return;
      }
      const draft = blankRisk(this.voiceDomain);
      draft.date = this.today;
      draft.specific = this.voiceSpecific.trim();
      draft.fields['description'] = this.voiceTranscript.trim();
      draft.voice_note_id = note.id;
      this.original = null;
      this.setSelection(draft);
      this.page.set('assessment');
      this.baseline = '';
      this.notice.set(
        'Review the transcribed facts, risk ratings and controls before submitting this draft.',
      );
    } catch (error) {
      if (generation === this.voiceGeneration)
        this.voiceStatus.set(
          error instanceof Error ? error.message : 'The voice record could not be saved.',
        );
    } finally {
      if (generation === this.voiceGeneration) this.voiceBusy.set(false);
    }
  }
  protected async loadReview(): Promise<void> {
    const epoch = ++this.reviewEpoch;
    const scope = this.api.scope(),
      id = this.id();
    this.reviewBusy.set(true);
    try {
      const data = await this.api.review(id);
      if (
        epoch === this.reviewEpoch &&
        scope === this.api.scope() &&
        id === this.id() &&
        !this.destroyed
      )
        this.reviewData.set(data);
    } catch (error) {
      if (
        epoch === this.reviewEpoch &&
        scope === this.api.scope() &&
        id === this.id() &&
        !this.destroyed
      )
        this.fail(error);
    } finally {
      if (
        epoch === this.reviewEpoch &&
        scope === this.api.scope() &&
        id === this.id() &&
        !this.destroyed
      )
        this.reviewBusy.set(false);
    }
  }
  protected async decide(
    suggestion: RiskSuggestion,
    decision: 'accepted' | 'dismissed',
  ): Promise<void> {
    if (!this.api.can('edit') || this.reviewBusy()) return;
    if (!this.reviewReason.trim()) {
      this.error.set('Record a reason for accepting or dismissing this recommendation.');
      return;
    }
    const view = this.viewEpoch;
    const scope = this.api.scope(),
      id = this.id();
    this.reviewBusy.set(true);
    try {
      const result = await this.api.decide(
        id,
        suggestion.id,
        decision,
        this.reviewReason.trim(),
        this.key({ suggestion: suggestion.id, decision, reason: this.reviewReason.trim() }),
      );
      if (scope !== this.api.scope() || id !== this.id() || this.destroyed) return;
      this.reviewReason = '';
      await this.load();
      if (
        scope !== this.api.scope() ||
        id !== this.id() ||
        this.destroyed ||
        view !== this.viewEpoch
      )
        return;
      await this.loadReview();
      if (
        scope !== this.api.scope() ||
        id !== this.id() ||
        this.destroyed ||
        view !== this.viewEpoch
      )
        return;
      if (decision === 'accepted') {
        if (result.assessment) {
          await this.open(result.assessment);
        } else {
          this.start('General');
          const draft = this.selected();
          if (draft) {
            draft.specific = suggestion.title;
            draft.fields['description'] = suggestion.detail;
            draft.review_decision_id = result.id;
          }
        }
      }
      this.notice.set(
        decision === 'accepted'
          ? 'Recommendation accepted for a checked assessment draft.'
          : 'Recommendation dismissed with its reason retained.',
      );
    } catch (error) {
      if (
        scope === this.api.scope() &&
        id === this.id() &&
        !this.destroyed &&
        view === this.viewEpoch
      )
        this.fail(error);
    } finally {
      if (scope === this.api.scope() && id === this.id() && !this.destroyed)
        this.reviewBusy.set(false);
    }
  }
  protected async downloadVoice(): Promise<void> {
    const id = this.selected()?.voice_note_id;
    if (!id) return;
    try {
      await this.api.downloadVoice(this.id(), id);
    } catch (error) {
      this.fail(error);
    }
  }
}
