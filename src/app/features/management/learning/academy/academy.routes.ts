import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
const access =
  (scope: 'manage' | 'learner' | 'evidence'): CanActivateFn =>
  () => {
    const context = inject(EnvironmentInjector);
    return import('./academy.service').then((m) =>
      runInInjectionContext(context, () => {
        const academy = inject(m.AcademyService);
        return (
          (scope === 'manage'
            ? academy.canManage()
            : scope === 'evidence'
              ? academy.canViewEvidence()
              : academy.enabled()) || inject(Router).createUrlTree(['/access-denied'])
        );
      }),
    );
  };
const uploadsPlaced: CanActivateFn = (route) => {
  const context = inject(EnvironmentInjector);
  return import('./academy.service').then((m) =>
    runInInjectionContext(context, () => {
      const academy = inject(m.AcademyService);
      const id =
        route.paramMap.get('courseId') ??
        academy.editableQuestions().find((q) => q.id === route.paramMap.get('questionId'))
          ?.courseId ??
        route.queryParamMap.get('course') ??
        academy.editableCourses()[0]?.id;
      return id && academy.course(id)?.pendingLessons?.some((l) => !!l.videoId)
        ? inject(Router).createUrlTree(['/manage/learning/structure', id])
        : true;
    }),
  );
};
const capability =
  (value: import('./academy-governance.models').AcademyCapability): CanActivateFn =>
  () => {
    const context = inject(EnvironmentInjector);
    return import('./academy.service').then((m) =>
      runInInjectionContext(
        context,
        () =>
          inject(m.AcademyService).can(value) || inject(Router).createUrlTree(['/access-denied']),
      ),
    );
  };
const resultsLoaded: CanActivateFn = async (route) => {
  const context = inject(EnvironmentInjector),
    router = inject(Router);
  const m = await import('./academy-results-api.service');
  const api = runInInjectionContext(context, () => inject(m.AcademyResultsApi));
  if (!api.available()) return router.createUrlTree(['/access-denied']);
  try {
    await api.load(false, true);
    const id = route.paramMap.get('attemptId');
    if (id) await api.detail(id);
  } catch {
    /* The page displays the access or connection error. */
  }
  return true;
};
const learningLoaded: CanActivateFn = async (route) => {
  if (route.queryParamMap.get('preview') === '1') return true;
  const context = inject(EnvironmentInjector),
    router = inject(Router);
  const m = await import('./academy-results-api.service');
  const api = runInInjectionContext(context, () => inject(m.AcademyResultsApi));
  if (!api.learnerAvailable()) return router.createUrlTree(['/access-denied']);
  try {
    await api.load(true, true);
    const certificates = await import('./academy-certificates-api.service');
    const evidence = runInInjectionContext(context, () =>
      inject(certificates.AcademyCertificatesApi),
    );
    await evidence.load(true);
    const policies = await import('./academy-governance-api.service');
    const policy = runInInjectionContext(context, () => inject(policies.AcademyGovernanceApi));
    await policy.load(true);
    const certificateId = route.paramMap.get('certificateId');
    if (certificateId) await evidence.detail(certificateId, true);
    const id = route.paramMap.get('attemptId');
    if (id) await api.detail(id, true);
  } catch {
    /* The page displays the access or connection error. */
  }
  return true;
};
const certificatesIfAvailable: CanActivateFn = async () => {
  const context = inject(EnvironmentInjector),
    m = await import('./academy-certificates-api.service');
  const api = runInInjectionContext(context, () => inject(m.AcademyCertificatesApi));
  if (api.available())
    try {
      await api.load();
    } catch {
      /* The page displays the source error. */
    }
  return true;
};
const governanceLoaded: CanActivateFn = async () => {
  const context = inject(EnvironmentInjector),
    router = inject(Router);
  const m = await import('./academy-governance-api.service');
  const api = runInInjectionContext(context, () => inject(m.AcademyGovernanceApi));
  if (!api.available()) return router.createUrlTree(['/access-denied']);
  try {
    await api.load();
  } catch {
    /* The page shows the source error. */
  }
  return true;
};
const requirementsLoaded: CanActivateFn = async () => {
  const context = inject(EnvironmentInjector),
    m = await import('./academy-certificates-api.service');
  const api = runInInjectionContext(context, () => inject(m.AcademyCertificatesApi));
  try {
    await api.loadRequirements();
  } catch {
    /* The page displays the access error. */
  }
  return true;
};
const certificatesLoaded: CanActivateFn = async (route) => {
  const context = inject(EnvironmentInjector),
    router = inject(Router);
  const m = await import('./academy-certificates-api.service');
  const api = runInInjectionContext(context, () => inject(m.AcademyCertificatesApi));
  if (!api.available()) return router.createUrlTree(['/access-denied']);
  try {
    await api.load();
    const id = route.paramMap.get('certificateId');
    if (id) await api.detail(id);
  } catch {
    /* The page displays the access or connection error. */
  }
  return true;
};
const resultsIfAvailable: CanActivateFn = async () => {
  const context = inject(EnvironmentInjector);
  const m = await import('./academy-results-api.service');
  const api = runInInjectionContext(context, () => inject(m.AcademyResultsApi));
  if (api.available()) {
    try {
      await api.load(false, true);
    } catch {
      /* The page displays the access error. */
    }
  }
  return true;
};
const assignmentsIfAvailable: CanActivateFn = async () => {
  const context = inject(EnvironmentInjector),
    m = await import('./academy-assignments-api.service');
  const api = runInInjectionContext(context, () => inject(m.AcademyAssignmentsApi));
  if (api.available())
    try {
      await api.load(true);
    } catch {
      /* The source service shows the error. */
    }
  return true;
};
const assignmentsLoaded: CanActivateFn = async () => {
  const router = inject(Router);
  const context = inject(EnvironmentInjector);
  const m = await import('./academy-assignments-api.service');
  const api = runInInjectionContext(context, () => inject(m.AcademyAssignmentsApi));
  if (!api.available()) return router.createUrlTree(['/access-denied']);
  try {
    await api.load(true);
  } catch {
    /* The page displays the access or connection error. */
  }
  return true;
};

