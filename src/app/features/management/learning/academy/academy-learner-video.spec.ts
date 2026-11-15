import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AcademyLearner } from './academy-learner';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';
import { AcademyMyLearningApi } from './academy-my-learning-api.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';

describe('Video playback persistence', () => {
  function open() {
    const revision = signal(1);
    const lesson = { id: 'lesson', title: 'Safe care', videoId: 'video', captionId: 'captions' };
    const course = { id: 'course', lessons: [lesson] };
    const assignment = {
      id: 'assignment',
      courseId: 'course',
      personId: 'worker',
      archived: false,
      notes: {},
      positions: {},
      completedLessonIds: [],
    };
    const record = vi.fn(async () => null as string | null);
    const url = vi.fn(async (id: string) => {
      revision();
      return 'blob:' + id;
    });
    const params = convertToParamMap({ courseId: 'course', lessonId: 'lesson' });
    const query = convertToParamMap({});
    TestBed.configureTestingModule({
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
        { provide: AcademyAssets, useValue: { url } },
        { provide: AcademyMyLearningApi, useValue: null },
        {
          provide: CompanyAccessService,
          useValue: { can: () => true, context: () => null, companyId: () => 'company' },
        },
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
            recordVideoProgress: record,
            auth: { currentUser: () => ({ id: 'actor' }) },
            store: { companyId: () => 'company' },
            resultsApi: { saving: signal(false) },
            myCoursesApi: { saving: signal(false) },
            certificatesApi: { saving: signal(false) },
            governanceApi: { saving: signal(false) },
          },
        },
      ],
    });
    TestBed.overrideComponent(AcademyLearner, { set: { template: '' } });
    const fixture = TestBed.createComponent(AcademyLearner);
    return { fixture, revision, record, url };
  }
  it('keeps the same video URLs when source records refresh during playback', async () => {
    const { fixture, revision, url } = open();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(url).toHaveBeenCalledTimes(2);
    const original = fixture.componentInstance['videoUrl']();
    revision.set(2);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(url).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance['videoUrl']()).toBe(original);
  });
  it('serializes the viewing baseline and final playback interval', async () => {
    const { fixture, record } = open();
    fixture.detectChanges();
    await fixture.whenStable();
    let finish!: (error: string | null) => void;
    record.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const player = { currentTime: 0, duration: 4 };
    fixture.componentInstance['resume']({ target: player } as unknown as Event);
    await vi.waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    player.currentTime = 4;
    fixture.componentInstance['position']({ type: 'ended', target: player } as unknown as Event);
    expect(record).toHaveBeenCalledTimes(1);
    finish(null);
    await vi.waitFor(() => expect(record).toHaveBeenCalledTimes(2));
    expect(record.mock.calls[0]).toEqual(['assignment', 'lesson', 0, 0, 4, 0, 'company']);
    expect(record.mock.calls[1].slice(0, 5)).toEqual(['assignment', 'lesson', 0, 4, 4]);
  });
});

describe('Video viewing API commands', () => {
  function service() {
    const event = vi.fn(async () => ({}));
    const instance = Object.assign(Object.create(AcademyService.prototype) as AcademyService, {
      store: { companyId: () => 'company' },
      resultsApi: { event },
    });
    return { instance, event };
  }
  it('sends playback evidence to the server rather than changing local progress', async () => {
    const { instance, event } = service();
    expect(
      await instance.recordVideoProgress('assignment', 'lesson', 0, 4, 4, 4, 'company'),
    ).toBeNull();
    expect(event).toHaveBeenCalledWith('assignment', {
      kind: 'position',
      lessonId: 'lesson',
      position: '4.000',
      watchStart: '0.000',
      duration: '4.000',
    });
  });
  it('rejects a changed company and invalid playback intervals before sending', async () => {
    const { instance, event } = service();
    expect(
      await instance.recordVideoProgress('assignment', 'lesson', 0, 4, 4, 4, 'other'),
    ).toContain('workspace changed');
    expect(
      await instance.recordVideoProgress('assignment', 'lesson', 3, 1, 4, 1, 'company'),
    ).toContain('valid video');
    expect(
      await instance.recordVideoProgress('assignment', 'lesson', 0, 4, NaN, 4, 'company'),
    ).toContain('valid video');
    expect(event).not.toHaveBeenCalled();
  });
  it('surfaces rejected verification without claiming local completion', async () => {
    const { instance, event } = service();
    event.mockRejectedValueOnce(new Error('Skipping ahead does not count'));
    expect(await instance.recordVideoProgress('assignment', 'lesson', 0, 4, 4, 0, 'company')).toBe(
      'Skipping ahead does not count',
    );
  });
});

describe('Published course prerequisites', () => {
  it('uses the server prerequisite decision without requiring a legacy HR record', () => {
    const service = Object.assign(Object.create(AcademyService.prototype), {
      assignedCourse: () => ({ lessons: [{ id: 'lesson' }], prerequisiteCourseIds: ['intro'] }),
      store: { staff: () => [] },
      state: () => ({ settings: { sequentialLessons: true } }),
    }) as AcademyService;
    const assignment = { personId: 'worker', completedLessonIds: [], prerequisiteBlock: '' } as any;
    expect(service.lessonBlock(assignment, 'lesson')).toBe('');
    assignment.prerequisiteBlock = 'Complete prerequisite courses with current evidence first.';
    expect(service.lessonBlock(assignment, 'lesson')).toBe(assignment.prerequisiteBlock);
  });
});
