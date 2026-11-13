import { isConnectedStaffPortalRoute } from './staff-portal-routes';

describe('Connected staff portal destinations', () => {
  it.each([
    '/staff-portal',
    '/staff-portal/dashboard',
    '/staff-portal/dashboard-2?source=bookmark#tasks',
    '/staff-portal/journal?entry=message',
    '/staff-portal/tasks?task=task',
    '/staff-portal/concerns',
    '/staff-portal/concerns/concern',
    '/staff-portal/service-users',
    '/staff-portal/service-users/client',
    '/staff-portal/service-users/client/overview',
    '/staff-portal/service-users/client/communications',
    '/staff-portal/service-users/client/journal',
    '/staff-portal/service-users/client/allocation',
    '/staff-portal/service-users/client/audit',
    '/staff-portal/oversight?activity=all',
    '/staff-portal/training',
    '/staff-portal/training/dashboard',
    '/staff-portal/training/courses',
    '/staff-portal/training/courses/course',
    '/staff-portal/training/courses/course/lessons/lesson',
    '/staff-portal/training/assessments',
    '/staff-portal/training/assessment/attempt',
    '/staff-portal/training/results/attempt',
    '/staff-portal/training/history',
    '/staff-portal/training/certificates',
    '/staff-portal/training/certificates/certificate',
    '/staff-portal/training/refreshers',
    '/staff-portal/training/messages?message=message',
  ])('recognises %s as a server-verified staff screen', (path) =>
    expect(isConnectedStaffPortalRoute(path)).toBe(true),
  );
  it.each([
    '/manage/clients',
    '/staff-portal/unconnected',
    '/staff-portal/service-users/client/private',
    '/staff-portal/training/unknown',
    '/staff-portal/training/courses/course/not-a-lesson',
    '/staff-portal/training/messages/private',
    '/staff-portal-other/tasks',
  ])('retains route enforcement for %s', (path) =>
    expect(isConnectedStaffPortalRoute(path)).toBe(false),
  );
});
