import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AcademyStructureEditor } from './academy-structure-editor';
import { AcademyService } from './academy.service';
import { AcademyCourse } from './academy.models';

function source(): AcademyCourse {
  return {
    id: 'course-one',
    title: 'Safeguarding',
    code: 'SAFE-001',
    description: 'Report concerns',
    category: 'Mandatory',
    mandatory: true,
    cpdHours: 1,
    passMark: 80,
    validityMonths: 12,
    status: 'Draft',
    sample: false,
    thumbnailId: '',
    modules: [
      { id: 'm-one', title: 'Introduction' },
      { id: 'm-two', title: 'Reporting' },
    ],
    lessons: [
      {
        id: 'l-one',
        moduleId: 'm-one',
        moduleTitle: 'Introduction',
        title: 'Recognise a concern',
        minutes: 5,
        type: 'Reading',
        content: 'Recognise the signs.',
        transcript: '',
        videoId: '',
        thumbnailId: '',
        captionId: '',
        handoutIds: [],
      },
    ],
    version: 1,
    updatedAt: '2026-11-12T10:00:00Z',
  };
}

describe('Academy module and lesson workflow', () => {
  let current: AcademyCourse;
  const failure = signal('');
  const saving = signal(false),
    allowed = signal(true),
    questions = signal<{ lessonId: string; courseId: string }[]>([]);
  let persist: ReturnType<typeof vi.fn>, navigate: ReturnType<typeof vi.fn>;
  let page: AcademyStructureEditor;
  beforeEach(() => {
    current = source();
    saving.set(false);
    failure.set('');
    allowed.set(true);
    questions.set([]);
    persist = vi.fn().mockImplementation(async (candidate: AcademyCourse) => {
      current = structuredClone({
        ...candidate,
        version: current.version + 1,
        updatedAt: '2026-11-12T11:00:00Z',
      });
      return null;
    });
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AcademyService,
          useValue: {
            store: { companyId: () => 'company-one' },
            api: { available: allowed, saving, error: failure },
            course: (id: string) => (id === current.id ? current : undefined),
            editableQuestions: questions,
            policyFor: () => ({
              maxAttempts: 3,
              retakeWaitHours: 24,
              timeLimitMinutes: 30,
              showFeedback: true,
            }),
            persistCourse: persist,
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ courseId: 'course-one' }) } },
        },
        { provide: Router, useValue: { navigate } },
      ],
    });
    page = TestBed.runInInjectionContext(() => new AcademyStructureEditor());
  });
  it('renames modules and moves lessons using stable lesson identities', () => {
    page['openModule'](page['modules']()[0]);
    page['form'].title = 'Recognising concerns';
    page['submitEditor']();
    expect(page['course']!.lessons[0].moduleTitle).toBe('Recognising concerns');
    page['drop']({
      item: { data: 'l-one' },
      container: { data: 'm-two' },
      currentIndex: 0,
    } as never);
    expect(page['course']!.lessons[0]).toMatchObject({
      id: 'l-one',
      moduleId: 'm-two',
      moduleTitle: 'Reporting',
    });
    page['removeModule'](page['modules']()[0]);
    expect(page['modules']().map((m) => m.id)).toEqual(['m-two']);
  });
  it('prevents invalid prerequisite ordering and deletion of linked lessons', () => {
    page['course']!.modules![1].prerequisiteModuleIds = ['m-one'];
    page['moveModule'](page['modules']()[1], -1);
    expect(page['modules']().map((m) => m.id)).toEqual(['m-one', 'm-two']);
    expect(page['error']()).toContain('prerequisite');
    questions.set([{ courseId: 'course-one', lessonId: 'l-one' }]);
    page['removeLesson'](page['course']!.lessons[0]);
    expect(page['course']!.lessons).toHaveLength(1);
    expect(page['error']()).toContain('assessment question links');
  });
  it('waits for persistence before advancing to the question bank', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((done) => (finish = done));
    persist.mockImplementationOnce(async (candidate: AcademyCourse) => {
      await pending;
      current = structuredClone({ ...candidate, version: 2, updatedAt: '2026-11-12T11:00:00Z' });
      return null;
    });
    const continuation = page['continue']();
    expect(navigate).not.toHaveBeenCalled();
    finish();
    await continuation;
    expect(navigate).toHaveBeenCalledWith(['/manage/learning/questions'], {
      queryParams: { course: 'course-one' },
    });
    expect(page['course']!.version).toBe(2);
    expect(page.canLeave()).toBe(true);
  });
  it('retains edits and stays on the editor when the server rejects a save', async () => {
    page['course']!.title = 'Unsaved changes';
    persist.mockResolvedValueOnce('This course changed. Reload before saving.');
    await page['continue']();
    expect(navigate).not.toHaveBeenCalled();
    expect(page['course']!.title).toBe('Unsaved changes');
    expect(page['error']()).toContain('Reload');
  });
  it('keeps navigation blocked during a save and allows leaving after access revocation', () => {
    saving.set(true);
    expect(page.canLeave()).toBe(false);
    allowed.set(false);
    expect(page.canLeave()).toBe(true);
  });
  it('hides authoring immediately when the server denies access', () => {
    failure.set('Access revoked');
    expect(page['canEdit']()).toBe(false);
    expect(page.canLeave()).toBe(true);
  });
});
