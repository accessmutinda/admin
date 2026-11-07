import { of } from 'rxjs';
import { seedCareDemo } from '../../../demo/care-demo';
import { ASSESSMENT_FIELDS } from './care-plan-assessment.models';
import {
  REVIEW_SOURCE_CATEGORIES,
  seededReviewReport,
  visibleReviewFindings,
} from './care-plan-review.models';
import { ApprovedCareInstructions } from './approved-care-instructions';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { CarePlan } from './care-plan';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { emptyClientFile } from '../clients/client-file.models';
import { CareService } from './care.service';
import { CarePlanService } from './care-plan.service';
import { approvedInstructions, planIssues, PlanVersion } from './care-plan.models';
import { seedCarePlans } from '../../../demo/care-plan-demo';

describe('Electronic care-plan lifecycle', () => {
  let service: CarePlanService, store: ManagementStore, care: CareService, rota: RotaService;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  const id = 'care-demo-client-test',
    workspace = 'lqcs';
  const draft = () => structuredClone(service.read(id)!.versions[0]);
  const revision = () => service.read(id)!.revision;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CarePlan],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id })),
            queryParamMap: of(convertToParamMap({})),
            data: of({ carePlanWorkspace: true }),
            snapshot: {
              paramMap: convertToParamMap({ id }),
              queryParamMap: convertToParamMap({}),
              data: { carePlanWorkspace: true },
            },
          },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const auth = TestBed.inject(AuthService);
    auth.signInDemoSession();
    TestBed.inject(WorkspaceService).switchWorkspace(workspace);
    actor.set({ ...DEMO_USER, roleCode: 'CA' });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    store = TestBed.inject(ManagementStore);
    rota = TestBed.inject(RotaService);
    care = TestBed.inject(CareService);
    service = TestBed.inject(CarePlanService);
    expect(
      rota.saveClient({
        id,
        name: 'Fictional Person',
        reference: 'CP1',
        address: '1 Demo Road',
        postcode: 'HA1 1AA',
        active: true,
        funding: 'Private',
        priority: 'Standard',
        file: emptyClientFile(),
      }),
    ).toBeNull();
  });
  function complete(p: PlanVersion) {
    p.confirmed = true;
    p.capacity['concerns'] = 'No';
    p.capacity['decision'] = 'Understands the decision about washing support.';
    p.packageDecision = 'No change';
    p.sections.forEach((s) => {
      s.complete = true;
      Object.keys(s.fields).forEach((k) => (s.fields[k] = 'Reviewed with the service user.'));
    });
    return p;
  }
  it('brings forward source details and persists without replacing the source record', () => {
    expect(service.initialise(id, workspace)).toBeNull();
    const p = draft();
    expect(p.details['name']).toBe('Fictional Person');
    p.details['name'] = 'Corrected plan name';
    expect(service.commit(id, workspace, p, revision(), 'save')).toBeNull();
    expect(care.client(id)!.name).toBe('Fictional Person');
    expect(service.read(id)!.versions[0].events[0].detail).toContain('Corrected plan name');
    expect(care.client(id)!.file!.audit!.at(-1)!.action).toContain('Care plan save');
  });
  it('rejects stale revisions and workspace changes without losing the saved plan', () => {
    service.initialise(id, workspace);
    const p = draft(),
      r = revision();
    expect(service.commit(id, workspace, p, r, 'save')).toBeNull();
    expect(service.commit(id, workspace, p, r, 'save')).toContain('changed');
    expect(service.commit(id, 'other-workspace', p, revision(), 'save')).toContain('workspace');
  });
  it('requires complete care sections and a distinct approving manager', () => {
    service.initialise(id, workspace);
    expect(service.commit(id, workspace, draft(), revision(), 'submit')).toBeTruthy();
    const p = complete(draft());
    expect(service.commit(id, workspace, p, revision(), 'submit')).toBeNull();
    expect(service.commit(id, workspace, draft(), revision(), 'approve')).toContain(
      'different manager',
    );
    actor.set({ ...actor(), id: 'independent-manager', name: 'Independent Manager' });
    expect(service.commit(id, workspace, draft(), revision(), 'approve')).toBeNull();
    expect(draft().status).toBe('Approved');
    expect(service.commit(id, workspace, draft(), revision(), 'save')).toContain('immutable');
    expect(service.commit(id, workspace, draft(), revision(), 'review')).toBeNull();
    const records = service.read(id)!;
    expect(records.versions).toHaveLength(2);
    expect(records.versions[0].version).toBe('1.1');
    expect(records.versions[1].status).toBe('Approved');
  });
  it('filters approved instructions by audience and never exposes draft wording', () => {
    service.initialise(id, workspace);
    const p = complete(draft());
    p.sections[0].visibility.family = true;
    service.commit(id, workspace, p, revision(), 'submit');
    actor.set({ ...actor(), id: 'manager' });
    service.commit(id, workspace, draft(), revision(), 'approve');
    expect(approvedInstructions(care.client(id)!, 'family')).toHaveLength(1);
    service.commit(id, workspace, draft(), revision(), 'review');
    const changed = draft();
    changed.sections[0].fields['assistance'] = 'Unapproved instruction';
    service.commit(id, workspace, changed, revision(), 'save');
    expect(approvedInstructions(care.client(id)!, 'family')[0].instructions).not.toBe(
      'Unapproved instruction',
    );
  });
  it('blocks disclosure changes by supervisors and never modifies live call packages', () => {
    service.initialise(id, workspace);
    actor.set({ ...actor(), roleCode: 'FS' });
    const p = draft();
    p.sections[0].visibility.family = true;
    expect(service.commit(id, workspace, p, revision(), 'save')).toContain('Senior management');
    const calls = JSON.stringify(rota.data().calls);
    const proposal = draft();
    proposal.packageDecision = 'Change required';
    proposal.packageProposal = 'Recommend a longer morning visit.';
    expect(service.commit(id, workspace, proposal, revision(), 'save')).toBeNull();
    expect(JSON.stringify(rota.data().calls)).toBe(calls);
    expect(draft().packageStatus).toBe('Pending approval');
  });
  it('retains the saved version when device persistence fails', () => {
    service.initialise(id, workspace);
    const r = revision();
    const p = draft();
    p.details['language'] = 'Updated';
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    expect(service.commit(id, workspace, p, r, 'save')).toContain('Could not save');
    expect(revision()).toBe(r);
  });
  it('flags contradictions, missing actions, goals without dates and unresolved assessments', () => {
    service.initialise(id, workspace);
    const p = complete(draft());
    p.sections[2].fields['situation'] = 'No recent falls';
    p.sections[0].review = '';
    const c = structuredClone(care.client(id)!);
    c.file!.entries['incidents'] = [
      {
        id: 'fall-1',
        name: 'Fall',
        detail: 'Recorded fall',
        date: '2026-10-01',
        status: 'Active',
        level: 'High',
      },
    ];
    expect(planIssues(p, c).some((i) => i.includes('Contradiction'))).toBe(true);
    expect(planIssues(p, c).some((i) => i.includes('review date'))).toBe(true);
  });
  it('seeds only fictional demo clients and preserves existing versions on repeated seeding', () => {
    const seeded = seedCarePlans(store.data(), '2026-11-01');
    const record = seeded.rota!.clients.find((c) => c.id === id)!.file!.carePlan!;
    expect(record.versions.some((v) => v.status === 'Approved')).toBe(true);
    expect(record.versions[0].sections).toHaveLength(17);
    expect(record.versions[0].body.length).toBeGreaterThan(0);
    expect(
      seedCarePlans(seeded, '2026-11-01').rota!.clients.find((c) => c.id === id)!.file!.carePlan,
    ).toEqual(record);
  });
  it('renders every workflow stage and all care sections through the actual component template', async () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(
      page.querySelectorAll('[role="tablist"][aria-label="Care-plan modules"] [role="tab"]'),
    ).toHaveLength(6);
    expect(page.textContent).not.toContain('Service User Profile');
    (fixture.componentInstance as any).goSection(0);
    fixture.detectChanges();
    expect(
      page.querySelectorAll('[role="tablist"][aria-label="Care areas"] [role="tab"]'),
    ).toHaveLength(17);
    const body = page.querySelector<HTMLButtonElement>('[data-tab="body"]')!;
    body.click();
    fixture.detectChanges();
    expect(page.textContent).toContain('LQCS body chart');
    expect(page.querySelector('svg')).toBeTruthy();
    expect(page.textContent).toContain('Consent for care-record photography confirmed');
  });
  it('keeps voice suggestions in the draft until explicitly accepted and saved', () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    editor.goSection(2);
    editor.transcript = 'i prefer to walk at my own pace';
    editor.suggest();
    expect(draft().sections[2].fields['situation']).not.toContain('own pace');
    editor.acceptSuggestion();
    expect(editor.plan.sections[2].fields['situation']).toContain('own pace');
    expect(draft().sections[2].fields['situation']).not.toContain('own pace');
    editor.save();
    expect(draft().sections[2].fields['situation']).toContain('own pace');
    editor.transcript = 'discard this wording';
    editor.suggest();
    editor.rejectSuggestion();
    expect(editor.plan.sections[2].fields['situation']).not.toContain('discard this');
  });
  it('retains body history when resolving an observation and feeds assessment findings into the section', () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    Object.assign(editor.observation, {
      location: 'Left arm',
      type: 'Bruise',
      description: 'Small bruise',
      action: 'Monitor',
    });
    editor.saveObservation();
    expect(draft().body).toHaveLength(1);
    editor.editObservation(draft().body[0]);
    editor.observation.status = 'Resolved';
    editor.saveObservation();
    expect(draft().body[0].history).toHaveLength(2);
    expect(draft().body[0].status).toBe('Resolved');
    Object.assign(editor.assessment, {
      name: 'Skin / pressure',
      section: 'Personal Care',
      findings: 'Monitor skin at each visit',
      action: 'Report change',
      review: '2027-01-10',
      status: 'Completed',
    });
    editor.saveAssessment();
    expect(draft().sections[1].fields['risks']).toContain('Monitor skin');
    expect(draft().sections[1].fields['actions']).toContain('Report change');
    editor.editAssessment(draft().assessments[0]);
    editor.saveAssessment();
    expect(draft().sections[1].fields['risks'].match(/Monitor skin/g)).toHaveLength(1);
  });
  it('projects only family-visible approved sections through the real family record', () => {
    service.initialise(id, workspace);
    const p = complete(draft());
    p.sections[0].visibility.family = true;
    p.sections[1].fields['assistance'] = 'Management-only wording';
    service.commit(id, workspace, p, revision(), 'submit');
    actor.set({ ...actor(), id: 'manager' });
    service.commit(id, workspace, draft(), revision(), 'approve');
    const shared = care.familyRecord(id, care.familyPreviewAccessId(id), true)!;
    expect(shared.plan!.sections).toHaveLength(1);
    expect(JSON.stringify(shared.plan)).not.toContain('Management-only wording');
    expect(Object.keys(shared.plan!.details)).toHaveLength(0);
  });
  it('returns submitted versions with a recorded reason and supersedes the old approved version after review', () => {
    service.initialise(id, workspace);
    service.commit(id, workspace, complete(draft()), revision(), 'submit');
    actor.set({ ...actor(), id: 'manager' });
    expect(service.commit(id, workspace, draft(), revision(), 'return')).toBeTruthy();
    expect(
      service.commit(id, workspace, draft(), revision(), 'return', 'Clarify preferences'),
    ).toBeNull();
    expect(draft().events.at(-1)!.detail).toBe('Clarify preferences');
    service.commit(id, workspace, draft(), revision(), 'submit');
    service.commit(id, workspace, draft(), revision(), 'approve');
    service.commit(id, workspace, draft(), revision(), 'review');
    const p = complete(draft());
    service.commit(id, workspace, p, revision(), 'submit');
    actor.set({ ...actor(), id: 'second-manager' });
    expect(service.commit(id, workspace, draft(), revision(), 'approve')).toBeNull();
    expect(service.read(id)!.versions.map((v) => v.status)).toEqual(['Approved', 'Superseded']);
  });
  it('renders the approved instruction view without draft forms for care workers', () => {
    service.initialise(id, workspace);
    actor.set({ ...actor(), roleCode: 'CW' });
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('cv-scrolling-tabs')).toBeNull();
    expect(page.textContent).toContain('Approved visit care instructions');
    expect(page.textContent).not.toContain('Full name');
  });
  it('limits visit instructions to assigned published visits and rejects an invalid visit reference', () => {
    service.initialise(id, workspace);
    service.commit(id, workspace, complete(draft()), revision(), 'submit');
    actor.set({ ...actor(), id: 'manager' });
    service.commit(id, workspace, draft(), revision(), 'approve');
    const person = store.staff()[0];
    expect(
      store.saveWorkspace((data) => ({
        ...data,
        rota: {
          ...rota.data(),
          visits: [
            {
              id: 'plan-visit',
              callId: 'call',
              clientId: id,
              clientName: 'Fictional Person',
              address: 'Demo Road',
              callName: 'Personal care',
              date: '2026-11-01',
              start: '08:00',
              end: '08:30',
              carers: 1,
              skills: [],
              tasks: 'Support washing',
              staffIds: [],
              allocation: 'Regular',
              state: 'Published',
              priority: 'Standard',
              attendance: [],
              exception: '',
            },
          ],
        },
      })),
    ).toBe(true);
    actor.set({ ...actor(), email: person.email, roleCode: 'CW' });
    const fixture = TestBed.createComponent(ApprovedCareInstructions);
    fixture.componentRef.setInput('clientId', id);
    fixture.componentRef.setInput('visitId', 'plan-visit');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No approved instructions');
    expect(
      store.saveWorkspace((data) => ({
        ...data,
        rota: {
          ...rota.data(),
          visits: rota.data().visits.map((v) => ({ ...v, staffIds: [person.id] })),
        },
      })),
    ).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Personal Care');
    fixture.componentRef.setInput('visitId', 'unavailable');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No approved instructions');
  });
  it('restricts full generated PDFs and their disclosure even when general document management is enabled', () => {
    service.initialise(id, workspace);
    const person = store.staff()[0];
    const documentId = 'care-plan-pdf-' + draft().id;
    expect(
      care.saveDocument(id, workspace, {
        id: documentId,
        name: 'Full care plan',
        category: 'Care Plan',
        version: '1.0',
        data: 'data:application/pdf;base64,QQ==',
        mime: 'application/pdf',
        size: 1,
        at: '2026-11-01T09:00:00Z',
        by: 'Manager',
        visibility: { staff: false, family: false, inspector: false },
      }),
    ).toBeNull();
    actor.set({ ...actor(), roleCode: 'FS' });
    expect(care.setDocumentVisibility(id, workspace, documentId, 'family', true, 1)).toContain(
      'Senior management',
    );
    actor.set({ ...actor(), email: person.email, roleCode: 'CW' });
    expect(care.documents(id)).toHaveLength(0);
    expect(care.familyRecord(id, care.familyPreviewAccessId(id), true)!.documents).toHaveLength(0);
  });
  it('requires an independent approver when another manager has edited the original author’s draft', () => {
    service.initialise(id, workspace);
    actor.set({ ...actor(), id: 'editing-manager' });
    expect(service.commit(id, workspace, complete(draft()), revision(), 'submit')).toBeNull();
    expect(service.commit(id, workspace, draft(), revision(), 'approve')).toContain(
      'different manager',
    );
    actor.set({ ...actor(), id: 'independent-manager' });
    expect(service.commit(id, workspace, draft(), revision(), 'approve')).toBeNull();
  });
  it('seeds all evidence categories and filters findings by the evidence actually selected', () => {
    const report = seededReviewReport();
    expect(new Set(report.sources.map((source) => source.category))).toEqual(
      new Set(REVIEW_SOURCE_CATEGORIES),
    );
    expect(
      report.findings.every((f) =>
        f.sourceIds.every((id) => report.sources.some((source) => source.id === id)),
      ),
    ).toBe(true);
    report.sources
      .filter((source) => source.category === 'Incidents & falls')
      .forEach((source) => (source.enabled = false));
    expect(visibleReviewFindings(report).some((f) => f.id === 'fall-wording')).toBe(false);
    expect(visibleReviewFindings(report, 'High').every((f) => f.severity === 'High')).toBe(true);
  });
  it('previews structured demo wording without publishing or saving unaccepted changes', () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    editor.goSection(2);
    editor.loadWordingExample();
    editor.suggest();
    expect(editor.wordingProposals.length).toBeGreaterThan(5);
    const proposal = editor.wordingProposals.find((p: any) => p.field === 'strengths');
    const previous = draft().sections[2].fields['strengths'];
    expect(previous).not.toBe(proposal.suggested);
    editor.decideWording(proposal, 'Accepted');
    expect(draft().sections[2].fields['strengths']).toBe(previous);
    editor.save();
    expect(draft().sections[2].fields['strengths']).toBe(proposal.suggested);
    expect(draft().status).toBe('Draft');
  });
  it('keeps transcript and care wording when the seeded service-unavailable scenario is selected', () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    editor.goSection(2);
    editor.wordingScenario = 'Service unavailable';
    editor.loadWordingExample();
    const transcript = editor.transcript;
    editor.suggest();
    expect(editor.wordingStatus).toBe('Failed');
    expect(editor.transcript).toBe(transcript);
    expect(editor.wordingProposals).toHaveLength(0);
    editor.wordingScenario = 'No change';
    editor.loadWordingExample();
    editor.suggest();
    expect(editor.wordingStatus).toBe('Suggestions ready');
  });
  it('requires reviewer rationale and retains review decisions after save and reload', () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    editor.runReview();
    const finding = editor.report.findings[0];
    editor.decideFinding(finding, 'Accepted');
    expect(editor.error()).toContain('rationale');
    expect(finding.decision).toBe('Pending');
    finding.rationale = 'Reviewed the fictional evidence with the participant.';
    finding.suggested = 'Edited wording approved for this draft.';
    editor.decideFinding(finding, 'Accepted');
    expect(draft().sections[2].fields['situation']).not.toBe(finding.suggested);
    editor.save();
    expect(draft().sections[2].fields['situation']).toBe(finding.suggested);
    expect(draft().reviewReport!.findings[0].decision).toBe('Accepted');
    expect(draft().events.some((e) => e.action === 'Review suggestion accepted')).toBe(true);
    editor.load();
    expect(editor.report.findings[0].rationale).toContain('fictional evidence');
  });
  it('rejects an evidence suggestion without altering existing section wording', () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    const before = JSON.stringify(editor.plan.sections);
    const finding = editor.report.findings[0];
    finding.rationale = 'Does not reflect the confirmed current situation.';
    editor.decideFinding(finding, 'Rejected');
    editor.save();
    expect(JSON.stringify(draft().sections)).toBe(before);
    expect(draft().reviewReport!.findings[0].decision).toBe('Rejected');
  });
  it('renders the deep-linked quality flow and loads structured examples for all nine assessments', () => {
    service.initialise(id, workspace);
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.queryParamMap = convertToParamMap({ stage: 'quality' });
    route.queryParamMap = of(route.snapshot.queryParamMap);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('AI care-plan review and quality checking');
    const editor = fixture.componentInstance as any;
    for (const name of Object.keys(ASSESSMENT_FIELDS)) {
      editor.assessment.name = name;
      editor.assessmentTypeChanged();
      editor.loadAssessmentExample();
      expect(Object.keys(editor.assessment.fields)).toHaveLength(ASSESSMENT_FIELDS[name].length);
    }
    editor.tab = 'Assessments';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('structured assessment');
  });
  it('upgrades existing demo drafts with examples while preserving approved versions and edited wording', () => {
    const first = seedCarePlans(store.data(), '2026-11-01');
    const client = first.rota!.clients.find((c) => c.id === id)!;
    const approved = JSON.stringify(
      client.file!.carePlan!.versions.find((v) => v.status === 'Approved'),
    );
    const candidate = client.file!.carePlan!.versions.find((v) => v.status === 'In review')!;
    candidate.status = 'Draft';
    const p = client.file!.carePlan!.versions.find((v) => v.status === 'Draft');
    if (p) {
      p.sections[0].fields['situation'] = 'User edited wording';
      delete p.reviewReport;
      p.assessments = [];
    }
    const next = seedCarePlans(first, '2026-11-01').rota!.clients.find((c) => c.id === id)!.file!
      .carePlan!;
    expect(JSON.stringify(next.versions.find((v) => v.status === 'Approved'))).toBe(approved);
    if (p) {
      const enriched = next.versions.find((v) => v.status === 'Draft')!;
      expect(enriched.sections[0].fields['situation']).toBe('User edited wording');
      expect(enriched.assessments).toHaveLength(9);
      expect(enriched.reviewReport!.findings.length).toBeGreaterThan(5);
    }
  });
  it('invalidates wording previews when the transcript or target field changes', () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    editor.goSection(2);
    editor.loadWordingExample();
    editor.suggest();
    editor.voiceField = 'equipment';
    editor.voiceFieldChanged();
    expect(editor.suggestion).toBe('');
    editor.transcript = 'Different transcript';
    editor.transcriptChanged();
    expect(editor.wordingProposals).toHaveLength(0);
    expect(editor.suggestion).toBe('');
  });
  it('allows the seeded Sarah Clarke account to view instructions for an actually assigned demo visit', () => {
    expect(store.saveWorkspace((data) => seedCareDemo(data))).toBe(true);
    const auth = TestBed.inject(AuthService);
    vi.mocked(auth.currentUser).mockRestore();
    auth.signIn('sarah.clarke@example.test', 'CareVerity123!');
    auth.verifyMfa('123456', false);
    TestBed.inject(WorkspaceService).switchWorkspace(workspace);
    expect(auth.currentUser()!.roleCode).toBe('CW');
    const staff = store.staff().find((p) => p.email === 'sarah.clarke@example.test')!;
    expect(staff).toBeTruthy();
    const visit = rota
      .data()
      .visits.find((v) => v.state === 'Published' && v.staffIds.includes(staff.id))!;
    expect(visit).toBeTruthy();
    const fixture = TestBed.createComponent(ApprovedCareInstructions);
    fixture.componentRef.setInput('clientId', visit.clientId);
    fixture.componentRef.setInput('visitId', visit.id);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('details').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).not.toContain('No approved instructions');
  });
  it('switches all seventeen care areas while retaining the person header and unsaved care wording', () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    const header = fixture.nativeElement.querySelector('.care-plan-sticky-shell');
    editor.goSection(1);
    editor.section.fields['situation'] = 'Unsaved personal-care wording';
    for (let index = 0; index < 17; index++) {
      editor.selectArea('area-' + index);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.care-plan-sticky-shell')).toBe(header);
      const selected = fixture.nativeElement.querySelector(
        '[role="tab"][data-tab="area-' + index + '"]',
      );
      expect(
        selected,
        `Care area ${index}: view=${editor.workspaceView}, tab=${editor.tab}`,
      ).toBeTruthy();
      expect(selected?.getAttribute('aria-selected')).toBe('true');
    }
    editor.goSection(1);
    expect(editor.section.fields['situation']).toBe('Unsaved personal-care wording');
    expect(draft().sections[1].fields['situation']).not.toContain('Unsaved');
  });

  it('shows subtabs only for Care Plan and keeps Service User editors out of the workspace', () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role="tablist"][aria-label="Care areas"]')).toBeNull();
    editor.openWorkspace('care-plan');
    fixture.detectChanges();
    expect(page.querySelector('[role="tablist"][aria-label="Care areas"]')).toBeTruthy();
    for (const view of ['assessments', 'body', 'quality', 'versions', 'overview']) {
      editor.openWorkspace(view);
      fixture.detectChanges();
      expect(page.querySelector('[role="tablist"][aria-label="Care areas"]')).toBeNull();
      expect(
        page.querySelector('[role="tablist"][aria-label="Care-plan review steps"]'),
      ).toBeNull();
    }
    expect(
      page.querySelector(
        'cv-medication,cv-visit-planner,cv-visit-notes,cv-care-documents,cv-care-records',
      ),
    ).toBeNull();
    editor.openWorkspace('medication');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
      ['/manage/clients', id, 'medication'],
      expect.anything(),
    );
  });
  it('saves linked records in the Service User file without replacing the care plan', () => {
    service.initialise(id, workspace);
    const plan = JSON.stringify(service.read(id));
    const entry = {
      id: '',
      name: 'New fictional incident',
      detail: 'Record follow-up with supervisor.',
      date: '2026-11-01',
      level: 'Low' as const,
      status: 'Active' as const,
    };
    expect(
      care.saveLinkedClientEntry(
        id,
        workspace,
        'incidents',
        entry,
        care.client(id)!.file!.updatedAt,
      ),
    ).toBeNull();
    expect(care.client(id)!.file!.entries['incidents'][0].name).toBe(entry.name);
    expect(JSON.stringify(service.read(id))).toBe(plan);
  });
  it('prints Overview and copies its link without changing saved care data', async () => {
    service.initialise(id, workspace);
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.componentInstance as any;
    const before = JSON.stringify(service.read(id));
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const previous = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    editor.printOverview();
    await editor.shareOverview();
    expect(print).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(window.location.origin + '/manage/care-plans/' + id);
    expect(editor.notice()).toContain('link copied');
    expect(JSON.stringify(service.read(id))).toBe(before);
    print.mockRestore();
    if (previous) Object.defineProperty(navigator, 'clipboard', previous);
    else delete (navigator as any).clipboard;
  });
  it('does not treat a rejected AI proposal or raw transcript as approved care wording', () => {
    service.initialise(id, workspace);
    const p = complete(draft());
    const client = structuredClone(care.client(id)!);
    client.file!.entries['incidents'] = [
      {
        id: 'fall',
        name: 'Fall',
        detail: 'Recorded fall',
        date: '2026-10-01',
        status: 'Active',
        level: 'Medium',
      },
    ];
    p.sections[1].fields['personalAiDraft'] = 'No recent falls';
    p.sections[1].fields['personalAiDecision'] = 'Rejected';
    p.sections[1].fields['personalVoiceTranscript'] = 'No recent falls';
    expect(planIssues(p, client).some((issue) => issue.includes('Contradiction'))).toBe(false);
    p.sections[1].fields['situation'] = 'No recent falls';
    expect(planIssues(p, client).some((issue) => issue.includes('Contradiction'))).toBe(true);
  });
});
