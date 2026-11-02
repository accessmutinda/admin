import { PLAN_SECTIONS } from './care-plan.models';
import type { WorkspaceTab } from './scrolling-tabs';
export const WORKSPACE_MODULES: WorkspaceTab[] = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'care-plan', label: 'Care Plan', icon: 'assignment' },
  { id: 'assessments', label: 'Assessments', icon: 'fact_check' },
  { id: 'body', label: 'Body Chart', icon: 'accessibility_new' },
  { id: 'quality', label: 'Quality Review', icon: 'verified' },
  { id: 'versions', label: 'Review History', icon: 'history' },
];
const icons = [
  'person',
  'personal_injury',
  'directions_walk',
  'restaurant',
  'wc',
  'checkroom',
  'forum',
  'psychology',
  'pill',
  'home_health',
  'diversity_3',
  'schedule',
  'temple_buddhist',
  'payments',
  'favorite',
  'key',
  'event_note',
];
export const CARE_AREA_TABS: WorkspaceTab[] = PLAN_SECTIONS.map((label, index) => ({
  id: 'area-' + index,
  label,
  icon: icons[index],
}));
export const CARE_WORKFLOW_TABS: WorkspaceTab[] = [
  { id: 'Client details', label: '1 · Client details' },
  { id: 'Participation', label: '2 · Participation' },
  { id: 'Capacity', label: '3 · Capacity' },
  { id: 'Contacts', label: '4 · Contacts' },
  { id: 'Call package', label: '5 · Care package' },
  { id: 'Care sections', label: '6 · Care areas' },
  { id: 'Quality review', label: '7 · Quality check' },
  { id: 'Versions & approval', label: '8 · Review & approval' },
];
export const STAGE_TABS: Record<string, string> = {
  overview: 'Overview',
  details: 'Client details',
  participation: 'Participation',
  capacity: 'Capacity',
  contacts: 'Contacts',
  package: 'Call package',
  sections: 'Care sections',
  body: 'Body chart',
  assessments: 'Assessments',
  quality: 'Quality review',
  versions: 'Versions & approval',
};
export const MODULE_TABS: Record<string, string> = {
  overview: 'Overview',
  'care-plan': 'Care sections',
  assessments: 'Assessments',
  body: 'Body chart',
  quality: 'Quality review',
  versions: 'Versions & approval',
};
export const moduleForTab = (tab: string) =>
  Object.keys(MODULE_TABS).find((id) => MODULE_TABS[id] === tab) || 'care-plan';

export const SERVICE_USER_RECORDS: Record<
  string,
  { label: string; path: string; section?: string }
> = {
  medication: { label: 'Medication & MAR', path: 'medication' },
  visits: { label: 'Visits & Allocation', path: 'visits' },
  'visit-notes': { label: 'Visit Notes', path: 'visit-notes' },
  documents: { label: 'Documents', path: 'documents' },
  contacts: { label: 'Contacts', path: 'contacts' },
  family: { label: 'Family Access', path: 'family' },
  risks: { label: 'Risk Assessments', path: '', section: 'risks' },
  incidents: { label: 'Incidents & Complaints', path: 'incidents' },
  feedback: { label: 'Reviews & Feedback', path: 'feedback' },
};
