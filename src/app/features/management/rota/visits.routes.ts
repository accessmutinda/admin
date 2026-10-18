import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

export const VISITS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: ({ queryParams }) =>
      inject(Router).createUrlTree(
        [
          '/manage/rota/' +
            (queryParams['client']
              ? 'call-packages'
              : queryParams['staff']
                ? 'planner'
                : 'overview'),
        ],
        { queryParams },
      ),
  },
  {
    path: 'overview',
    title: 'Visits & Rota · CareVerity',
    loadComponent: () => import('./visits-workspace').then((m) => m.VisitsLanding),
  },
  {
    path: 'live',
    pathMatch: 'full',
    redirectTo: ({ queryParams }) => inject(Router).createUrlTree(['/manage/ecm'], { queryParams }),
  },
  {
    path: 'planner',
    data: { module: 'Care delivery', visitsWorkspace: true },
    title: 'Schedule · CareVerity',
    canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
    loadComponent: () => import('../care/visit-planner').then((m) => m.VisitPlanner),
  },
  ...['call-packages', 'publishing', 'history'].map((section) => ({
    path: section,
    data: { module: 'Care delivery', rotaSection: section, visitsWorkspace: true },
    title: 'Visits & Rota · CareVerity',
    canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
    loadComponent: () => import('./rota').then((m) => m.Rota),
  })),
];
