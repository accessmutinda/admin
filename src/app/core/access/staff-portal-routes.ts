const STAFF_PAGES = new Set([
  '',
  'dashboard',
  'dashboard-2',
  'journal',
  'tasks',
  'concerns',
  'service-users',
  'oversight',
  'training',
  'training/dashboard',
  'training/courses',
  'training/assessments',
  'training/certificates',
  'training/history',
  'training/refreshers',
  'training/messages',
]);

export function isConnectedStaffPortalRoute(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0].replace(/\/$/, '');
  if (path !== '/staff-portal' && !path.startsWith('/staff-portal/')) return false;
  const page = path.slice('/staff-portal'.length).replace(/^\//, '');
  return (
    STAFF_PAGES.has(page) ||
    /^concerns\/[^/]+$/.test(page) ||
    /^service-users\/[^/]+(?:\/(?:overview|allocation|communications|journal|audit))?$/.test(
      page,
    ) ||
    /^training\/courses\/[^/]+(?:\/lessons\/[^/]+)?$/.test(page) ||
    /^training\/(?:assessment|results|certificates)\/[^/]+$/.test(page)
  );
}