const academyLoaded: CanActivateFn = async (route) => {
  const context = inject(EnvironmentInjector);
  const m = await import('./academy.service');
  const academy = runInInjectionContext(context, () => inject(m.AcademyService));
  try {
    await academy.api.load(true);
    const id = route.paramMap.get('courseId') ?? route.queryParamMap.get('course');
    if (id) await academy.api.detail(id);
  } catch {
    /* The page displays the unavailable state. */
  }
  return true;
};
const previewLoaded: CanActivateFn = async (route) => {
  if (route.queryParamMap.get('preview') !== '1') return true;
  const context = inject(EnvironmentInjector);
  const router = inject(Router);
  const m = await import('./academy.service');
  const academy = runInInjectionContext(context, () => inject(m.AcademyService));
  if (!academy.can('author')) return router.createUrlTree(['/access-denied']);
  try {
    await academy.api.load(true);
    const id = route.paramMap.get('courseId');
    if (id) await academy.api.detail(id);
  } catch {
    /* The preview displays the unavailable state. */
  }
  return true;
};
const admin = capability('author');
const reader = access('evidence');
const learner = access('learner');
const leave = (c: { canLeave: () => boolean | Promise<boolean> }) => c.canLeave();
export const ACADEMY_ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [reader, resultsIfAvailable, certificatesIfAvailable],
    title: 'CareVerity Academy · CareVerity',
    loadComponent: () => import('./academy-dashboard').then((m) => m.AcademyDashboard),
  },
  {
    path: 'results/:attemptId',
    canActivate: [resultsLoaded, certificatesIfAvailable],
    title: 'Staff results & retakes · CareVerity',
    loadComponent: () => import('./academy-results-review').then((m) => m.AcademyResultsReview),
  },
  {
    path: 'certificates/:certificateId',
    canActivate: [certificatesLoaded],
    title: 'Staff certificates & compliance · CareVerity',
    loadComponent: () =>
      import('./academy-compliance-review').then((m) => m.AcademyComplianceReview),
  },
  ...['results', 'certificates'].map((view) => ({
    path: view,
    data: { view },
    canActivate:
      view === 'results' ? [resultsLoaded, certificatesIfAvailable] : [certificatesLoaded],
    title: 'CareVerity Academy · Evidence',
    loadComponent: () => import('./academy-evidence').then((m) => m.AcademyEvidence),
  })),
  {
    path: 'diagnostics',
    canActivate: [capability('diagnostics')],
    title: 'Academy diagnostics · CareVerity',
    loadComponent: () => import('./academy-diagnostics').then((m) => m.AcademyDiagnostics),
  },
  {
    path: 'governance',
    canActivate: [
      governanceLoaded,
      assignmentsIfAvailable,
      resultsIfAvailable,
      certificatesIfAvailable,
      requirementsLoaded,
    ],
    title: 'Academy policies & reviews · CareVerity',
    loadComponent: () => import('./academy-governance').then((m) => m.AcademyGovernancePage),
  },
  { path: 'assets', pathMatch: 'full', redirectTo: 'courses' },
  {
    path: 'courses',
    data: { module: 'Training academy', view: 'courses' },
    canActivate: [admin, academyLoaded],
    title: 'CareVerity Academy · CareVerity',
    loadComponent: () => import('./academy-catalog').then((m) => m.AcademyCatalog),
  },
  ...['courses/new', 'courses/:courseId'].map((path) => ({
    path,
    canActivate: [admin, academyLoaded],
    canDeactivate: [leave],
    title: 'Course editor · CareVerity',
    loadComponent: () => import('./academy-course-editor').then((m) => m.AcademyCourseEditor),
  })),
  ...['questions', 'questions/new', 'questions/:questionId'].map((path) => ({
    path,
    canActivate: [admin, academyLoaded, uploadsPlaced],
    canDeactivate: [leave],
    title: 'Question builder · CareVerity',
    loadComponent: () => import('./academy-question-editor').then((m) => m.AcademyQuestionEditor),
  })),
  ...['publish', 'publish/:courseId'].map((path) => ({
    path,
    canActivate: [capability('publish'), academyLoaded, uploadsPlaced],
    canDeactivate: [leave],
    title: 'Review & publish course · CareVerity',
    loadComponent: () => import('./academy-publishing').then((m) => m.AcademyPublishing),
  })),
  ...['rules', 'rules/:courseId'].map((path) => ({
    path,
    canActivate: [capability('assign'), academyLoaded, assignmentsLoaded, uploadsPlaced],
    canDeactivate: [leave],
    title: 'Assessment rules & staff assignments · CareVerity',
    loadComponent: () =>
      import('./academy-rules-assignments').then((m) => m.AcademyRulesAssignments),
  })),
  {
    path: 'structure/:courseId',
    canActivate: [admin, academyLoaded],
    canDeactivate: [leave],
    title: 'Modules & lessons · CareVerity',
    loadComponent: () => import('./academy-structure-editor').then((m) => m.AcademyStructureEditor),
  },
  {
    path: 'content/:courseId',
    canActivate: [admin, academyLoaded],
    canDeactivate: [leave],
    title: 'Upload training video & resources · CareVerity',
    loadComponent: () => import('./academy-content-editor').then((m) => m.AcademyContentEditor),
  },
  {
    path: 'content/:courseId/:lessonId',
    canActivate: [admin, academyLoaded],
    canDeactivate: [leave],
    title: 'Edit learning content · CareVerity',
    loadComponent: () => import('./academy-content-editor').then((m) => m.AcademyContentEditor),
  },
  {
    path: 'manage',
    canActivate: [assignmentsLoaded, certificatesIfAvailable],
    canDeactivate: [leave],
    title: 'Manage training · CareVerity',
    loadComponent: () => import('./academy-manage').then((m) => m.AcademyManage),
  },
  {
    path: 'settings',
    canActivate: [capability('configure')],
    canDeactivate: [leave],
    title: 'Academy settings · CareVerity',
    loadComponent: () => import('./academy-settings').then((m) => m.AcademySettingsPage),
  },
  {
    path: 'reports',
    canActivate: [
      () => {
        const router = inject(Router);
        return (
          inject(CompanyAccessService).can('academy', 'reports', 'read') ||
          router.createUrlTree(['/access-denied'])
        );
      },
    ],
    title: 'Training compliance & reporting · CareVerity',
    loadComponent: () => import('./academy-reports').then((m) => m.AcademyReports),
  },
];
export const ACADEMY_STAFF_ROUTES: Routes = [
  { path: 'training', pathMatch: 'full', redirectTo: 'training/dashboard' },
  ...[
    'dashboard',
    'courses',
    'assessments',
    'certificates',
    'history',
    'refreshers',
    'messages',
  ].map((view) => ({
    path: 'training/' + view,
    data: { view },
    canActivate: [learner, previewLoaded, learningLoaded],
    canDeactivate: [leave],
    title: 'My CareVerity Academy · CareVerity',
    loadComponent: () => import('./academy-learner').then((m) => m.AcademyLearner),
  })),
  {
    path: 'training/courses/:courseId',
    data: { view: 'course' },
    canActivate: [learner, previewLoaded, learningLoaded],
    canDeactivate: [leave],
    title: 'Learning course · CareVerity',
    loadComponent: () => import('./academy-learner').then((m) => m.AcademyLearner),
  },
  {
    path: 'training/courses/:courseId/lessons/:lessonId',
    data: { view: 'lesson' },
    canActivate: [learner, previewLoaded, learningLoaded],
    canDeactivate: [leave],
    title: 'Course lesson · CareVerity',
    loadComponent: () => import('./academy-learner').then((m) => m.AcademyLearner),
  },
  ...['assessment', 'results'].map((view) => ({
    path: 'training/' + view + '/:attemptId',
    data: { view: view === 'results' ? 'result' : 'assessment' },
    canActivate: [learner, previewLoaded, learningLoaded],
    canDeactivate: [leave],
    title: 'Training assessment · CareVerity',
    loadComponent: () => import('./academy-assessment').then((m) => m.AcademyAssessment),
  })),
  {
    path: 'training/certificates/:certificateId',
    data: { view: 'certificate' },
    canActivate: [learner, previewLoaded, learningLoaded],
    canDeactivate: [leave],
    title: 'Training certificate · CareVerity',
    loadComponent: () => import('./academy-learner').then((m) => m.AcademyLearner),
  },
];
