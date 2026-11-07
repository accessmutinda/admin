import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { DEMO_USER } from '../../../../demo/business-fixtures';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyService } from './academy.service';
import {
  AcademyDemoWorkflow,
  ACADEMY_DEMO_PDF,
  ACADEMY_DEMO_STEP_DELAY,
} from './academy-demo-workflow';
import { ACADEMY_ADMIN_ROUTES } from './academy.routes';
import { londonDate } from '../../rota/rota.models';
describe('Selected staff results and retakes', () => {
  let academy: AcademyService, store: ManagementStore;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  const pdf = vi.fn(async () => ({
    content: 'data:application/pdf;base64,' + btoa('%PDF-1.7\nStaff result fixture\n%%EOF'),
    checksum: 'staff-result-checksum',
  }));
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    pdf.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/learning', children: ACADEMY_ADMIN_ROUTES },
          {
            path: 'access-denied',
            loadComponent: () =>
              import('../../../auth/access-denied/access-denied').then((m) => m.AccessDenied),
          },
        ]),
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
    academy = TestBed.inject(AcademyService);
  });
  afterEach(() => vi.restoreAllMocks());
  function complete(personId: string, passed: boolean) {
    const course = academy.state().courses[0],
      person = store.staff().find((p) => p.id === personId)!;
    actor.update((a) => ({ ...a, roleCode: 'CA', email: person.email }));
    expect(
      academy.assign([person.id], [course.id], '2026-12-31', 0, '', false, true, 'lqcs'),
    ).toBeNull();
    const assignment = academy
      .assignments()
      .find((a) => a.personId === person.id && a.courseId === course.id && !a.archived)!;
    course.lessons.forEach((l) =>
      expect(academy.saveLesson(assignment.id, l.id, null, null, true, 'lqcs')).toBeNull(),
    );
    const { id, error } = academy.startAttempt(assignment.id, 'lqcs');
    expect(error).toBeNull();
    const attempt = academy.attempt(id)!;
    for (const q of attempt.questions)
      expect(
        academy.answer(
          id,
          q.id,
          passed ? q.correctIds : [q.options.find((o) => !q.correctIds.includes(o.id))!.id],
          null,
          'lqcs',
        ),
      ).toBeNull();
    expect(academy.submit(id, 'lqcs')).toBeNull();
    return { person, assignment, attempt: academy.attempt(id)! };
  }
  it('selects the exact staff result and shows only acknowledged HR and integration stages, then recovers the same workflow', async () => {
    const settings = structuredClone(academy.state().settings);
    settings.demoFailure = 'HR filing';
    expect(academy.saveSettings(settings, 'lqcs', settings.updatedAt)).toBeNull();
    const passed = complete(store.staff()[0].id, true),
      failed = complete(store.staff()[1].id, false);
    actor.update((a) => ({ ...a, email: passed.person.email, roleCode: 'CA' }));
    const workflow = TestBed.inject(AcademyDemoWorkflow),
      job = academy.completion(passed.assignment.id)!;
    await workflow.process(job.id);
    expect(academy.completion(passed.assignment.id)?.status).toBe('SYNC_EXCEPTION');
    const harness = await RouterTestingHarness.create('/manage/learning/results');
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    await settle();
    harness
      .routeDebugElement!.queryAll(By.directive(MatSelect))
      .find((d) => d.nativeElement.getAttribute('aria-label') === 'Select staff result')!
      .triggerEventHandler('selectionChange', { value: passed.person.id });
    await settle();
    expect(TestBed.inject(Router).url).toBe('/manage/learning/results/' + passed.attempt.id);
    const page = () => harness.routeNativeElement!;
    expect(page().querySelector('.staff-identity')?.textContent).toContain(passed.person.name);
    expect(page().querySelectorAll('.workflow-steps li')).toHaveLength(8);
    expect(page().querySelectorAll('.integration-pill.done')).toHaveLength(0);
    expect(page().querySelector('.workflow-outcome')?.textContent).not.toContain(
      'Workflow complete:',
    );
    expect(page().querySelector('.failed-retakes')?.textContent).toContain(failed.person.name);
    expect(page().querySelectorAll('.result-actions a')[0].getAttribute('href')).toBe(
      '/manage/people/staff/' + passed.person.id,
    );
    const recovered = structuredClone(academy.state().settings);
    recovered.demoFailure = 'None';
    expect(academy.saveSettings(recovered, 'lqcs', recovered.updatedAt)).toBeNull();
    Array.from(page().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Retry Saved Workflow')!
      .click();
    await workflow.process(job.id);
    await settle();
    expect(academy.completion(passed.assignment.id)?.status).toBe('COMPLETE_SYNCED');
    expect(page().querySelectorAll('.workflow-steps li.done')).toHaveLength(8);
    expect(page().querySelectorAll('.integration-pill.done')).toHaveLength(4);
    expect(page().querySelector('.workflow-outcome')?.textContent).toContain('Workflow complete:');
    expect(pdf).toHaveBeenCalledTimes(1);
    expect(
      store
        .staff()
        .find((p) => p.id === passed.person.id)
        ?.documents?.filter((d) => d.id === academy.completion(passed.assignment.id)?.documentId),
    ).toHaveLength(1);
    expect(
      store
        .staff()
        .find((p) => p.id === failed.person.id)
        ?.documents?.some((d) => d.id === academy.completion(passed.assignment.id)?.documentId),
    ).toBe(false);
    const certificate = academy
      .state()
      .certificates.find((c) => c.assignmentId === passed.assignment.id)!;
    expect(
      academy.revokeCertificate(certificate.id, 'Evidence review required', 'lqcs'),
    ).toBeNull();
    await settle();
    expect(page().querySelector('.evidence-revoked')?.textContent).toContain('historical pass');
    expect(page().querySelectorAll('.integration-pill.done')).toHaveLength(0);
    expect(page().querySelector('.workflow-outcome')?.textContent).not.toContain(
      'Workflow complete:',
    );
  });
  it('schedules a failed result with its frozen policy, records one portal notice and leaves reviewers read-only', async () => {
    const course = structuredClone(academy.state().courses[0]);
    course.policy = { ...academy.policyFor(course), maxAttempts: 2, retakeWaitHours: 24 };
    expect(academy.saveCourse(course, 'lqcs', course.updatedAt)).toBeNull();
    const failed = complete(store.staff()[0].id, false);
    const harness = await RouterTestingHarness.create(
      '/manage/learning/results/' + failed.attempt.id,
    );
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    await settle();
    const page = () => harness.routeNativeElement!;
    expect(page().querySelector('.retry-rules')?.textContent).toContain('24 hours');
    expect(page().querySelectorAll('.integration-pill.done')).toHaveLength(0);
    page()
      .querySelector<HTMLButtonElement>(
        '[aria-label="Schedule retake for ' + failed.person.name + '"]',
      )!
      .click();
    await settle();
    const fill = (instant: number) => {
      const date = new Date(instant);
      const input = page().querySelector<HTMLInputElement>(
        '[aria-label="Retake date and time (UK)"]',
      )!;
      input.value =
        londonDate(date) +
        'T' +
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(date);
      input.dispatchEvent(new Event('input'));
      harness.detectChanges();
    };
    const submit = async () => {
      page()
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await settle();
    };
    fill(Date.parse(failed.attempt.submittedAt) + 3600000);
    await submit();
    expect(page().querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain(
      'minimum waiting period',
    );
    fill(Date.parse(failed.attempt.submittedAt) + 25 * 3600000);
    await submit();
    expect(page().querySelector('[role="dialog"]')).toBeNull();
    expect(academy.state().retakePlans![0]).toMatchObject({
      fromAttemptId: failed.attempt.id,
      assignmentId: failed.assignment.id,
      personId: failed.person.id,
    });
    expect(page().querySelector('.failed-retakes')?.textContent).toContain('Retake scheduled');
    page()
      .querySelector<HTMLButtonElement>(
        '[aria-label="Notify ' + failed.person.name + ' about retake"]',
      )!
      .click();
    await settle();
    expect(academy.state().notices.filter((n) => n.key.startsWith('retake:'))).toHaveLength(1);
    Array.from(page().querySelectorAll<HTMLButtonElement>('.results-tabs button'))
      .find((b) => b.textContent?.includes('Automation & Integration'))!
      .click();
    await settle();
    expect(page().querySelector('.workflow-audit')?.textContent).toContain(
      'No course integration workflow',
    );
    expect(page().querySelector('.failed-retakes')).toBeNull();
    actor.update((a) => ({ ...a, roleCode: 'QA' }));
    await harness.navigateByUrl('/manage/learning/results/' + failed.attempt.id);
    await settle();
    Array.from(page().querySelectorAll<HTMLButtonElement>('.results-tabs button'))
      .find((b) => b.textContent?.includes('Retakes & Outstanding'))!
      .click();
    await settle();
    expect(
      page().querySelector<HTMLButtonElement>(
        '[aria-label="Schedule retake for ' + failed.person.name + '"]',
      )!.disabled,
    ).toBe(true);
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    await harness.navigateByUrl('/manage/learning/results');
    await settle();
    expect(TestBed.inject(Router).url).toBe('/access-denied');
  });
});
