import { Routes } from '@angular/router';
const leave = (c: { canLeave: () => boolean }) => c.canLeave();
export const PORTAL_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  ...['dashboard', 'oversight'].map((view) => ({
    path: view,
    title:
      (view === 'dashboard' ? 'Staff dashboard' : 'Manager communication oversight') +
      ' · CareVerity',
    data: { portalView: view },
    canDeactivate: [leave],
    loadComponent: () => import('./portal-dashboard').then((m) => m.PortalDashboard),
  })),
  {
    path: 'journal',
    title: 'Staff journal & communications · CareVerity',
    canDeactivate: [leave],
    loadComponent: () => import('../journal/staff-journal').then((m) => m.StaffJournal),
  },
  {
    path: 'tasks',
    title: 'Staff profile & tasks · CareVerity',
    canDeactivate: [leave],
    loadComponent: () => import('./portal-tasks').then((m) => m.PortalTasks),
  },
  {
    path: 'concerns',
    title: 'Staff concerns · CareVerity',
    canDeactivate: [leave],
    loadComponent: () => import('./portal-concerns').then((m) => m.PortalConcerns),
  },
  {
    path: 'concerns/:concernId',
    title: 'Staff concern investigation · CareVerity',
    canDeactivate: [leave],
    loadComponent: () => import('./portal-concerns').then((m) => m.PortalConcerns),
  },
  {
    path: 'service-users',
    title: 'Staff portal service users · CareVerity',
    loadComponent: () => import('./portal-clients').then((m) => m.PortalClients),
  },
  {
    path: 'service-users/:id',
    loadComponent: () => import('./portal-client-shell').then((m) => m.PortalClientShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        title: 'Service user communication overview · CareVerity',
        loadComponent: () => import('./portal-client-overview').then((m) => m.PortalClientOverview),
      },
      {
        path: 'communications',
        title: 'Professional communications & contacts · CareVerity',
        canDeactivate: [leave],
        loadComponent: () => import('./portal-communications').then((m) => m.PortalCommunications),
      },
      {
        path: 'journal',
        title: 'Client journal · CareVerity',
        canDeactivate: [leave],
        loadComponent: () => import('./portal-client-journal').then((m) => m.PortalClientJournal),
      },
      {
        path: 'allocation',
        title: 'Client allocation & follow-up · CareVerity',
        canDeactivate: [leave],
        loadComponent: () => import('./portal-allocation').then((m) => m.PortalAllocation),
      },
      {
        path: 'audit',
        title: 'Audit trail & communication timeline · CareVerity',
        loadComponent: () => import('./portal-client-audit').then((m) => m.PortalClientAudit),
      },
    ],
  },
];
