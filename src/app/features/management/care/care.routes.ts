import { Routes } from '@angular/router';
export const CARE_ROUTES: Routes = [
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
  ...['journal', 'communications'].map((careSection) => ({
    path: careSection,
    data: { careSection },
    title:
      (careSection === 'journal' ? 'Client journal' : 'Professional communications') +
      ' · CareVerity',
    canDeactivate: [(c: { canLeave: () => boolean }) => c.canLeave()],
    loadComponent: () => import('./care-communications').then((m) => m.CareCommunications),
  })),
  ...['contacts', 'documents', 'family', 'audit'].map((careSection) => ({
    path: careSection,
    data: { careSection },
    title: 'Service user record · CareVerity',
    canDeactivate: [(c: { canLeave: () => boolean }) => c.canLeave()],
    loadComponent: () => import('./care-records').then((m) => m.CareRecords),
  })),
];
