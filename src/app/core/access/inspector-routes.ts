export const INSPECTOR_SUBMODULES: Readonly<Record<string, string>> = {
  dashboard: 'provider',
  provider: 'provider',
  'service-users': 'clients',
  clients: 'clients',
  staffing: 'staff',
  staff: 'staff',
  medication: 'medication',
  incidents: 'incidents',
  quality: 'quality',
  documents: 'quality',
  visits: 'visits',
  reports: 'reports',
  notes: 'reports',
};
export const CONNECTED_INSPECTOR_PAGES = [
  'provider',
  'service-users',
  'staffing',
  'medication',
  'incidents',
  'quality',
] as const;
export function isConnectedInspectorPage(page: string): boolean {
  return (CONNECTED_INSPECTOR_PAGES as readonly string[]).includes(page);
}
export function inspectorEntryPath(canPath: (path: string) => boolean): string | null {
  return CONNECTED_INSPECTOR_PAGES.map((page) => '/inspector/' + page).find(canPath) ?? null;
}
