import { By } from '@angular/platform-browser';
import { NgModel } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ACADEMY_ADMIN_ROUTES } from './academy.routes';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { DEMO_USER } from '../../../../demo/business-fixtures';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyService } from './academy.service';
import { AcademyGovernanceService } from './academy-governance.service';
import {
  AcademyDemoWorkflow,
  ACADEMY_DEMO_PDF,
  ACADEMY_DEMO_STEP_DELAY,
} from './academy-demo-workflow';
import { AcademyRequirement, emptyGovernance, evidenceCurrent } from './academy-governance.models';
import { addDays, londonDate } from '../../rota/rota.models';
import { academyKpis } from './academy-kpis';

describe('Academy governed frontend journeys', () => {
  let academy: AcademyService, operations: AcademyGovernanceService, store: ManagementStore;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  const pdf = vi.fn(async () => ({
    content: 'data:application/pdf;base64,' + btoa('%PDF-1.7\nGovernance fixture\n%%EOF'),
    checksum: 'governance-checksum',
  }));
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    pdf.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'manage/learning', children: ACADEMY_ADMIN_ROUTES }]),
        { provide: ACADEMY_DEMO_PDF, useValue: pdf },
        { provide: ACADEMY_DEMO_STEP_DELAY, useValue: 0 },
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInDemoSession();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    actor.set({ ...DEMO_USER, roleCode: 'CA', email: store.staff()[0].email });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    store.update((d) => ({
      ...d,
      people: d.people.map((p) => ({ ...p, learning: [], progress: {} })),
    }));
    academy = TestBed.inject(AcademyService);
    operations = TestBed.inject(AcademyGovernanceService);
  });
  afterEach(() => vi.restoreAllMocks());
  function governance() {
    expect(
      store.saveWorkspace((d) => ({
        ...d,
        academy: { ...academy.state(), governance: emptyGovernance() },
      })),
    ).toBe(true);
  }
  function ready() {
    const course = academy.state().courses[0],
      person = store.staff()[0];
    expect(
      academy.assign(
        [person.id],
        [course.id],
        addDays(londonDate(), 14),
        0,
        '',
        false,
        false,
        'lqcs',
      ),
    ).toBeNull();
    const assignment = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id && !a.archived)!;
    course.lessons.forEach((l) =>
      expect(academy.saveLesson(assignment.id, l.id, null, null, true, 'lqcs')).toBeNull(),
    );
    return { course, person, assignment: academy.assignment(assignment.id)! };
  }
  function passed() {
    const source = ready(),
      start = academy.startAttempt(source.assignment.id, 'lqcs');
    expect(start.error).toBeNull();
    const attempt = academy.state().attempts.find((a) => a.id === start.id)!;
    attempt.questions.forEach((q) =>
      expect(academy.answer(attempt.id, q.id, q.correctIds, null, 'lqcs')).toBeNull(),
    );
    expect(academy.submit(attempt.id, 'lqcs')).toBeNull();
    return { ...source, attempt: academy.attempt(attempt.id)! };
  }
  function rule(): AcademyRequirement {
    return {
      id: 'rule',
      courseId: academy.state().courses[0].id,
      roles: [],
      branches: [],
      serviceCategory: '',
      effectiveFrom: londonDate(),
      effectiveTo: '',
      minimumVersion: 0,
      allowExternal: true,
      reviewRequired: false,
      renewalMonths: 12,
      reminderDays: [30, 14, 7],
      autoAssign: false,
    };
  }
  it('seeds source-linked examples once without duplicating review cycles or notices', () => {
    const previous = passed();
    expect(operations.seed()).toBeNull();
    const before = structuredClone(academy.state());
    expect(operations.seed()).toBeNull();
    expect(academy.state()).toEqual(before);
    expect(operations.data().reviews.length).toBeGreaterThan(0);
    expect(operations.data().adjustments.length).toBeGreaterThan(0);
    expect(
      academy.assignments().find((a) => a.id === operations.data().adjustments[0].assignmentId)
        ?.completedAt,
    ).toBe('');
    expect(operations.data().adjustments[0].assignmentId).not.toBe(previous.assignment.id);
    expect(new Set(operations.data().deliveries.map((n) => n.status))).toEqual(
      new Set(['Queued', 'Sent', 'Delivered', 'Failed']),
    );
    const review = operations.data().reviews[0];
    expect(academy.state().attempts.find((a) => a.id === review.attemptId)?.passed).toBe(false);
    expect(operations.data().grants[0].expiresAt).toBeTruthy();
    expect(operations.data().authorisations[0].status).toBe('Restricted');
  });
  it('separates HR assignment from course publication and honours scoped expiring reviewer grants', () => {
    governance();
    actor.update((a) => ({ ...a, roleCode: 'HR' }));
    expect(academy.can('assign')).toBe(true);
    expect(academy.can('publish')).toBe(false);
    const course = structuredClone(academy.state().courses[0]);
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toContain('permission');
    actor.update((a) => ({ ...a, roleCode: 'CA' }));
    const p = store.staff()[0],
      other = store.staff()[1];
    expect(
      operations.saveGrant({
        id: 'grant',
        email: 'auditor@example.invalid',
        role: 'QA',
        personIds: [p.id],
        capabilities: ['evidence', 'export'],
        startsAt: new Date(Date.now() - 1000).toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        reason: 'Inspection review',
        approvedBy: '',
        revokedAt: '',
      }),
    ).toBeNull();
    actor.update((a) => ({ ...a, roleCode: 'QA', email: 'auditor@example.invalid' }));
    expect(academy.canReadPerson(p.id)).toBe(true);
    expect(academy.canReadPerson(other.id)).toBe(false);
    expect(academy.can('assign', p.id)).toBe(false);
    expect(academy.recordReport('Scoped inspection', 'lqcs')).toBeNull();
    expect(
      store.saveWorkspace((d) => ({
        ...d,
        academy: {
          ...academy.state(),
          governance: {
            ...operations.data(),
            grants: operations
              .data()
              .grants.map((g) => ({ ...g, expiresAt: '2020-01-01T00:00:00Z' })),
          },
        },
      })),
    ).toBe(true);
    expect(academy.canReadPerson(p.id)).toBe(false);
    actor.update((a) => ({ ...a, roleCode: 'CA', email: store.staff()[0].email }));
    expect(operations.revokeGrant('grant')).toBeNull();
    actor.update((a) => ({ ...a, roleCode: 'QA', email: 'auditor@example.invalid' }));
    expect(academy.canReadPerson(p.id)).toBe(false);
    expect(academy.canReadPerson(other.id)).toBe(false);
  });
  it('freezes approved extra time and withholds delayed or manager-release answers', () => {
    governance();
    const source = ready();
    expect(
      operations.saveAdjustment({
        id: 'adjust',
        assignmentId: source.assignment.id,
        personId: source.person.id,
        extraMinutes: 20,
        untimed: false,
        reason: 'Approved reading adjustment',
        approvedBy: '',
        approvedAt: '',
        expires: addDays(londonDate(), 30),
      }),
    ).toBeNull();
    const start = academy.startAttempt(source.assignment.id, 'lqcs');
    expect(start.error).toBeNull();
    const a = academy.state().attempts.find((a) => a.id === start.id)!;
    expect(Date.parse(a.deadline) - Date.parse(a.startedAt)).toBe(
      (academy.policyFor(source.course).timeLimitMinutes + 20) * 60000,
    );
    expect(a.adjustment?.approvedBy).toBe(actor().name);
    expect(
      operations.saveAdjustment({ ...operations.data().adjustments[0], extraMinutes: 40 }),
    ).toBeNull();
    expect(academy.attempt(a.id)?.adjustment?.extraMinutes).toBe(20);
    a.questions.forEach((q) =>
      expect(academy.answer(a.id, q.id, q.correctIds, null, 'lqcs')).toBeNull(),
    );
    expect(academy.submit(a.id, 'lqcs')).toBeNull();
    expect(
      store.saveWorkspace((d) => ({
        ...d,
        academy: {
          ...academy.state(),
          attempts: academy
            .state()
            .attempts.map((v) =>
              v.id === a.id
                ? { ...v, policy: { ...v.policy!, feedbackMode: 'Manager release' } }
                : v,
            ),
        },
      })),
    ).toBe(true);
    actor.update((v) => ({ ...v, roleCode: 'CW' }));
    expect(academy.attempt(a.id)?.questions.every((q) => q.correctIds.length === 0)).toBe(true);
    actor.update((v) => ({ ...v, roleCode: 'CA' }));
    expect(operations.releaseFeedback(a.id)).toBeNull();
    actor.update((v) => ({ ...v, roleCode: 'CW' }));
    expect(academy.attempt(a.id)?.questions.some((q) => q.correctIds.length > 0)).toBe(true);
  });
  it('enforces branch and course prerequisites consistently before learning and assessments', () => {
    const course = structuredClone(academy.state().courses[0]);
    course.targetBranches = ['Not the staff branch'];
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    expect(
      academy.assign(
        [store.staff()[0].id],
        [course.id],
        addDays(londonDate(), 7),
        0,
        '',
        false,
        false,
        'lqcs',
      ),
    ).toContain('audience');
    const available = structuredClone(academy.course(course.id)!);
    available.targetBranches = [];
    available.prerequisiteCourseIds = [academy.state().courses[1].id];
    expect(academy.saveCourse(available, 'lqcs', available.updatedAt)).toBeNull();
    const person = store.staff()[0];
    expect(
      academy.assign(
        [person.id],
        [course.id],
        addDays(londonDate(), 7),
        0,
        '',
        false,
        false,
        'lqcs',
      ),
    ).toBeNull();
    const assignment = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id && !a.archived)!;
    expect(academy.lessonBlock(assignment, course.lessons[0].id)).toContain('prerequisite');
    expect(academy.startAttempt(assignment.id, 'lqcs').error).toContain('prerequisite');
  });
  it('runs automatic assignment rules idempotently and keeps prospective policy terms separate', () => {
    governance();
    const r = rule();
    r.autoAssign = true;
    expect(operations.saveRequirement(r)).toBeNull();
    expect(operations.runSchedules()).toBeNull();
    const count = academy.assignments().length;
    expect(count).toBeGreaterThan(0);
    expect(operations.runSchedules()).toBeNull();
    expect(academy.assignments()).toHaveLength(count);
    expect(operations.saveRequirement({ ...r, id: 'overlap' })).toContain('overlaps');
    const p = store.staff()[0];
    const scoped = { ...r, reviewRequired: true };
    expect(operations.saveRequirement(scoped)).toBeNull();
    expect(academy.knowledgeCompliance(p.id).missing.some((c) => c.id === r.courseId)).toBe(true);
  });
  it('records delivery failures and retries without false external delivery, and reconciles offline operations', () => {
    governance();
    const source = ready();
    expect(
      operations.queueDelivery(
        source.person.id,
        source.assignment.id,
        'Email',
        'Renew your training',
      ),
    ).toBeNull();
    const delivery = operations.data().deliveries.at(-1)!;
    expect(operations.setChannelFailure(true)).toBeNull();
    expect(operations.processDelivery(delivery.id)).toBeNull();
    expect(operations.data().deliveries.find((n) => n.id === delivery.id)?.status).toBe('Failed');
    expect(
      operations.data().deliveries.find((n) => n.id === delivery.id)?.nextAttemptAt,
    ).toBeTruthy();
    expect(operations.setChannelFailure(false)).toBeNull();
    expect(operations.processDelivery(delivery.id, true)).toBeNull();
    expect(operations.processDelivery(delivery.id)).toBeNull();
    expect(operations.processDelivery(delivery.id)).toBeNull();
    const n = operations.data().deliveries.find((n) => n.id === delivery.id)!;
    expect(n.status).toBe('Delivered');
    expect(n.providerId).toMatch(/^local-demo:/);
    expect(n.attempts).toBe(2);
    expect(operations.setOffline(true)).toBeNull();
    const start = academy.startAttempt(source.assignment.id, 'lqcs');
    expect(start.error).toBeNull();
    expect(operations.data().syncQueue?.some((e) => e.status === 'Pending')).toBe(true);
    expect(operations.setOffline(false)).toBeNull();
    expect(operations.data().syncQueue?.every((e) => e.status === 'Reconciled')).toBe(true);
    expect(academy.startAttempt(source.assignment.id, 'lqcs').id).toBe(start.id);
  });
  it('keeps remediation, disclosure approval and evidence exports controlled and source-linked', () => {
    expect(operations.seed()).toBeNull();
    const review = structuredClone(operations.data().reviews[0]);
    review.status = 'Resolved';
    expect(operations.saveReview(review)).toContain('decision');
    review.actions = 'Supervised scenario review completed';
    review.decision = 'Arrange a separately approved refresher cycle';
    expect(operations.saveReview(review)).toBeNull();
    expect(operations.saveReview(review)).toContain('read-only');
    const request = academy.state().accessRequests!.find((r) => r.id === 'demo-record-request')!;
    expect(operations.disclosure(request.id, 'Provided', 'Approved', 'secure-case-1')).toContain(
      'prior approval',
    );
    expect(
      operations.disclosure(request.id, 'Approved', 'Approved after identity check', ''),
    ).toBeNull();
    expect(
      operations.disclosure(request.id, 'Provided', 'Records provided', 'secure-case-1'),
    ).toBeNull();
    expect(academy.acknowledgeRecordsRequest(request.id, 'lqcs')).toContain('already progressed');
    const pack = operations.redactedEvidence()!;
    const text = JSON.stringify(pack);
    for (const field of [
      'correctIds',
      'questionSnapshot',
      'courseSnapshot',
      'positions',
      'watchedRanges',
      'notes',
      'answers',
      'pdfContent',
    ])
      expect(text).not.toContain('"' + field + '"');
    expect(pack.assignments.length).toBeGreaterThan(0);
  });
  it('issues a linked certificate correction without manufacturing a new assessment pass and invalidates safely', async () => {
    governance();
    const source = passed();
    const workflow = TestBed.inject(AcademyDemoWorkflow);
    const initialJob = academy.completion(source.assignment.id)!;
    await workflow.process(initialJob.id);
    const first = academy
      .state()
      .certificates.find((c) => c.passedAttemptId === source.attempt.id)!;
    const attemptCount = academy.state().attempts.length;
    expect(
      operations.reissue(first.id, 'Correct the certificate identity after HR review'),
    ).toBeNull();
    const replacement = academy.state().certificates.find((c) => c.replacesId === first.id)!;
    expect(replacement.passedAttemptId).toBe(source.attempt.id);
    expect(academy.state().attempts).toHaveLength(attemptCount);
    const job = academy.state().completions!.find((j) => j.certificateId === replacement.id)!;
    await workflow.process(job.id);
    expect(academy.state().completions!.find((j) => j.id === job.id)?.status).toBe(
      'COMPLETE_SYNCED',
    );
    expect(
      store
        .staff()
        .find((p) => p.id === source.person.id)
        ?.documents?.some(
          (d) =>
            d.id === academy.state().certificates.find((c) => c.id === replacement.id)?.documentId,
        ),
    ).toBe(true);
    expect(academy.state().certificates.find((c) => c.id === first.id)?.revokedAt).toBeTruthy();
    expect(pdf).toHaveBeenCalledTimes(2);
    expect(
      operations.invalidate(source.attempt.id, 'Result withdrawn after documented review'),
    ).toBeNull();
    expect(academy.attempt(source.attempt.id)?.passed).toBe(true);
    expect(academy.attempt(source.attempt.id)?.invalidatedAt).toBeTruthy();
    expect(operations.reissue(replacement.id, 'Cannot replace an invalid result')).toContain(
      'invalidated',
    );
  });
  it('reconciles unmatched verified passes without duplicate certificates and keeps KPI denominators separate', async () => {
    governance();
    const source = passed();
    expect(
      store.saveWorkspace((d) => ({
        ...d,
        academy: { ...academy.state(), certificates: [], completions: [] },
      })),
    ).toBe(true);
    const workflow = TestBed.inject(AcademyDemoWorkflow);
    workflow.reconcile();
    workflow.reconcile();
    expect(
      academy.state().certificates.filter((c) => c.passedAttemptId === source.attempt.id),
    ).toHaveLength(1);
    const job = academy.state().completions!.find((j) => j.attemptId === source.attempt.id)!;
    await workflow.process(job.id);
    expect(academy.state().completions!.find((j) => j.id === job.id)?.status).toBe(
      'COMPLETE_SYNCED',
    );
    expect(
      store.saveWorkspace((d) => ({
        ...d,
        academy: {
          ...academy.state(),
          attempts: [
            ...academy.state().attempts,
            { ...source.attempt, id: 'module-quiz', groupId: 'module', passed: false, score: 0 },
            {
              ...source.attempt,
              id: 'survey',
              groupId: 'survey',
              groupKind: 'Survey',
              score: null,
            },
          ],
        },
      })),
    ).toBe(true);
    const kpi = academyKpis(academy.state(), store.staff());
    expect(kpi.finalAttempts).toBe(1);
    expect(kpi.checkpointAttempts).toBe(1);
    expect(kpi.finalPassRate).toBe('100%');
    expect(kpi.checkpointPassRate).toBe('0%');
  });
  it('renders the review journey and saves a resolved decision before locking the retained record', async () => {
    vi.spyOn(operations, 'seedMedia').mockResolvedValue(null);
    const harness = await RouterTestingHarness.create('/manage/learning/governance');
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    await settle();
    const page = () => harness.routeNativeElement!;
    expect(page().querySelectorAll('.governance-tabs button')).toHaveLength(9);
    Array.from(page().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Review')!
      .click();
    await settle();
    const fill = (name: string, value: string) => {
      const input = page().querySelector<HTMLTextAreaElement>('[name="' + name + '"]')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    fill('reviewActions', 'Supervised scenario review completed');
    fill('reviewDecision', 'A new approved refresher cycle is required');
    harness
      .routeDebugElement!.query(By.css('[name="reviewStatus"]'))
      .injector.get(NgModel)
      .control.setValue('Resolved');
    await settle();
    const button = Array.from(page().querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Save review',
    )!;
    expect(button.disabled).toBe(false);
    page()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle();
    expect(operations.data().reviews[0].status).toBe('Resolved');
    expect(operations.data().reviews[0].decision).toContain('approved refresher');
    Array.from(page().querySelectorAll<HTMLButtonElement>('.governance-tabs button'))
      .find((b) => b.textContent?.includes('Notifications'))!
      .click();
    await settle();
    expect(page().textContent).toContain('Simulated provider outage');
    expect(page().textContent).toContain('Queued');
  });
  it('keeps the policy workspaces read-only for evidence reviewers', async () => {
    expect(operations.seed()).toBeNull();
    actor.update((a) => ({ ...a, roleCode: 'QA' }));
    const harness = await RouterTestingHarness.create('/manage/learning/governance');
    await harness.fixture.whenStable();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    expect(page.querySelectorAll('.governance-tabs button')).toHaveLength(8);
    expect(page.querySelector('fieldset')?.disabled).toBe(true);
    Array.from(page.querySelectorAll<HTMLButtonElement>('.governance-tabs button'))
      .find((b) => b.textContent?.includes('Requirements'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(
      Array.from(page.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.includes('Run renewal scheduler'),
      )!.disabled,
    ).toBe(true);
  });

  it('grants diagnostics without access to staff evidence or private PDFs', () => {
    governance();
    expect(
      operations.saveGrant({
        id: 'support',
        email: 'support@example.invalid',
        role: 'QA',
        personIds: [],
        capabilities: ['diagnostics'],
        startsAt: new Date(Date.now() - 1000).toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        reason: 'Approved processing incident',
        approvedBy: '',
        revokedAt: '',
      }),
    ).toBeNull();
    actor.update((a) => ({ ...a, roleCode: 'QA', email: 'support@example.invalid' }));
    expect(academy.can('diagnostics')).toBe(true);
    expect(academy.canReadCertificate()).toBe(false);
    expect(academy.canReadPerson(store.staff()[0].id)).toBe(false);
    expect(academy.can('author')).toBe(false);
  });
  it('freezes renewal policy intervals on new assignments and retains media quarantine states', () => {
    governance();
    const r = rule();
    r.renewalMonths = 6;
    expect(operations.saveRequirement(r)).toBeNull();
    const source = ready();
    expect(source.assignment.renewalPolicyId).toBe(r.id);
    expect(source.assignment.courseSnapshot?.validityMonths).toBe(6);
    expect(operations.saveRequirement({ ...r, renewalMonths: 12 })).toBeNull();
    expect(academy.assignment(source.assignment.id)?.courseSnapshot?.validityMonths).toBe(6);
    expect(
      academy.saveAsset(
        {
          id: 'resource',
          name: 'Review.pdf',
          mime: 'application/pdf',
          size: 100,
          kind: 'Document',
          at: new Date().toISOString(),
          by: 'Demo',
          status: 'READY',
        },
        'lqcs',
      ),
    ).toBeNull();
    expect(academy.simulateMediaCheck('resource', true, 'lqcs')).toBeNull();
    expect(academy.state().assets.find((a) => a.id === 'resource')?.status).toBe('FAILED');
    expect(academy.simulateMediaCheck('resource', false, 'lqcs')).toBeNull();
    expect(academy.state().assets.find((a) => a.id === 'resource')?.status).toBe('READY');
  });
  it('recovers a missing filed document under the same certificate without duplicating history', async () => {
    governance();
    const source = passed();
    const workflow = TestBed.inject(AcademyDemoWorkflow);
    const job = academy.completion(source.assignment.id)!;
    await workflow.process(job.id);
    const certificate = academy
      .state()
      .certificates.find((c) => c.passedAttemptId === source.attempt.id)!;
    expect(
      store.saveWorkspace((data) => ({
        ...data,
        people: data.people.map((p) =>
          p.id === source.person.id
            ? {
                ...p,
                documents: p.documents?.filter(
                  (d) => d.id !== academy.completion(source.assignment.id)?.documentId,
                ),
              }
            : p,
        ),
      })),
    ).toBe(true);
    workflow.reconcile();
    await workflow.process(job.id);
    expect(academy.completion(source.assignment.id)?.status).toBe('COMPLETE_SYNCED');
    expect(
      academy.state().certificates.filter((c) => c.passedAttemptId === source.attempt.id),
    ).toHaveLength(1);
    expect(
      academy.state().certificates.find((c) => c.id === certificate.id)?.documentId,
    ).toBeTruthy();
    expect(
      store
        .staff()
        .find((p) => p.id === source.person.id)
        ?.hr?.trainingHistory?.filter((t) => t.sourceCompletionId === job.id),
    ).toHaveLength(1);
  });
  it('keeps staff outside a reviewer grant out of certificate selectors and evidence rows', async () => {
    governance();
    const source = passed(),
      other = store.staff()[1];
    expect(
      operations.saveGrant({
        id: 'scoped-ui',
        email: 'scoped@example.invalid',
        role: 'QA',
        personIds: [other.id],
        capabilities: ['evidence', 'export'],
        startsAt: new Date(Date.now() - 1000).toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        reason: 'Limited evidence inspection',
        approvedBy: '',
        revokedAt: '',
      }),
    ).toBeNull();
    actor.update((a) => ({ ...a, roleCode: 'QA', email: 'scoped@example.invalid' }));
    const harness = await RouterTestingHarness.create('/manage/learning/certificates');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).not.toContain(source.person.name);
    expect(harness.routeNativeElement!.textContent).toContain('No completion evidence');
    const select = harness.routeDebugElement!.query(
      By.css('[aria-label="Select staff certificates"]'),
    ).componentInstance;
    expect(select.options.length).toBe(1);
  });
});
