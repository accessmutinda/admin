import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { COURSES, ManagementStore } from '../shared/management.store';
import { Learning } from './learning';

describe('Training Academy workspace', () => {
  let store: ManagementStore;
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: () => false,
    }));
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'manage/learning', component: Learning }])],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the selected staff context and completes sample lessons without asserting verified training', async () => {
    const person = store.staff()[0];
    store.update((data) => ({
      ...data,
      people: data.people.map((p) => (p.id === person.id ? { ...p, progress: {} } : p)),
    }));
    const harness = await RouterTestingHarness.create('/manage/learning?person=' + person.id);
    const page = harness.routeNativeElement!;
    expect(page.querySelector('h1')!.textContent).toBe('Training Academy');
    expect(page.querySelector('.co-summary')).toBeNull();
    expect(
      page.querySelector('a[href="/manage/people/staff/' + person.id + '/training"]'),
    ).not.toBeNull();
    const training = structuredClone(store.staff().find((p) => p.id === person.id)!.hr?.training);
    page.querySelector<HTMLButtonElement>('.academy-course-open')!.click();
    harness.detectChanges();
    for (let index = 0; index < 3; index++) {
      page.querySelector<HTMLButtonElement>('.course-player .academy-form-footer button')!.click();
      harness.detectChanges();
      await harness.fixture.whenStable();
    }
    expect(store.staff().find((p) => p.id === person.id)!.progress[COURSES[0].id]).toBe(100);
    expect(store.staff().find((p) => p.id === person.id)!.hr?.training).toEqual(training);
    expect(page.querySelector('.course-player')).toBeNull();
    expect(store.data().cpd).toHaveLength(0);
  });

  it('separates team-wide progress from personal learning and opens webinar reflection without changing records', async () => {
    const before = JSON.stringify(store.data());
    const harness = await RouterTestingHarness.create('/manage/learning');
    const page = harness.routeNativeElement!;
    const tab = async (label: string) => {
      Array.from(page.querySelectorAll<HTMLButtonElement>('.academy-tabs button'))
        .find((button) => button.textContent?.trim() === label)!
        .click();
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    await tab('Progress');
    expect(page.querySelector('mat-select[aria-label="Choose staff learning record"]')).toBeNull();
    expect(page.querySelector('.academy-context')!.textContent).toContain('Team-wide learning');
    expect(page.querySelector('cv-academy-courses')!.hasAttribute('hidden')).toBe(true);
    expect(page.querySelector('cv-academy-progress')!.hasAttribute('hidden')).toBe(false);
    await tab('Webinars');
    page.querySelector<HTMLButtonElement>('.academy-webinar button')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(page.querySelector('[role="dialog"]')!.textContent).toContain(
      'Record a learning moment',
    );
    expect(page.querySelector<HTMLInputElement>('input[name="activity"]')!.value).toBe(
      'Supporting people with dementia',
    );
    page.querySelector<HTMLButtonElement>('button[aria-label="Close CPD dialog"]')!.click();
    harness.detectChanges();
    expect(JSON.stringify(store.data())).toBe(before);
  });
});
