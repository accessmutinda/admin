import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
export const CARE_ROUTES: Routes = [
  {
    path: 'risks',
    title: 'Risk Assessments · CareVerity',
    canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
    loadComponent: () => import('./risk-assessments').then((m) => m.RiskAssessments),
  },
  ...(['incidents', 'feedback'] as const).map((careEventSection) => ({
    path: careEventSection,
    data: { careEventSection },
    title: 'Service User records · CareVerity',
    canDeactivate: [(component: { canLeave: () => boolean }) => component.canLeave()],
    loadComponent: () => import('./care-events').then((m) => m.CareEvents),
  })),

  {
    path: 'care-plan',
    redirectTo: ({ params, queryParams }) =>
      inject(Router).createUrlTree(['/manage/care-plans', params['id']], { queryParams }),
  },
  {
    path: '',
    title: 'Service user profile · CareVerity',
    canDeactivate: [(c: { canLeave: () => boolean }) => c.canLeave()],
    loadComponent: () => import('../clients/client-files').then((m) => m.ClientFiles),
  },
  {
    path: 'medication',
    title: 'Medication & MAR · CareVerity',
    canDeactivate: [(c: { canLeave: () => boolean }) => c.canLeave()],
    loadComponent: () => import('./medication').then((m) => m.Medication),
  },
  {
    path: 'visits',
    title: 'Visits & Allocation · CareVerity',
    canDeactivate: [(c: { canLeave: () => boolean }) => c.canLeave()],
    loadComponent: () => import('./visit-planner').then((m) => m.VisitPlanner),
  },
  {
    path: 'visit-notes',
    title: 'Care Visit Notes · CareVerity',
    canDeactivate: [(c: { canLeave: () => boolean }) => c.canLeave()],
    loadComponent: () => import('./visit-notes').then((m) => m.VisitNotes),
  },
  ...['journal', 'communications'].map((careSection) => ({
    path: careSection,
    data: { careSection },
    title:
      (careSection === 'journal' ? 'Client journal' : 'Professional communications') +
      ' · CareVerity',
    canDeactivate: [(c: { canLeave: () => boolean }) => c.canLeave()],
    loadComponent: () => import('./care-communications').then((m) => m.CareCommunications),
  })),
  {
    path: 'documents',
    title: 'Documents · CareVerity',
    canDeactivate: [(c: { canLeave: () => boolean }) => c.canLeave()],
    loadComponent: () => import('./care-documents').then((m) => m.CareDocuments),
  },
  ...['contacts', 'family', 'audit'].map((careSection) => ({
    path: careSection,
    data: { careSection },
    title: 'Service user record · CareVerity',
    canDeactivate: [(c: { canLeave: () => boolean }) => c.canLeave()],
    loadComponent: () => import('./care-records').then((m) => m.CareRecords),
  })),
];
