import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AcademyCourseEditor } from './academy-course-editor';
import { AcademyService } from './academy.service';
import type { AcademyCourse } from './academy.models';
import type { CourseRecord } from './academy-api.service';
import { Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';

describe('Course applicability options', () => {
  const audience = signal<{ roles: string[]; branches: string[]; local_date?: string }>({
    roles: [],
    branches: [],
  });
  const records = signal<CourseRecord[]>([]);
  let saved: AcademyCourse | undefined;
  let persist: ReturnType<typeof vi.fn>;
  const workspace = signal('north');
  beforeEach(() => {
    records.set([]);
    saved = undefined;
    workspace.set('north');
    persist = vi.fn(async (candidate: AcademyCourse) => {
      saved = structuredClone({ ...candidate, updatedAt: '2026-11-14T10:00:00Z', version: 1 });
      return null;
    });
    audience.set({ roles: [], branches: [] });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}) },
          },
        },
        {
          provide: AcademyService,
          useValue: {
            store: { companyId: workspace },
            api: {
              audience,
              courses: records,
              error: () => '',
              available: () => true,
              saving: () => false,
            },
            course: (id: string) => (saved?.id === id ? saved : undefined),
            persistCourse: persist,
            state: () => ({
              courses: [],
              assets: [],
              settings: {
                passMark: 80,
                validityMonths: 12,
                maxAttempts: 3,
                timeLimitMinutes: 30,
                showFeedback: true,
                sequentialLessons: false,
                shuffleQuestions: false,
                shuffleOptions: false,
              },
            }),
          },
        },
      ],
    });
  });
  it('shows every company role when the authoring catalogue arrives after editor creation', () => {
    const editor = TestBed.runInInjectionContext(() => new AcademyCourseEditor());
    expect(editor['audienceRoles']()).toEqual([]);
    audience.set({
      roles: ['Care Worker', 'Company Admin', 'Specialist carer'],
      branches: ['North branch'],
    });
    expect(editor['audienceRoles']()).toEqual(['Care Worker', 'Company Admin', 'Specialist carer']);
    expect(editor['audienceBranches']()).toEqual(['North branch']);
  });
  it('replaces the role options when the current company catalogue changes', () => {
    audience.set({ roles: ['North specialist'], branches: ['North branch'] });
    const editor = TestBed.runInInjectionContext(() => new AcademyCourseEditor());
    expect(editor['audienceRoles']()).toEqual(['North specialist']);
    audience.set({ roles: [], branches: [] });
    expect(editor['audienceRoles']()).toEqual([]);
    audience.set({ roles: ['South specialist'], branches: ['South branch'] });
    expect(editor['audienceRoles']()).toEqual(['South specialist']);
    expect(editor['audienceBranches']()).toEqual(['South branch']);
  });
  function record(
    id: string,
    changes: Partial<AcademyCourse> = {},
    published = true,
  ): CourseRecord {
    const course = {
      id,
      title: id,
      code: id,
      description: 'Course content',
      category: 'Mandatory',
      mandatory: true,
      cpdHours: 1,
      passMark: 80,
      validityMonths: 12,
      status: 'Published',
      active: true,
      sample: false,
      thumbnailId: '',
      lessons: [],
      version: 1,
      updatedAt: '',
      ...changes,
    } as AcademyCourse;
    return {
      course: { ...course, company_id: 'north', etag: '"v1"' },
      published: published ? course : null,
      questions: [],
      versions: [],
    };
  }
  function fill(editor: AcademyCourseEditor): void {
    Object.assign(editor['draft'], {
      title: 'New course',
      code: 'NEW-1',
      description: 'Course details',
      targetRoles: ['Care Worker'],
      outcomes: 'Learn to provide care.',
    });
  }
  it('offers only other published active courses that are already effective', () => {
    audience.set({ roles: [], branches: [], local_date: '2026-11-14' });
    const editor = TestBed.runInInjectionContext(() => new AcademyCourseEditor());
    records.set([
      record('Live course'),
      record('Inactive course', { active: false }),
      record('Draft course', { status: 'Draft' }, false),
      record('Future course', { effectiveDate: '2026-11-15' }),
      record('Archived course', { status: 'Archived' }),
      record(editor['draft'].id),
    ]);
    expect(editor['prerequisiteCourses']().map((course) => course.title)).toEqual(['Live course']);
    const published = record('Published course with newer draft');
    published.course.status = 'Draft';
    records.set([...records(), published]);
    expect(editor['prerequisiteCourses']().map((course) => course.title)).toEqual([
      'Live course',
      'Published course with newer draft',
    ]);
  });
  it('loads branches and live prerequisites into the form and saves additional settings', async () => {
    audience.set({
      roles: ['Care Worker'],
      branches: ['North branch', 'West branch'],
      local_date: '2026-11-14',
    });
    records.set([record('Prerequisite'), record('Unpublished', { status: 'Draft' }, false)]);
    const fixture = TestBed.createComponent(AcademyCourseEditor);
    const editor = fixture.componentInstance;
    fill(editor);
    fixture.detectChanges();
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const branches = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Course branches"]' }),
    );
    await branches.open();
    expect(
      await Promise.all((await branches.getOptions()).map((option) => option.getText())),
    ).toEqual(['North branch', 'West branch']);
    await branches.clickOptions({ text: 'West branch' });
    await branches.close();
    const prerequisites = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Prerequisite courses"]' }),
    );
    await prerequisites.open();
    expect(
      await Promise.all((await prerequisites.getOptions()).map((option) => option.getText())),
    ).toEqual(['Prerequisite (Prerequisite)']);
    await prerequisites.clickOptions({ text: 'Prerequisite (Prerequisite)' });
    await prerequisites.close();
    Object.assign(editor['draft'], {
      owner: 'Training lead',
      issuer: 'North Care',
      approver: 'Manager',
      rights: 'Owned content',
      effectiveDate: '2026-11-14',
      sample: true,
      cpdHours: 2.5,
      renewalPolicyRef: 'POL-1',
      cpdJustification: 'Approved training',
      evidenceType: 'Practical observation record',
    });
    await editor['save']();
    expect(editor['error']()).toBe('');
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({
        targetBranches: ['West branch'],
        prerequisiteCourseIds: ['Prerequisite'],
        sample: true,
        cpdHours: 2.5,
        owner: 'Training lead',
        approver: 'Manager',
        status: 'Draft',
      }),
      'north',
      '',
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Course publication state"]'),
    ).toBeNull();
  });
  it('blocks invalid settings and unavailable selections before saving', async () => {
    const editor = TestBed.runInInjectionContext(() => new AcademyCourseEditor());
    fill(editor);
    editor['draft'].policy!.maxAttempts = -1;
    await editor['save']();
    expect(editor['error']()).toContain('Maximum attempts');
    editor['draft'].policy!.maxAttempts = 3;
    editor['draft'].targetBranches = ['Another company branch'];
    await editor['save']();
    expect(editor['error']()).toContain('active branches from this company');
    editor['draft'].targetBranches = [];
    editor['draft'].prerequisiteCourseIds = ['not-live'];
    await editor['save']();
    expect(editor['error']()).toContain('other live courses');
    expect(persist).not.toHaveBeenCalled();
  });
  it('preserves edits and stays on the form if saving fails', async () => {
    const editor = TestBed.runInInjectionContext(() => new AcademyCourseEditor());
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(editor);
    persist.mockResolvedValueOnce('The course changed. Reload before saving.');
    await editor['saveContinue']();
    expect(editor['draft'].title).toBe('New course');
    expect(editor['error']()).toContain('course changed');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('continues only after a successful save and blocks navigation after a company change', async () => {
    const editor = TestBed.runInInjectionContext(() => new AcademyCourseEditor());
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(editor);
    await editor['saveContinue']();
    expect(navigate).toHaveBeenCalledWith(['/manage/learning/content', editor['draft'].id]);
    navigate.mockClear();
    workspace.set('south');
    await editor['saveContinue']();
    expect(navigate).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledTimes(1);
  });
  it('keeps publication controls in step 6 and saves additional settings through Continue', async () => {
    const fixture = TestBed.createComponent(AcademyCourseEditor);
    const editor = fixture.componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(editor);
    Object.assign(editor['draft'], {
      owner: 'Existing owner',
      issuer: 'Existing issuer',
      approver: 'Existing approver',
      rights: 'Existing licence',
      effectiveDate: '2026-12-01',
      cpdHours: 2.5,
      active: false,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).not.toContain('Publish course version');
    expect(root.textContent).not.toContain('Publishing approval & additional settings');
    for (const caption of [
      'Course owner',
      'Approved certificate issuer',
      'Publish approver',
      'Effective date',
      'Content rights / licence',
      'Approved CPD hours',
      'Active (available to assign)',
    ]) {
      expect(
        [...root.querySelectorAll('label')].some((label) => label.textContent?.includes(caption)),
      ).toBe(false);
    }
    editor['additionalOpen'].set(true);
    fixture.detectChanges();
    const renewal = root.querySelector(
      'input[maxlength="180"]:not([aria-label])',
    ) as HTMLInputElement;
    renewal.value = 'POL-2026';
    renewal.dispatchEvent(new Event('input', { bubbles: true }));
    (root.querySelector('.course-heading .academy-button.primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({
        renewalPolicyRef: 'POL-2026',
        owner: 'Existing owner',
        issuer: 'Existing issuer',
        approver: 'Existing approver',
        rights: 'Existing licence',
        effectiveDate: '2026-12-01',
        cpdHours: 2.5,
        active: false,
        status: 'Draft',
      }),
      'north',
      '',
    );
    expect(navigate).toHaveBeenCalledWith(['/manage/learning/content', editor['draft'].id]);
  });
  it('flags every missing required field on Save & Continue and clears highlights as fields are completed', async () => {
    audience.set({ roles: ['Care Worker'], branches: [] });
    const fixture = TestBed.createComponent(AcademyCourseEditor);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('#course-error-title')).toBeNull();
    const next = root.querySelector('.course-heading .academy-button.primary') as HTMLButtonElement;
    next.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    for (const label of [
      'Course title',
      'Course code',
      'Course description',
      'Applicable staff roles',
      'Learning outcome 1',
    ]) {
      const control = root.querySelector(`[aria-label="${label}"]`)!;
      expect(control.classList.contains('course-field-invalid'), label).toBe(true);
      expect(control.getAttribute('aria-invalid'), label).toBe('true');
    }
    expect(root.querySelector('#course-error-targetRoles')?.textContent).toContain(
      'Select at least one',
    );
    expect(root.querySelector('#course-error-outcomes')?.textContent).toContain('Add at least one');
    expect(fixture.componentInstance['error']()).toContain('Enter the course title.');
    expect(fixture.componentInstance['error']()).toContain(
      'Select at least one applicable role group.',
    );
    expect(persist).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    for (const [label, value] of [
      ['Course title', 'Safe care'],
      ['Course code', 'SAFE-1'],
      ['Course description', 'Care training'],
      ['Learning outcome 1', 'Provide safe care'],
    ]) {
      const input = root.querySelector(`[aria-label="${label}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const roles = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Applicable staff roles"]' }),
    );
    await roles.open();
    await roles.clickOptions({ text: 'Care Worker' });
    await roles.close();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelectorAll('.course-field-invalid')).toHaveLength(0);
    expect(root.querySelector('#course-error-title')).toBeNull();
    next.click();
    await fixture.whenStable();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalled();
  });
  it('opens Additional Settings and highlights required values that were cleared there', async () => {
    const fixture = TestBed.createComponent(AcademyCourseEditor);
    fill(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    for (const label of ['Course category']) {
      const input = root.querySelector(`[aria-label="${label}"]`) as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    (root.querySelector('.course-heading .academy-button.primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((root.querySelector('.course-additional') as HTMLDetailsElement).open).toBe(true);
    for (const label of ['Course category']) {
      expect(
        root.querySelector(`[aria-label="${label}"]`)?.classList.contains('course-field-invalid'),
      ).toBe(true);
    }
    expect(root.querySelector('#course-error-category')?.textContent).toContain(
      'Enter the category.',
    );
    expect(persist).not.toHaveBeenCalled();
    expect(
      root
        .querySelector('[aria-label="Refresher interval"]')
        ?.classList.contains('course-field-invalid'),
    ).toBe(false);
    expect(
      root
        .querySelector('[aria-label="Course pass mark"]')
        ?.classList.contains('course-field-invalid'),
    ).toBe(false);
  });
  it('keeps role and tag selections when each dropdown is closed and reopened', async () => {
    audience.set({ roles: ['Care Worker', 'Senior Carer', 'Nurse'], branches: [] });
    const fixture = TestBed.createComponent(AcademyCourseEditor);
    fixture.detectChanges();
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const roles = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Applicable staff roles"]' }),
    );
    await roles.open();
    await roles.clickOptions({ text: 'Care Worker' });
    await roles.close();
    expect(await roles.isOpen()).toBe(false);
    expect(fixture.componentInstance['draft'].targetRoles).toEqual(['Care Worker']);
    (fixture.nativeElement.querySelector('.role-applicability .field') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance['draft'].targetRoles).toEqual(['Care Worker']);
    await roles.open();
    expect(fixture.componentInstance['draft'].targetRoles).toEqual(['Care Worker']);
    await roles.clickOptions({ text: 'Senior Carer' });
    await roles.close();
    expect(await roles.isOpen()).toBe(false);
    expect(fixture.componentInstance['draft'].targetRoles).toEqual(['Care Worker', 'Senior Carer']);
    const tags = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Compliance tags"]' }),
    );
    await tags.open();
    await tags.clickOptions({ text: 'Medication' });
    await tags.close();
    expect(await tags.isOpen()).toBe(false);
    expect(fixture.componentInstance['draft'].tags).toEqual(['Medication']);
    (fixture.nativeElement.querySelector('.compliance-tags .field') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance['draft'].tags).toEqual(['Medication']);
    await tags.open();
    expect(fixture.componentInstance['draft'].tags).toEqual(['Medication']);
    await tags.clickOptions({ text: 'Clinical Safety' });
    await tags.close();
    expect(await tags.isOpen()).toBe(false);
    expect(fixture.componentInstance['draft'].tags).toEqual(['Medication', 'Clinical Safety']);
    (
      fixture.nativeElement.querySelector(
        '[aria-label="Remove role Care Worker"]',
      ) as HTMLButtonElement
    ).click();
    (
      fixture.nativeElement.querySelector(
        '[aria-label="Remove tag Medication"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(fixture.componentInstance['draft'].targetRoles).toEqual(['Senior Carer']);
    expect(fixture.componentInstance['draft'].tags).toEqual(['Clinical Safety']);
    expect(await roles.isOpen()).toBe(false);
    expect(await tags.isOpen()).toBe(false);
  });
  it('resumes a saved draft with inherited assessment settings without reporting completed details as missing', async () => {
    audience.set({ roles: ['Care Worker'], branches: [] });
    saved = {
      ...record('saved-draft', { status: 'Draft' }, false).course,
      outcomes: 'Provide safe care',
      targetRoles: ['Care Worker'],
      policy: { maxAttempts: 4 } as AcademyCourse['policy'],
    };
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          paramMap: convertToParamMap({ courseId: saved.id }),
          queryParamMap: convertToParamMap({}),
        },
      },
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AcademyCourseEditor);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect((root.querySelector('[aria-label="Course title"]') as HTMLInputElement).value).toBe(
      'saved-draft',
    );
    expect(root.querySelector('[aria-label="Applicable staff roles"]')?.textContent).toContain(
      'Care Worker',
    );
    (root.querySelector('.course-heading .academy-button.primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance['error']()).toBe('');
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'saved-draft',
        outcomes: 'Provide safe care',
        targetRoles: ['Care Worker'],
        policy: expect.objectContaining({
          maxAttempts: 4,
          retakeWaitHours: 24,
          timeLimitMinutes: 30,
          showFeedback: true,
        }),
      }),
      'north',
      '',
    );
    expect(navigate).toHaveBeenCalledWith(['/manage/learning/content', 'saved-draft']);
  });
  it('reopens a newly saved draft and continues with its completed fields intact', async () => {
    audience.set({ roles: ['Care Worker'], branches: [] });
    const editor = TestBed.runInInjectionContext(() => new AcademyCourseEditor());
    fill(editor);
    editor['draft'].policy!.retakeWaitHours = 0;
    editor['draft'].policy!.showFeedback = false;
    await editor['save']();
    const id = saved!.id;
    Object.assign(TestBed.inject(ActivatedRoute).snapshot, {
      paramMap: convertToParamMap({ courseId: id }),
    });
    const reopened = TestBed.runInInjectionContext(() => new AcademyCourseEditor());
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await reopened['saveContinue']();
    expect(reopened['error']()).toBe('');
    expect(saved).toMatchObject({
      title: 'New course',
      targetRoles: ['Care Worker'],
      policy: { retakeWaitHours: 0, showFeedback: false },
    });
    expect(navigate).toHaveBeenCalledWith(['/manage/learning/content', id]);
  });
});
