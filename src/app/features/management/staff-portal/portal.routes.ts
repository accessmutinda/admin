import { ACADEMY_STAFF_ROUTES } from '../learning/academy/academy.routes';
import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { PortalService } from './portal.service';
import { StaffDashboardApi } from './staff-dashboard-api.service';
import { JournalService, STAFF_JOURNAL } from '../journal/journal.service';
const leave = (c: { canLeave: () => boolean }) => c.canLeave();
export const PORTAL_ROUTES: Routes = [
  ...ACADEMY_STAFF_ROUTES,
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard-2',
    pathMatch: 'full',
    redirectTo: ({ queryParams, fragment }) =>
      inject(Router).createUrlTree(['/staff-portal/dashboard'], {
        queryParams,
        fragment: fragment ?? undefined,
      }),
  },
  ...['dashboard', 'oversight'].map((view) => ({
    path: view,
    providers:
      view === 'dashboard'
        ? [
            { provide: PortalService, useExisting: StaffDashboardApi },
            JournalService,
            { provide: STAFF_JOURNAL, useValue: true },
          ]
        : [],
    title:
      (view === 'oversight' ? 'Manager communication oversight' : 'Staff dashboard') +
      ' · CareVerity',
    data: { portalView: view },
    canDeactivate: [leave],
    loadComponent: () => import('./portal-dashboard').then((m) => m.PortalDashboard),
  })),
  {
    path: 'journal',
    providers: [JournalService, { provide: STAFF_JOURNAL, useValue: true }],
    title: 'Staff journal & communications · CareVerity',
    canDeactivate: [leave],
    loadComponent: () => import('../journal/staff-journal').then((m) => m.StaffJournal),
  },
  {
    path: 'tasks',
    providers: [PortalService, JournalService, { provide: STAFF_JOURNAL, useValue: true }],
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
