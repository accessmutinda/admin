import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { DEMO_USER } from '../../../../core/auth/fixtures';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore } from '../../shared/management.store';
import { staffRecord } from '../../people/hr.models';
import { AcademyService } from './academy.service';
import {
  AcademyDemoWorkflow,
  ACADEMY_DEMO_PDF,
  ACADEMY_DEMO_STEP_DELAY,
} from './academy-demo-workflow';
import { downloadAcademyCertificate } from './academy-pdf';

describe('Seeded Academy completion automation', () => {
  let academy: AcademyService, store: ManagementStore;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  const renderer = vi.fn(async () => ({
    content: 'data:application/pdf;base64,' + btoa('%PDF-1.7\nSeeded certificate\n%%EOF'),
    checksum: 'verified-demo-checksum',
  }));
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    renderer.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: ACADEMY_DEMO_PDF, useValue: renderer },
        { provide: ACADEMY_DEMO_STEP_DELAY, useValue: 0 },
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInDemoSession();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    actor.set({ ...DEMO_USER, roleCode: 'CA', email: store.staff()[0].email });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    academy = TestBed.inject(AcademyService);
  });
  afterEach(() => vi.restoreAllMocks());
  function pass(courseId = academy.state().courses[0].id) {
    const person = academy.me()!;
    const course = academy.state().courses.find((c) => c.id === courseId)!;
    expect(
      academy.assign([person.id], [courseId], '2026-12-31', 0, '', false, true, 'lqcs'),
    ).toBeNull();
    const assignment = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === courseId && !a.archived)!;
    course.lessons.forEach((l) =>
      expect(academy.saveLesson(assignment.id, l.id, null, null, true, 'lqcs')).toBeNull(),
    );
    const { id } = academy.startAttempt(assignment.id, 'lqcs');
    const attempt = academy.attempt(id)!;
    attempt.questions.forEach((q) => academy.answer(id, q.id, q.correctIds, null, 'lqcs'));
    expect(academy.submit(id, 'lqcs')).toBeNull();
    return {
      person,
      assignment,
      attemptId: id,
      job: academy.completion(assignment.id)!,
      certificate: academy.state().certificates.find((c) => c.assignmentId === assignment.id)!,
    };
  }
  it('files once in the exact HR record and updates training, renewal, matrix and rota acknowledgements', async () => {
    const { person, assignment, job, certificate } = pass();
    const other = store.staff().find((p) => p.id !== person.id)!;
    const otherBefore = structuredClone(other.documents);
    const workflow = TestBed.inject(AcademyDemoWorkflow);
    await Promise.all([workflow.process(job.id), workflow.process(job.id)]);
    const result = academy.completion(assignment.id)!;
    expect(result.status).toBe('COMPLETE_SYNCED');
    expect(renderer).toHaveBeenCalledTimes(1);
    const staff = store.staff().find((p) => p.id === person.id)!;
    expect(staff.documents?.filter((d) => d.id === result.documentId)).toHaveLength(1);
    expect(staff.documents?.find((d) => d.id === result.documentId)?.category).toBe(
      'Training & Certificates',
    );
    const training = staff.hr!.training.find((t) => t.courseId === certificate.courseId)!;
    expect(training.certificateId).toBe(certificate.id);
    expect(training.sourceCompletionId).toBe(job.id);
    expect(training.expiry).toBe(certificate.expires);
    expect(training.competency).toBe('Not assessed');
    expect(result.refresherDue).toBe(certificate.expires);
    expect(academy.state().refresherSchedules?.find((s) => s.completionId === job.id)?.due).toBe(
      certificate.expires,
    );
    expect(
      staff.hr?.trainingHistory?.find((t) => t.sourceCompletionId === job.id)?.certificateId,
    ).toBe(certificate.id);
    expect(result.acknowledgements.map((a) => a.stage)).toEqual([
      'CERTIFICATE_GENERATED',
      'TRAINING_RECORD_PENDING',
      'COMPLIANCE_PENDING',
      'ROTA_REFRESH_PENDING',
      'COMPLETE_SYNCED',
    ]);
    expect(store.staff().find((p) => p.id === other.id)?.documents).toEqual(otherBefore);
    await workflow.process(job.id);
    expect(renderer).toHaveBeenCalledTimes(1);
  });
  it('preserves a pass and generated PDF during an HR outage, then retries without duplicates', async () => {
    const { job, assignment, attemptId, person } = pass();
    let settings = structuredClone(academy.state().settings);
    settings.demoFailure = 'HR filing';
    academy.saveSettings(settings, 'lqcs', settings.updatedAt);
    const workflow = TestBed.inject(AcademyDemoWorkflow);
    await workflow.process(job.id);
    expect(academy.attempt(attemptId)?.passed).toBe(true);
    expect(academy.completion(assignment.id)?.status).toBe('SYNC_EXCEPTION');
    expect(academy.completion(assignment.id)?.pdfContent).toBeTruthy();
    expect(academy.completion(assignment.id)?.documentId).toBeUndefined();
    settings = structuredClone(academy.state().settings);
    settings.demoFailure = 'None';
    academy.saveSettings(settings, 'lqcs', settings.updatedAt);
    expect(workflow.retry(job.id)).toBeNull();
    await workflow.process(job.id);
    expect(academy.completion(assignment.id)?.status).toBe('COMPLETE_SYNCED');
    expect(renderer).toHaveBeenCalledTimes(1);
    expect(academy.completion(assignment.id)?.retryCount).toBe(1);
    expect(
      store
        .staff()
        .find((p) => p.id === person.id)
        ?.documents?.filter((d) => d.id === academy.completion(assignment.id)?.documentId),
    ).toHaveLength(1);
  });
  it('rejects a completion that points at a different worker and never files into that record', async () => {
    const { job, assignment } = pass();
    const other = store.staff().find((p) => p.id !== job.personId)!;
    const before = structuredClone(other.documents);
    store.saveWorkspace((d) => ({
      ...d,
      academy: {
        ...d.academy!,
        completions: d.academy!.completions!.map((c) =>
          c.id === job.id ? { ...c, personId: other.id } : c,
        ),
      },
    }));
    await TestBed.inject(AcademyDemoWorkflow).process(job.id);
    expect(academy.completion(assignment.id)?.status).toBe('SYNC_EXCEPTION');
    expect(renderer).not.toHaveBeenCalled();
    expect(store.staff().find((p) => p.id === other.id)?.documents).toEqual(before);
  });
  it('preserves an existing practical review date when online knowledge is renewed', async () => {
    const person = academy.me()!;
    const hr = structuredClone(staffRecord(person));
    hr.training = [
      ...hr.training.filter((t) => t.courseId !== 'medication'),
      {
        courseId: 'medication',
        completed: '2025-11-30',
        expiry: '2026-11-30',
        assessor: 'Approved assessor',
        competency: 'Competent',
        certificateId: 'external-practical',
      },
    ];
    store.saveWorkspace((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === person.id ? { ...p, hr } : p)),
    }));
    const { job } = pass('medication');
    await TestBed.inject(AcademyDemoWorkflow).process(job.id);
    const training = store
      .staff()
      .find((p) => p.id === person.id)!
      .hr!.training.find((t) => t.courseId === 'medication')!;
    expect(training.competency).toBe('Competent');
    expect(training.practicalCompleted).toBe('2025-11-30');
    expect(training.practicalReviewDue).toBe('2026-11-30');
    expect(training.expiry).not.toBe(training.practicalReviewDue);
  });
  it('creates a real PDF data URI for local HR storage without triggering a download', async () => {
    const { certificate } = pass();
    const content = await downloadAcademyCertificate(certificate, null, true);
    expect(typeof content).toBe('string');
    expect(content).toMatch(/^data:application\/pdf;base64,/);
    const pdf = atob((content as string).split(',')[1]);
    expect(pdf).toContain('%PDF-');
    expect(pdf).toContain(certificate.learner);
    expect(pdf).toContain('Staff ID ' + certificate.personId);
  });
});
