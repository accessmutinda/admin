import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CompanyAccessService, routeAccess } from '../../../../core/access/company-access.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi, type CourseRecord } from './academy-api.service';
import { emptyAcademy, type AcademyLesson } from './academy.models';
import { ACADEMY_ADMIN_ROUTES } from './academy.routes';
import { AcademyService } from './academy.service';

function lesson(id: string, title: string, content: string): AcademyLesson {
  return {
    id,
    title,
    content,
    type: 'Reading',
    moduleId: 'module-1',
    moduleTitle: 'Safe practice',
    minutes: 4,
    transcript: '',
    videoId: '',
    thumbnailId: '',
    captionId: '',
    handoutIds: [],
  };
}

function setup(canEdit = true) {
  const companyId = signal('north');
  const actor = { id: 'super-admin', roleCode: 'SA' };
  const staff = vi.fn(() => []);
  const persist = vi.fn();
  const record: CourseRecord = {
    course: {
      id: 'course-1',
      company_id: 'north',
      etag: '"v2"',
      title: 'Care practice draft',
      description: 'Inspect the latest course material.',
      category: 'Mandatory',
      mandatory: true,
      cpdHours: 1,
      passMark: 80,
      validityMonths: 12,
      status: 'Draft',
      sample: false,
      thumbnailId: '',
      modules: [{ id: 'module-1', title: 'Safe practice' }],
      lessons: [
        lesson('lesson-1', 'First lesson', 'Saved draft lesson text.'),
        lesson('lesson-2', 'Next lesson', 'Second saved lesson text.'),
      ],
      version: 2,
      updatedAt: '2026-11-12T10:00:00Z',
    },
    published: null,
    questions: [],
    versions: [],
  };
  record.published = {
    ...record.course,
    status: 'Published',
    lessons: [lesson('lesson-1', 'First lesson', 'Older published text.')],
  };
  const coursePath = '/companies/north/academy/courses/course-1';
  const request = vi.fn(async (path: string, _body?: unknown, method?: string) => {
    if (method && method !== 'GET') throw Error('Preview must use read requests.');
    if (path === coursePath) return structuredClone(record);
    if (path.startsWith('/companies/north/academy/courses?'))
      return { results: [structuredClone(record)], next: null, meta: { company_id: 'north' } };
    if (path.startsWith('/companies/north/academy/media?'))
      return { results: [], company_id: 'north' };
    throw Error('Unexpected request ' + path);
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'manage/learning', children: ACADEMY_ADMIN_ROUTES },
        { path: 'access-denied', component: ModeDenied },
      ]),
      {
        provide: AuthService,
        useValue: { currentUser: () => actor, isSuperAdmin: () => true, api: request },
      },
      {
        provide: CompanyAccessService,
        useValue: {
          context: () => null,
          can: (_module: string, feature: string, action: string) =>
            feature === 'courses' && (action === 'read' || canEdit),
        },
      },
      { provide: ManagementStore, useValue: { companyId, staff } },
      {
        provide: AcademyService,
        useFactory: () => {
          const api = inject(AcademyApi);
          const course = (id: string) => api.courses().find((row) => row.course.id === id)?.course;
          return {
            api,
            store: { companyId, staff },
            course,
            can: (capability: string) => capability !== 'author' || canEdit,
            canManage: () => true,
            editableCourses: () => api.courses().map((row) => row.course),
            editableQuestions: () => [],
            state: () => ({ ...emptyAcademy(), courseDrafts: [record.course] }),
            policyFor: () => emptyAcademy().settings,
            publicationError: () => 'Publish final assessment questions.',
            persistCourse: persist,
          };
        },
      },
    ],
  });
  return { request, coursePath, persist, staff };
}

@Component({ template: 'Access denied' })
class ModeDenied {}

describe('Author learner journey preview', () => {
  it.each(['structure', 'publish'])(
    'opens saved draft lessons from %s without learner requests',
    async (entry) => {
      const { request, coursePath, persist, staff } = setup();
      const authorPath = '/manage/learning/' + entry + '/course-1';
      const previewPath = '/manage/learning/preview/course-1';
      const harness = await RouterTestingHarness.create(authorPath);
      const settle = async () => {
        await harness.fixture.whenStable();
        harness.detectChanges();
      };
      await settle();
      expect(routeAccess(previewPath)).toEqual([['academy', 'courses']]);
      const preview = [...harness.routeNativeElement!.querySelectorAll('button')].find((button) =>
        button.textContent?.replace(/\s+/g, ' ').includes('Preview Learner Journey'),
      )!;
      request.mockClear();
      preview.click();
      await vi.waitFor(() =>
        expect(TestBed.inject(Router).url).toBe(previewPath + '?from=' + entry),
      );
      await settle();
      let page = harness.routeNativeElement!;
      expect(page.textContent).toContain('Saved draft lesson text.');
      expect(page.textContent).not.toContain('Older published text.');
      expect(page.textContent).not.toContain('Mark as complete');
      expect(page.querySelector('a')?.getAttribute('href')).toBe(authorPath);
      const next = [...page.querySelectorAll('a')].find((link) =>
        link.textContent?.includes('Next lesson'),
      )!;
      await harness.navigateByUrl(next.getAttribute('href')!);
      await settle();
      page = harness.routeNativeElement!;
      expect(page.textContent).toContain('Second saved lesson text.');
      expect(request.mock.calls).toEqual([[coursePath]]);
      expect(persist).not.toHaveBeenCalled();
      expect(staff).not.toHaveBeenCalled();
    },
  );

  it('requires course authorisation on a direct preview link', async () => {
    const { request } = setup(false);
    const harness = await RouterTestingHarness.create('/manage/learning/preview/course-1');
    expect(harness.routeNativeElement!.textContent).toContain('Access denied');
    expect(request).not.toHaveBeenCalled();
  });
});
