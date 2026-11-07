import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { DEMO_USER } from '../../../../core/auth/fixtures';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyService } from './academy.service';
import {
  AcademyDemoWorkflow,
  ACADEMY_DEMO_PDF,
  ACADEMY_DEMO_STEP_DELAY,
} from './academy-demo-workflow';
import { ACADEMY_ADMIN_ROUTES } from './academy.routes';

describe('Selected staff certificates and compliance', () => {
  let academy: AcademyService, store: ManagementStore;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  const pdf = vi.fn(async (_certificate: { id: string }) => ({
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
    auth.signInWithMicrosoft();
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
  it('opens the selected staff certificate, follows exact acknowledgements and recovers without duplicate attachments', async () => {
    const settings = structuredClone(academy.state().settings);
    settings.demoFailure = 'HR filing';
    expect(academy.saveSettings(settings, 'lqcs', settings.updatedAt)).toBeNull();
    const first = complete(store.staff()[0].id, true);
    const second = complete(store.staff()[1].id, true);
    actor.update((a) => ({ ...a, email: first.person.email }));
    const workflow = TestBed.inject(AcademyDemoWorkflow);
    const job = academy.completion(first.assignment.id)!;
    await workflow.process(job.id);
    const certificate = academy
      .state()
      .certificates.find((c) => c.passedAttemptId === first.attempt.id)!;
    const harness = await RouterTestingHarness.create('/manage/learning/certificates');
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    await settle();
    harness
      .routeDebugElement!.queryAll(By.directive(MatSelect))
      .find((d) => d.nativeElement.getAttribute('aria-label') === 'Select staff certificates')!
      .triggerEventHandler('selectionChange', { value: first.person.id });
    await settle();
    const page = () => harness.routeNativeElement!;
    expect(TestBed.inject(Router).url).toBe('/manage/learning/certificates/' + certificate.id);
    expect(page().querySelector('.hr-storage')?.textContent).toContain(first.person.name);
    expect(page().querySelector('.hr-storage')?.textContent).not.toContain(second.person.name);
    expect(page().querySelector('.certificate-preview')?.textContent).toContain(
      certificate.learner,
    );
    expect(page().querySelector('.certificate-preview')?.textContent).toContain(certificate.id);
    expect(page().querySelectorAll('.process-timeline li')).toHaveLength(6);
    expect(page().querySelectorAll('.process-timeline li.done')).toHaveLength(1);
    expect(page().querySelector('.hr-storage .status.good')).toBeNull();
    expect(page().querySelector('.result-bar')?.textContent).not.toContain('updates acknowledged');
    const recovered = structuredClone(academy.state().settings);
    recovered.demoFailure = 'None';
    expect(academy.saveSettings(recovered, 'lqcs', recovered.updatedAt)).toBeNull();
    Array.from(page().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Retry saved workflow')!
      .click();
    await workflow.process(job.id);
    await settle();
    expect(page().querySelectorAll('.process-timeline li.done')).toHaveLength(6);
    expect(page().querySelector('.hr-storage .status.good')?.textContent).toBe('Stored');
    expect(page().querySelector('.training-record')?.textContent).toContain('Valid & Active');
    expect(page().querySelector('.matrix-status')?.textContent).toContain('Course: Current');
    expect(page().querySelector('.result-bar')?.textContent).toContain('updates acknowledged');
    expect(pdf.mock.calls.filter(([c]) => c.id === certificate.id)).toHaveLength(1);
    expect(
      store
        .staff()
        .find((p) => p.id === first.person.id)
        ?.documents?.filter((d) => d.id === academy.completion(first.assignment.id)?.documentId),
    ).toHaveLength(1);
    expect(page().querySelector('.rota-status')?.textContent).not.toContain('Eligible for visit');
    Array.from(page().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('View Training Matrix'))!
      .click();
    await settle();
    expect(page().querySelector('#staff-matrix')?.textContent).toContain(first.person.name);
    Array.from(page().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Audit Log'))!
      .click();
    await settle();
    expect(page().querySelector('#certificate-audit')?.textContent).toContain(job.correlationId);
    expect(page().querySelector('#certificate-audit')?.textContent).toContain(
      'Preview: ' + certificate.id,
    );
    expect(page().querySelector('#certificate-audit')?.textContent).not.toContain(
      second.attempt.id,
    );
    const previews = academy
      .state()
      .events.filter(
        (e) => e.action === 'Certificate accessed' && e.detail === 'Preview: ' + certificate.id,
      );
    expect(previews).toHaveLength(1);
    // Reporting period limits summary totals without hiding the selected historical record.
    expect(page().querySelectorAll('.compliance-stats .metric')).toHaveLength(4);
    // Older issued records are accepted only through a matching certificate-generation acknowledgement.
    expect(
      store.saveWorkspace((data) => ({
        ...data,
        academy: {
          ...data.academy!,
          certificates: data.academy!.certificates.map((c) =>
            c.id === certificate.id ? { ...c, passedAttemptId: undefined } : c,
          ),
        },
      })),
    ).toBe(true);
    await settle();
    expect(page().querySelectorAll('.process-timeline li.done')).toHaveLength(6);
    expect(page().querySelector('.hr-storage .status.good')?.textContent).toBe('Stored');

    const replacement = academy.state().certificates.find((c) => c.personId === second.person.id)!;
    await harness.navigateByUrl('/manage/learning/certificates/' + replacement.id);
    await settle();
    expect(page().querySelector('.hr-storage')?.textContent).toContain(second.person.name);
    expect(page().querySelector('#certificate-audit')).toBeNull();
  });
  it('keeps historical acknowledgements while removing current claims after revocation and respects evidence permissions', async () => {
    const passed = complete(store.staff()[0].id, true);
    const workflow = TestBed.inject(AcademyDemoWorkflow);
    await workflow.process(academy.completion(passed.assignment.id)!.id);
    const c = academy.state().certificates.find((c) => c.personId === passed.person.id)!;
    const harness = await RouterTestingHarness.create('/manage/learning/certificates/' + c.id);
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    await settle();
    const page = () => harness.routeNativeElement!;
    actor.update((a) => ({ ...a, roleCode: 'QA' }));
    await settle();
    expect(page().textContent).not.toContain('Controlled revocation');
    expect(academy.recordCertificateAccess(c.id, 'Filed PDF', 'lqcs')).toBeNull();
    expect(academy.recordCertificateAccess(c.id, 'Filed PDF', 'other-workspace')).toContain(
      'workspace changed',
    );
    actor.update((a) => ({ ...a, roleCode: 'CA' }));
    await settle();
    Array.from(page().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Controlled revocation')!
      .click();
    await settle();
    const reason = page().querySelector<HTMLTextAreaElement>('textarea')!;
    reason.value = 'Evidence withdrawn after review';
    reason.dispatchEvent(new Event('input'));
    await settle();
    Array.from(page().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Revoke evidence')!
      .click();
    await settle();
    expect(page().querySelector('.certificate-preview')).not.toBeNull();
    expect(page().querySelector('.evidence-warning')?.textContent).toContain('Revoked');
    expect(page().querySelectorAll('.process-timeline li.done')).toHaveLength(5);
    expect(
      page().querySelectorAll(
        '.hr-storage .status.good, .matrix-status .status.good, .rota-status .status.good',
      ),
    ).toHaveLength(0);
    expect(page().querySelector('.result-bar')?.textContent).toContain('Evidence revoked');
    expect(page().querySelector('.training-record')?.textContent).not.toContain('Valid & Active');
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    await settle();
    expect(page().querySelector('.certificate-preview')).toBeNull();
    expect(academy.recordCertificateAccess(c.id, 'Preview', 'lqcs')).toContain('permission');
    await harness.navigateByUrl('/manage/learning/certificates');
    await settle();
    expect(TestBed.inject(Router).url).toBe('/access-denied');
  });
  it('does not treat expired or cross-workspace evidence as current', async () => {
    const passed = complete(store.staff()[0].id, true);
    await TestBed.inject(AcademyDemoWorkflow).process(academy.completion(passed.assignment.id)!.id);
    const c = academy.state().certificates.find((c) => c.personId === passed.person.id)!;
    expect(
      store.saveWorkspace((data) => ({
        ...data,
        academy: {
          ...data.academy!,
          certificates: data.academy!.certificates.map((item) =>
            item.id === c.id ? { ...item, expires: '2020-01-01' } : item,
          ),
        },
      })),
    ).toBe(true);
    const harness = await RouterTestingHarness.create('/manage/learning/certificates/' + c.id);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.training-record')?.textContent).toContain(
      'Expired',
    );
    expect(harness.routeNativeElement!.querySelector('.result-bar')?.textContent).toContain(
      'has expired',
    );
    expect(harness.routeNativeElement!.querySelector('.matrix-outcome.current')).toBeNull();
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.certificate-preview')).toBeNull();
  });
});
