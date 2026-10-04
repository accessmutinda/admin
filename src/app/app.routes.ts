import { Routes } from '@angular/router';
import { authGuard, guestGuard, workspaceGuard } from './core/auth/auth.guard';

export const routes: Routes = [
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
        loadComponent: () => import('./features/auth/mfa-verify/mfa-verify').then((m) => m.MfaVerify),
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
      import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'access-denied',
    title: 'Access restricted · CareVerity',
    loadComponent: () => import('./features/auth/access-denied/access-denied').then((m) => m.AccessDenied),
  },
  {
    path: 'account',
    canActivate: [workspaceGuard],
    children: [
      {
        path: 'security',
        loadComponent: () =>
          import('./features/account/account-security-layout').then((m) => m.AccountSecurityLayout),
        children: [
          {
            path: '',
            title: 'Security settings · CareVerity',
            loadComponent: () =>
              import('./features/account/security/security-settings').then((m) => m.SecuritySettings),
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
  { path: '', pathMatch: 'full', redirectTo: 'auth/sign-in' },
  {
    path: '**',
    title: 'Page not found · CareVerity',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
