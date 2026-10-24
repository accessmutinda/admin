import { Router, Routes } from '@angular/router';
import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { authGuard, guestGuard, workspaceGuard } from './core/auth/auth.guard';

const peopleGuard = (
  route: import('@angular/router').ActivatedRouteSnapshot,
  state: import('@angular/router').RouterStateSnapshot,
) => {
  const context = inject(EnvironmentInjector);
  return import('./features/management/people/hr.service').then((m) =>
    runInInjectionContext(context, () => m.hrGuard(route, state)),
  );
};

const legacyPersonGuard = (route: import('@angular/router').ActivatedRouteSnapshot) => {
  const context = inject(EnvironmentInjector);
  return import('./features/management/people/hr.service').then((m) =>
    runInInjectionContext(context, () => {
      const hr = inject(m.HrService);
      const router = inject(Router);
      if (!hr.can('view')) return router.createUrlTree(['/manage/companies']);
      const id = route.paramMap.get('id');
      if (hr.store.data().people.find((p) => p.id === id)?.stage !== 'Hired') return true;
      const sections: Record<string, string> = {
        Profile: 'overview',
        Onboarding: 'employment',
        Compliance: 'compliance',
        Documents: 'documents',
        Learning: 'training',
        Notes: 'notes',
      };
      return router.createUrlTree([
        '/manage/people/staff',
        id,
        sections[route.queryParamMap.get('tab') ?? 'Profile'] ?? 'overview',
      ]);
    }),
  );
};

