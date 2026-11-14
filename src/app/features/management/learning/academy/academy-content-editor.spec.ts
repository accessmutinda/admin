import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AcademyContentEditor } from './academy-content-editor';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';
import type { AcademyAsset, AcademyCourse } from './academy.models';

describe('Course video scan recovery', () => {
  let course: AcademyCourse;
  const assets = signal<AcademyAsset[]>([]);
  let url: ReturnType<typeof vi.fn>;
  let process: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    course = {
      id: 'course-one',
      code: 'SAFE-1',
      title: 'Safe care',
      description: 'Care training',
      category: 'Mandatory',
      mandatory: true,
      cpdHours: 1,
      passMark: null,
      validityMonths: null,
      status: 'Draft',
      sample: false,
      thumbnailId: '',
      version: 1,
      updatedAt: 'saved',
      lessons: [],
      pendingLessons: [
        {
          id: 'video-lesson',
          title: 'Safe care video',
          minutes: 1,
          type: 'Video',
          content: '',
          transcript: '',
          videoId: 'video-one',
          thumbnailId: '',
          captionId: '',
          handoutIds: [],
        },
      ],
    };
    assets.set([
      {
        id: 'video-one',
        name: 'safe-care.mp4',
        kind: 'Video',
        status: 'SCAN_PENDING',
      } as AcademyAsset,
    ]);
    url = vi.fn(async () => 'blob:scanned-video');
    process = vi.fn(async () => {
      assets.update((rows) => rows.map((asset) => ({ ...asset, status: 'CAPTIONS_REVIEW' })));
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ courseId: 'course-one' }) } },
        },
        { provide: AcademyAssets, useValue: { url } },
        {
          provide: AcademyService,
          useValue: {
            store: { companyId: () => 'company-one' },
            course: () => course,
            state: () => ({ assets: assets() }),
            api: { mediaError: signal(''), process },
            persistCourse: vi.fn(async (draft: AcademyCourse) => {
              course = structuredClone(draft);
              return null;
            }),
          },
        },
      ],
    });
  });
  it('does not request quarantined content before its scan succeeds', async () => {
    const editor = TestBed.runInInjectionContext(() => new AcademyContentEditor());
    await editor['loadMedia']();
    expect(url).not.toHaveBeenCalled();
    expect(editor['videoUrl']()).toBe('');
  });
  it('loads video playback immediately after a successful scan retry and draft save', async () => {
    const editor = TestBed.runInInjectionContext(() => new AcademyContentEditor());
    await editor['save'](false);
    expect(process).toHaveBeenCalledWith('video-one');
    expect(url).toHaveBeenCalledWith('video-one');
    expect(editor['videoUrl']()).toBe('blob:scanned-video');
    expect(editor['error']()).toBe('');
  });
  it('keeps an existing preview without downloading the video again on each draft save', async () => {
    assets.update((rows) => rows.map((asset) => ({ ...asset, status: 'READY' })));
    const editor = TestBed.runInInjectionContext(() => new AcademyContentEditor());
    await vi.waitFor(() => expect(editor['videoUrl']()).toBe('blob:scanned-video'));
    url.mockClear();
    await editor['save'](false);
    expect(url).not.toHaveBeenCalled();
    expect(process).not.toHaveBeenCalled();
    expect(editor['videoUrl']()).toBe('blob:scanned-video');
  });
});
