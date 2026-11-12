import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AcademyLearner } from './academy-learner';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';

describe('Learner note persistence', () => {
  it('joins blur and button saves so completion can await the same request', async () => {
    let finish!: (error: string | null) => void;
    const save = vi.fn(() => new Promise<string | null>((resolve) => (finish = resolve)));
    const lesson = { id: 'lesson', title: 'Reporting', videoId: '', captionId: '' };
    const course = { id: 'course', lessons: [lesson] };
    const assignment = {
      id: 'assignment',
      courseId: 'course',
      personId: 'worker',
      archived: false,
      notes: {},
    };
    const params = convertToParamMap({ courseId: 'course', lessonId: 'lesson' });
    const query = convertToParamMap({});
    TestBed.configureTestingModule({
      imports: [AcademyLearner],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(params),
            queryParamMap: of(query),
            data: of({ view: 'lesson' }),
            snapshot: { paramMap: params, queryParamMap: query, data: { view: 'lesson' } },
          },
        },
        { provide: AcademyAssets, useValue: { url: vi.fn() } },
        {
          provide: AcademyService,
          useValue: {
            canManage: () => false,
            me: () => ({ id: 'worker' }),
            owns: () => true,
            assignments: () => [assignment],
            assignedCourse: () => course,
            course: () => course,
            lessonBlock: () => '',
            saveLesson: save,
            auth: { currentUser: () => ({ id: 'actor' }) },
            store: { companyId: () => 'company' },
            resultsApi: { saving: signal(false) },
          },
        },
      ],
    });
    TestBed.overrideComponent(AcademyLearner, { set: { template: '' } });
    const fixture = TestBed.createComponent(AcademyLearner);
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.componentInstance as unknown as {
      editNote(value: string): void;
      flushNote(): Promise<boolean>;
    };
    editor.editNote('Report to the safeguarding lead.');
    const blur = editor.flushNote();
    const button = editor.flushNote();
    expect(save).toHaveBeenCalledTimes(1);
    finish(null);
    expect(await blur).toBe(true);
    expect(await button).toBe(true);
  });
});
