import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { DEMO_USER } from '../../../../core/auth/fixtures';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore } from '../../shared/management.store';
import { ACADEMY_ADMIN_ROUTES, ACADEMY_STAFF_ROUTES } from './academy.routes';
import { AcademyService } from './academy.service';

describe('Academy administration and staff pages', () => {
  let academy: AcademyService, store: ManagementStore;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/learning', children: ACADEMY_ADMIN_ROUTES },
          { path: 'staff-portal', children: ACADEMY_STAFF_ROUTES },
          {
            path: 'access-denied',
            loadComponent: () =>
              import('../../../auth/access-denied/access-denied').then((m) => m.AccessDenied),
          },
        ]),
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
  it('opens administration screens and keeps learners out of certificate configuration', async () => {
    const harness = await RouterTestingHarness.create('/manage/learning/settings');
    expect(harness.routeNativeElement!.textContent).toContain('Training Academy settings');
    expect(harness.routeNativeElement!.querySelector('cv-academy-certificate')).not.toBeNull();
    for (const route of ['courses', 'questions', 'manage', 'reports', 'assets']) {
      await harness.navigateByUrl('/manage/learning/' + route);
      expect(harness.routeNativeElement!.querySelector('h1')).not.toBeNull();
      expect(harness.routeNativeElement!.querySelector('cv-academy-admin-nav')).not.toBeNull();
    }
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    await harness.navigateByUrl('/manage/learning/settings');
    expect(harness.routeNativeElement!.textContent).toContain('Access');
    expect(harness.routeNativeElement!.querySelector('cv-academy-settings')).toBeNull();
  });
  it('persists assessment settings and retains invalid settings drafts', async () => {
    const harness = await RouterTestingHarness.create('/manage/learning/settings');
    const page = harness.routeNativeElement!;
    await harness.fixture.whenStable();
    const input = page.querySelector<HTMLInputElement>('input[type="number"]')!;
    input.value = '85';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    Array.from(page.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Save changes')!
      .click();
    harness.detectChanges();
    expect(academy.state().settings.passMark).toBe(85);
    input.value = '120';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    Array.from(page.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Save changes')!
      .click();
    harness.detectChanges();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('pass mark');
    expect(input.value).toBe('120');
    expect(academy.state().settings.passMark).toBe(85);
  });
  it('does not show locked lesson content on a direct link and permits the assigned learner to complete lessons', async () => {
    const person = academy.me()!;
    const course = academy.state().courses[0];
    academy.assign([person.id], [course.id], '2026-12-31', 0, '', false, false, 'lqcs');
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    const harness = await RouterTestingHarness.create(
      '/staff-portal/training/courses/' + course.id + '/lessons/' + course.lessons[1].id,
    );
    expect(harness.routeNativeElement!.textContent).toContain('This lesson is locked');
    expect(harness.routeNativeElement!.textContent).not.toContain(course.lessons[1].content);
    await harness.navigateByUrl(
      '/staff-portal/training/courses/' + course.id + '/lessons/' + course.lessons[0].id,
    );
    Array.from(harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === 'Mark as complete')!
      .click();
    harness.detectChanges();
    expect(
      academy.assignments().find((a) => a.personId === person.id && a.courseId === course.id)
        ?.completedLessonIds,
    ).toContain(course.lessons[0].id);
    expect(harness.routeNativeElement!.textContent).toContain('Lesson completed');
  });
});