export const routes: Routes = [
  ...['family-portal', 'family-portal/:page', 'family/:clientId/:accessId/:page'].map((path) => ({
    path,
    canActivate: [workspaceGuard],
    title: 'Family Portal · CareVerity',
    loadComponent: () =>
      import('./features/management/care/family-portal').then((m) => m.FamilyPortal),
  })),
  {
    path: 'staff-portal',
    canActivate: [workspaceGuard],
    loadComponent: () =>
      import('./features/management/staff-portal/portal-shell').then((m) => m.PortalShell),
    loadChildren: () =>
      import('./features/management/staff-portal/portal.routes').then((m) => m.PORTAL_ROUTES),
  },
  {
    path: 'inspector',
    canActivate: [workspaceGuard],
    loadComponent: () =>
      import('./features/inspector/inspector-layout').then((m) => m.InspectorLayout),
    children: [
      ...[
        'dashboard',
        'provider',
        'service-users',
        'staffing',
        'medication',
        'incidents',
        'quality',
        'documents',
        'visits',
        'reports',
        'notes',
      ].map((page) => ({
        path: page,
        data: { page },
        title: `${page.replaceAll('-', ' ')} · Inspector Portal · CareVerity`,
        loadComponent: () =>
          import('./features/inspector/inspector-page').then((m) => m.InspectorPage),
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
      })),
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  {
    path: 'apply/:companyId/:vacancyId',
    title: 'Apply for a vacancy · CareVerity',
    loadComponent: () =>
      import('./features/management/recruitment/public-application').then(
        (m) => m.PublicApplication,
      ),
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
      {
        path: 'sign-in',
        title: 'Sign in · CareVerity',
        loadComponent: () => import('./features/auth/sign-in/sign-in').then((m) => m.SignIn),
      },
      {
        path: 'mfa',
        title: 'Verify your identity · CareVerity',
        loadComponent: () =>
          import('./features/auth/mfa-verify/mfa-verify').then((m) => m.MfaVerify),
      },
      {
        path: 'forgot-password',
        title: 'Reset your password · CareVerity',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'sso/microsoft',
        title: 'Sign in with Microsoft · CareVerity',
        loadComponent: () =>
          import('./features/auth/sso-microsoft/sso-microsoft').then((m) => m.SsoMicrosoft),
      },
      {
        path: 'invite/:token',
        title: "You're invited · CareVerity",
        loadComponent: () =>
          import('./features/auth/invite-accept/invite-accept').then((m) => m.InviteAccept),
      },
    ],
  },
  {
    path: 'select-workspace',
    title: 'Select your workspace · CareVerity',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/workspace-select/workspace-select').then((m) => m.WorkspaceSelect),
  },
  {
    // Not under /auth: changing your password needs your *current* password,
    // so unlike the rest of the auth/* flow this is only usable signed in
    // (reached from Security settings → Change).
    path: 'account/change-password',
    title: 'Change your password · CareVerity',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/management/layout/management-layout').then((m) => m.ManagementLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
      },
    ],
  },
  {
    path: 'access-denied',
    title: 'Access restricted · CareVerity',
    loadComponent: () =>
      import('./features/auth/access-denied/access-denied').then((m) => m.AccessDenied),
  },
  {
    path: 'account',
    canActivate: [workspaceGuard],
    children: [
      {
        path: 'security',
        loadComponent: () =>
          import('./features/management/layout/management-layout').then((m) => m.ManagementLayout),
        children: [
          {
            path: '',
            title: 'Security settings · CareVerity',
            loadComponent: () =>
              import('./features/account/security/security-settings').then(
                (m) => m.SecuritySettings,
              ),
          },
          {
            path: 'login-history',
            title: 'Login activity · CareVerity',
            loadComponent: () =>
              import('./features/account/security/login-history').then((m) => m.LoginHistory),
          },
        ],
      },
      { path: '', redirectTo: 'security', pathMatch: 'full' },
    ],
  },
  {
    path: 'family/:clientId/:accessId',
    canActivate: [workspaceGuard],
    title: 'Family Portal · CareVerity',
    loadComponent: () =>
      import('./features/management/care/family-portal').then((m) => m.FamilyPortal),
  },
  {
    path: 'manage',
    canActivate: [workspaceGuard],
    canActivateChild: [
      (route, state) => {
        const injector = inject(EnvironmentInjector);
        return import('./features/management/shared/module.guard').then((m) =>
          runInInjectionContext(injector, () => m.moduleGuard(route, state)),
        );
      },
    ],
    loadComponent: () =>
      import('./features/management/layout/management-layout').then((m) => m.ManagementLayout),
    children: [
      {
        path: 'companies',
        title: 'Companies · CareVerity',
        loadComponent: () =>
          import('./features/management/companies/companies').then((m) => m.Companies),
      },
      {
        path: 'companies/directory',
        title: 'Company directory · CareVerity',
        loadComponent: () =>
          import('./features/management/companies/company-directory').then(
            (m) => m.CompanyDirectory,
          ),
      },
      {
        path: 'companies/integrations',
        title: 'Company integrations & data · CareVerity',
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
        loadComponent: () =>
          import('./features/management/company-admin/settings/integrations-settings').then(
            (m) => m.IntegrationsSettings,
          ),
      },
      {
        path: 'companies/access',
        title: 'Users & role permissions · CareVerity',
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
        loadComponent: () =>
          import('./features/management/company-admin/access/users-access').then(
            (m) => m.UsersAccess,
          ),
      },
      {
        path: 'companies/new',
        title: 'Create company · CareVerity',
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
        loadComponent: () =>
          import('./features/management/companies/company-create').then((m) => m.CompanyCreatePage),
      },
      {
        path: 'companies/:id/compliance',
        title: 'Registration & compliance · CareVerity',
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
        loadComponent: () =>
          import('./features/management/companies/company-compliance').then(
            (m) => m.CompanyCompliancePage,
          ),
      },
      {
        path: 'companies/:id/contacts',
        title: 'Company contacts · CareVerity',
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
        loadComponent: () =>
          import('./features/management/companies/company-contacts').then(
            (m) => m.CompanyContactsPage,
          ),
      },
      {
        path: 'companies/:id/branding',
        title: 'Company branding · CareVerity',
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
        loadComponent: () =>
          import('./features/management/companies/company-branding').then(
            (m) => m.CompanyBrandingPage,
          ),
      },
      {
        path: 'companies/:id/modules',
        pathMatch: 'full',
        redirectTo: 'companies/:id/modules/overview',
      },
      {
        path: 'companies/:id/modules/:section',
        title: 'Modules & subscription · CareVerity',
        canDeactivate: [
          (component: { canLeave: (url?: string) => boolean }, _route, _state, next) =>
            component.canLeave(next.url),
        ],
        loadComponent: () =>
          import('./features/management/companies/company-modules').then(
            (m) => m.CompanyModulesPage,
          ),
      },
      {
        path: 'companies/:id/settings',
        title: 'Company settings · CareVerity',
        loadComponent: () =>
          import('./features/management/companies/company-editor').then((m) => m.CompanyEditor),
      },
      {
        path: 'companies/:id',
        title: 'Company profile · CareVerity',
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
        loadComponent: () =>
          import('./features/management/companies/company-profile').then((m) => m.CompanyProfile),
      },
      {
        path: 'locations',
        title: 'Branches & service locations · CareVerity',
        loadComponent: () =>
          import('./features/management/locations/locations').then((m) => m.LocationsPage),
      },
      {
        path: 'access',
        pathMatch: 'full',
        redirectTo: 'companies/access',
      },
      {
        path: 'workflows',
        title: 'Approval workflows · CareVerity',
        loadComponent: () =>
          import('./features/management/company-admin/workflows/approval-workflows').then(
            (m) => m.ApprovalWorkflows,
          ),
      },
      {
        path: 'settings',
        pathMatch: 'full',
        redirectTo: 'companies/integrations',
      },
      {
        path: 'clients',
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
        data: { module: 'Care delivery' },
        title: 'Service users · CareVerity',
        loadComponent: () =>
          import('./features/management/clients/client-files').then((m) => m.ClientFiles),
      },
      {
        path: 'clients/:id',
        data: { module: 'Care delivery' },
        loadChildren: () =>
          import('./features/management/care/care.routes').then((m) => m.CARE_ROUTES),
      },
      {
        path: 'ecm/workflows',
        data: { module: 'Care delivery' },
        title: 'ECM workflows · CareVerity',
        loadComponent: () =>
          import('./features/management/ecm/ecm-workflows').then((m) => m.EcmWorkflows),
      },
      {
        path: 'ecm/wallboard',
        data: { module: 'Care delivery', wallboard: true },
        title: 'Live ECM wallboard · CareVerity',
        loadComponent: () =>
          import('./features/management/ecm/ecm-wallboard').then((m) => m.EcmWallboard),
      },
      {
        path: 'ecm',
        data: { module: 'Care delivery' },
        title: 'Live ECM board · CareVerity',
        loadComponent: () => import('./features/management/ecm/ecm').then((m) => m.Ecm),
      },
      {
        path: 'rota',
        data: { module: 'Care delivery' },
        loadComponent: () =>
          import('./features/management/rota/visits-workspace').then((m) => m.VisitsWorkspace),
        loadChildren: () =>
          import('./features/management/rota/visits.routes').then((m) => m.VISITS_ROUTES),
      },
      {
        path: 'staff-journal',
        pathMatch: 'full',
        redirectTo: '/staff-portal/journal',
      },
      {
        path: 'staff-portal',
        children: [
          {
            path: '**',
            redirectTo: ({ url, queryParams, fragment }) =>
              inject(Router).createUrlTree(
                ['/staff-portal', ...url.map((segment) => segment.path)],
                { queryParams, fragment: fragment ?? undefined },
              ),
          },
        ],
      },
      {
        path: 'supervisor',
        data: { module: 'Quality & compliance', supervisor: true },
        title: 'Supervisor dashboard · CareVerity',
        loadComponent: () => import('./features/management/quality/quality').then((m) => m.Quality),
      },
      {
        path: 'quality',
        data: { module: 'Quality & compliance' },
        title: 'Quality & QA · CareVerity',
        loadComponent: () => import('./features/management/quality/quality').then((m) => m.Quality),
      },
      ...['new/:type', 'assessments/:id'].map((path) => ({
        path: 'quality/' + path,
        data: { module: 'Quality & compliance' },
        title: 'Quality assessment · CareVerity',
        loadComponent: () =>
          import('./features/management/quality/assessment-editor').then((m) => m.AssessmentEditor),
        canDeactivate: [
          (component: import('./features/management/quality/assessment-editor').AssessmentEditor) =>
            !component.isDirty() ||
            window.confirm('Leave this assessment and discard unsaved changes?'),
        ],
      })),
      {
        path: 'payroll',
        pathMatch: 'full',
        redirectTo: 'finance/payroll',
      },
      {
        path: 'finance',
        pathMatch: 'full',
        redirectTo: 'finance/overview',
      },
      {
        path: 'finance/:area',
        data: { module: 'Finance' },
        title: (route) =>
          `${route.paramMap.get('area') === 'payroll' ? 'Payroll' : route.paramMap.get('area') === 'billing' ? 'Billing & payments' : 'Finance overview'} · CareVerity`,
        loadComponent: () => import('./features/management/payroll/payroll').then((m) => m.Payroll),
      },
      {
        path: 'people',
        pathMatch: 'full',
        canActivate: [peopleGuard],
        data: { module: 'People & HR', hrMode: 'overview' },
        title: 'People & HR · CareVerity',

        loadComponent: () =>
          import('./features/management/people/hr-workspace').then((m) => m.HrWorkspace),
      },
      {
        path: 'people/staff',
        pathMatch: 'full',
        canActivate: [peopleGuard],
        data: { module: 'People & HR', hrMode: 'directory' },
        title: 'Staff Directory · CareVerity',
        loadComponent: () =>
          import('./features/management/people/hr-workspace').then((m) => m.HrWorkspace),
      },
      {
        path: 'people/onboarding',
        canActivate: [peopleGuard],
        data: { module: 'People & HR' },
        title: 'Onboarding · CareVerity',
        loadComponent: () =>
          import('./features/management/people/hr-onboarding').then((m) => m.HrOnboarding),
      },
      {
        path: 'people/compliance',
        canActivate: [peopleGuard],
        data: { module: 'People & HR' },
        title: 'Workforce Compliance · CareVerity',
        loadComponent: () =>
          import('./features/management/people/hr-compliance').then((m) => m.HrCompliance),
      },
      {
        path: 'people/staff/new',
        canActivate: [peopleGuard],
        data: { module: 'People & HR' },
        title: 'Create staff · CareVerity',
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
        loadComponent: () =>
          import('./features/management/people/staff-create').then((m) => m.StaffCreate),
      },
      ...[
        'overview',
        'personal',
        'employment',
        'compliance',
        'availability',
        'training',
        'documents',
        'reviews',
        'performance',
        'notes',
        'audit',
      ].map((staffSection) => ({
        path: 'people/staff/:id/' + staffSection,
        canActivate: [peopleGuard],
        data: { module: 'People & HR', staffSection },
        title: 'Staff profile · CareVerity',
        canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
        loadComponent: () =>
          import('./features/management/people/staff-profile').then((m) => m.StaffProfile),
      })),
      { path: 'people/staff/:id', pathMatch: 'full', redirectTo: 'people/staff/:id/overview' },
      ...['staff', 'onboarding', 'compliance'].map((area) => ({
        path: area,
        pathMatch: 'full' as const,
        redirectTo: 'people/' + area,
      })),
      {
        path: 'recruitment',
        data: { module: 'People & HR' },
        title: 'Recruitment · CareVerity',
        loadComponent: () =>
          import('./features/management/recruitment/recruitment').then((m) => m.Recruitment),
      },
      ...['leave', 'reviews'].map((section) => ({
        path: section,
        data: { section, module: 'People & HR' },
        title: 'People & development · CareVerity',
        canActivate: [peopleGuard],
        loadComponent: () => import('./features/management/people/hr-team').then((m) => m.HrTeam),
      })),
      {
        path: 'people/:id',
        canActivate: [legacyPersonGuard],
        data: { module: 'People & HR' },
        title: 'Person profile · CareVerity',
        loadComponent: () =>
          import('./features/management/people/person-detail').then((m) => m.PersonDetail),
      },
      {
        path: 'learning',
        data: { module: 'Training academy' },
        title: 'Training academy · CareVerity',
        loadChildren: () =>
          import('./features/management/learning/academy/academy.routes').then(
            (m) => m.ACADEMY_ADMIN_ROUTES,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'companies' },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'auth/sign-in' },
  {
    path: '**',
    title: 'Page not found · CareVerity',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
