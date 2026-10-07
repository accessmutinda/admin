import { Routes } from '@angular/router';
import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { authGuard, guestGuard, workspaceGuard } from './core/auth/auth.guard';

export const routes: Routes = [
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
        path: 'companies/new',
        title: 'Add company · CareVerity',
        loadComponent: () =>
          import('./features/management/companies/company-editor').then((m) => m.CompanyEditor),
      },
      {
        path: 'companies/:id',
        title: 'Company profile · CareVerity',
        loadComponent: () =>
          import('./features/management/companies/company-editor').then((m) => m.CompanyEditor),
      },
      {
        path: 'access',
        title: 'Users & access · CareVerity',
        loadComponent: () =>
          import('./features/management/company-admin/access/users-access').then(
            (m) => m.UsersAccess,
          ),
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
        title: 'Integrations & data · CareVerity',
        loadComponent: () =>
          import('./features/management/company-admin/settings/integrations-settings').then(
            (m) => m.IntegrationsSettings,
          ),
      },
      {
        path: 'clients',
        data: { module: 'Care delivery' },
        title: 'Client files · CareVerity',
        loadComponent: () =>
          import('./features/management/clients/client-files').then((m) => m.ClientFiles),
      },
      {
        path: 'clients/:id',
        data: { module: 'Care delivery' },
        title: 'Client record · CareVerity',
        loadComponent: () =>
          import('./features/management/clients/client-files').then((m) => m.ClientFiles),
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
        loadComponent: () => import('./features/management/ecm/ecm').then((m) => m.Ecm),
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
        title: 'Rota & shift allocation · CareVerity',
        loadComponent: () => import('./features/management/rota/rota').then((m) => m.Rota),
      },
      {
        path: 'payroll',
        data: { module: 'Finance' },
        title: 'Payroll & payments · CareVerity',
        loadComponent: () => import('./features/management/payroll/payroll').then((m) => m.Payroll),
      },
      {
        path: 'recruitment',
        data: { module: 'People & HR' },
        title: 'Recruitment · CareVerity',
        loadComponent: () =>
          import('./features/management/recruitment/recruitment').then((m) => m.Recruitment),
      },
      ...['onboarding', 'staff', 'compliance', 'leave', 'reviews'].map((section) => ({
        path: section,
        data: { section, module: 'People & HR' },
        title: 'People & development · CareVerity',
        loadComponent: () => import('./features/management/people/people').then((m) => m.People),
      })),
      {
        path: 'people/:id',
        data: { module: 'People & HR' },
        title: 'Person profile · CareVerity',
        loadComponent: () =>
          import('./features/management/people/person-detail').then((m) => m.PersonDetail),
      },
      {
        path: 'learning',
        data: { module: 'Training academy' },
        title: 'Training academy · CareVerity',
        loadComponent: () =>
          import('./features/management/learning/learning').then((m) => m.Learning),
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
