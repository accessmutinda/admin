import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
const access =
  (manage: boolean): CanActivateFn =>
  () => {
    const context = inject(EnvironmentInjector);
    return import('./academy.service').then((m) =>
      runInInjectionContext(context, () => {
        const academy = inject(m.AcademyService);
        return (
          (manage ? academy.canManage() : academy.enabled()) ||
          inject(Router).createUrlTree(['/access-denied'])
        );
      }),
    );
  };
const admin = access(true);
const learner = access(false);
const leave = (c: { canLeave: () => boolean }) => c.canLeave();
export const ACADEMY_ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Training Academy · CareVerity',
    loadComponent: () => import('../learning').then((m) => m.Learning),
  },
  ...['courses', 'questions', 'assets'].map((view) => ({
    path: view,
    data: { module: 'Training academy', view },
    canActivate: [admin],
    title: 'Training Academy · CareVerity',
    loadComponent: () => import('./academy-catalog').then((m) => m.AcademyCatalog),
  })),
  ...['courses/new', 'courses/:courseId'].map((path) => ({
    path,
    canActivate: [admin],
    canDeactivate: [leave],
    title: 'Course editor · CareVerity',
    loadComponent: () => import('./academy-course-editor').then((m) => m.AcademyCourseEditor),
  })),
  ...['questions/new', 'questions/:questionId'].map((path) => ({
    path,
    canActivate: [admin],
    canDeactivate: [leave],
    title: 'Question builder · CareVerity',
    loadComponent: () => import('./academy-question-editor').then((m) => m.AcademyQuestionEditor),
  })),
  {
    path: 'content/:courseId/:lessonId',
    canActivate: [admin],
    canDeactivate: [leave],
    title: 'Edit learning content · CareVerity',
    loadComponent: () => import('./academy-content-editor').then((m) => m.AcademyContentEditor),
  },
  {
    path: 'manage',
    canActivate: [admin],
    canDeactivate: [leave],
    title: 'Manage training · CareVerity',
    loadComponent: () => import('./academy-manage').then((m) => m.AcademyManage),
  },
  {
    path: 'settings',
    canActivate: [admin],
    canDeactivate: [leave],
    title: 'Academy settings · CareVerity',
    loadComponent: () => import('./academy-settings').then((m) => m.AcademySettingsPage),
  },
  {
    path: 'reports',
    canActivate: [admin],
    title: 'Training compliance & reporting · CareVerity',
    loadComponent: () => import('./academy-reports').then((m) => m.AcademyReports),
  },
];
export const ACADEMY_STAFF_ROUTES: Routes = [
  { path: 'training', pathMatch: 'full', redirectTo: 'training/dashboard' },
  ...['dashboard', 'courses', 'assessments', 'certificates'].map((view) => ({
    path: 'training/' + view,
    data: { view },
    canActivate: [learner],
    canDeactivate: [leave],
    title: 'My Training Academy · CareVerity',
    loadComponent: () => import('./academy-learner').then((m) => m.AcademyLearner),
  })),
  {
    path: 'training/courses/:courseId',
    data: { view: 'course' },
    canActivate: [learner],
    canDeactivate: [leave],
    title: 'Learning course · CareVerity',
    loadComponent: () => import('./academy-learner').then((m) => m.AcademyLearner),
  },
  {
    path: 'training/courses/:courseId/lessons/:lessonId',
    data: { view: 'lesson' },
    canActivate: [learner],
    canDeactivate: [leave],
    title: 'Course lesson · CareVerity',
    loadComponent: () => import('./academy-learner').then((m) => m.AcademyLearner),
  },
  ...['assessment', 'results'].map((view) => ({
    path: 'training/' + view + '/:attemptId',
    data: { view: view === 'results' ? 'result' : 'assessment' },
    canActivate: [learner],
    canDeactivate: [leave],
    title: 'Training assessment · CareVerity',
    loadComponent: () => import('./academy-assessment').then((m) => m.AcademyAssessment),
  })),
  {
    path: 'training/certificates/:certificateId',
    data: { view: 'certificate' },
    canActivate: [learner],
    canDeactivate: [leave],
    title: 'Training certificate · CareVerity',
    loadComponent: () => import('./academy-learner').then((m) => m.AcademyLearner),
  },
];
