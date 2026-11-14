import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AcademyPublishing } from './academy-publishing';
import { AcademyService } from './academy.service';
import { AcademyCourse, AcademyData, AcademyQuestion, emptyAcademy } from './academy.models';

describe('Publication button explanations', () => {
  const permission = signal(true),
    saving = signal(false);
  const state = signal<AcademyData>(emptyAcademy());
  let course: AcademyCourse;
  let validation: string | null;
  let persist: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    permission.set(true);
    saving.set(false);
    validation = null;
    persist = vi.fn();
    course = {
      id: 'course-1',
      code: 'CARE-1',
      title: 'Safe care',
      description: 'Care training',
      category: 'Mandatory',
      mandatory: true,
      cpdHours: 1,
      passMark: 80,
      validityMonths: 12,
      status: 'Draft',
      active: true,
      sample: false,
      thumbnailId: '',
      version: 1,
      updatedAt: '2026-11-14T10:00:00Z',
      outcomes: 'Provide safe care',
      targetRoles: ['Care Worker'],
      owner: 'Training lead',
      issuer: 'Care provider',
      approver: 'Manager',
      rights: 'Owned content',
      effectiveDate: '2026-11-14',
      modules: [{ id: 'module-1', title: 'Introduction' }],
      lessons: [
        {
          id: 'lesson-1',
          moduleId: 'module-1',
          moduleTitle: 'Introduction',
          title: 'Safe care',
          minutes: 10,
          type: 'Reading',
          content: 'Training content',
          transcript: '',
          videoId: '',
          captionId: '',
          thumbnailId: '',
          handoutIds: [],
        },
      ],
      policy: { maxAttempts: 3, retakeWaitHours: 0, timeLimitMinutes: 30, showFeedback: true },
    };
    state.set({
      ...emptyAcademy(),
      courseDrafts: [course],
      questions: [
        {
          id: 'question-1',
          courseId: course.id,
          lessonId: 'lesson-1',
          status: 'Published',
          groupId: 'final',
        } as AcademyQuestion,
      ],
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ courseId: course.id }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        {
          provide: AcademyService,
          useValue: {
            store: { companyId: () => 'north' },
            api: { available: () => true, error: () => '', saving },
            state,
            editableCourses: () => [course],
            course: (id: string) => (id === course.id ? course : undefined),
            canManage: () => true,
            can: () => permission(),
            policyFor: () => course.policy,
            publicationError: () => validation,
            persistCourse: persist,
          },
        },
      ],
    });
  });
  async function open() {
    const fixture = TestBed.createComponent(AcademyPublishing);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  function button(root: HTMLElement): HTMLButtonElement {
    return root.querySelector('.publish-action')!;
  }
  it('shows the missing approval beside both publish buttons and clears it when confirmed', async () => {
    const fixture = await open();
    const root: HTMLElement = fixture.nativeElement;
    expect(button(root).disabled).toBe(true);
    expect(root.querySelector('#publication-header-blockers')?.textContent).toContain(
      'Tick the publication approval checkbox',
    );
    expect(root.querySelector('#publication-action-blockers')?.textContent).toContain(
      'Tick the publication approval checkbox',
    );
    expect(button(root).getAttribute('aria-describedby')).toBe('publication-action-blockers');
    (root.querySelector('[aria-label="Confirm publication approval"]') as HTMLInputElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button(root).disabled).toBe(false);
    expect(root.querySelector('#publication-action-blockers')).toBeNull();
    const owner = root.querySelector('[aria-label="Publication course owner"]') as HTMLInputElement;
    owner.value = 'Updated owner after approval';
    owner.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance['attested']()).toBe(false);
    expect(button(root).disabled).toBe(true);
    expect(root.querySelector('#publication-action-blockers')?.textContent).toContain(
      'Tick the publication approval checkbox',
    );
  });
  it('lists the unfinished publication checks instead of leaving the button unexplained', async () => {
    validation = 'Complete learning outcomes, audience and publication approval fields.';
    course.owner = '';
    course.lessons = [];
    course.outcomes = '';
    const fixture = await open();
    const root: HTMLElement = fixture.nativeElement;
    const reasons = root.querySelector('#publication-action-blockers')!.textContent;
    expect(reasons).toContain('Add at least one lesson.');
    expect(reasons).toContain('learning outcomes');
    expect(reasons).toContain('Add the course owner.');
    expect(reasons).toContain(validation);
    expect(button(root).disabled).toBe(true);
    await fixture.componentInstance['publish']();
    expect(persist).not.toHaveBeenCalled();
  });
  it('explains when this version has already been published', async () => {
    course.status = 'Published';
    state.set({ ...state(), courses: [course], courseDrafts: [] });
    const fixture = await open();
    const root: HTMLElement = fixture.nativeElement;
    expect(button(root).disabled).toBe(true);
    expect(root.querySelector('#publication-action-blockers')?.textContent).toContain(
      'This version is already published',
    );
  });
  it('explains missing publish permission and prevents a publish request', async () => {
    permission.set(false);
    const fixture = await open();
    fixture.componentInstance['attest'](true);
    fixture.detectChanges();
    expect(button(fixture.nativeElement).disabled).toBe(true);
    expect(
      fixture.nativeElement.querySelector('#publication-action-blockers').textContent,
    ).toContain('You need permission to publish courses.');
    await fixture.componentInstance['publish']();
    expect(persist).not.toHaveBeenCalled();
  });
});
