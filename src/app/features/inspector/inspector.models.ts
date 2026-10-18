export const QUESTIONS = [
  { key: 'Safe', icon: 'shield', color: '#00a34e' },
  { key: 'Effective', icon: 'settings', color: '#008afa' },
  { key: 'Caring', icon: 'favorite', color: '#008d9f' },
  { key: 'Responsive', icon: 'groups', color: '#0066ac' },
  { key: 'Well-led', icon: 'bar_chart', color: '#8138cf' },
] as const;
export type Question = (typeof QUESTIONS)[number]['key'];
export const RATINGS = [
  'Not assessed',
  'Outstanding',
  'Good',
  'Requires improvement',
  'Inadequate',
];
export const CATEGORIES = [
  'Policies',
  'Procedures',
  'Staffing Records',
  'Training Certificates',
  'Care Plan Samples',
  'MAR Records',
  'Audits',
  'Incident Records',
  'Contracts',
  'Insurance',
  'Business Continuity',
  'Data Protection',
];
export const INSPECTOR_PAGES = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    icon: 'home',
    description: 'Evidence coverage, review priorities and inspection preparation.',
  },
  {
    path: 'provider',
    label: 'Provider Profile',
    icon: 'domain',
    description: 'Registration, service locations and provider information.',
  },
  {
    path: 'service-users',
    label: 'Service Users',
    icon: 'group',
    description: 'Review person-centred care records, risks and outcomes.',
  },
  {
    path: 'staffing',
    label: 'Staffing',
    icon: 'groups',
    description: 'Workforce records, verified checks and training evidence.',
  },
  {
    path: 'medication',
    label: 'Medication',
    icon: 'medication',
    description: 'Prescriptions, administration records and medication oversight.',
  },
  {
    path: 'incidents',
    label: 'Incidents & Safeguarding',
    icon: 'health_and_safety',
    description: 'Recorded concerns, incidents and organisational response.',
  },
  {
    path: 'quality',
    label: 'Quality & Compliance',
    icon: 'check_circle',
    description: 'Quality assessments, corrective actions and evidence mapping.',
  },
  {
    path: 'documents',
    label: 'Documents & Evidence',
    icon: 'description',
    description: 'Find, review and build a pack of inspection evidence.',
  },
  {
    path: 'visits',
    label: 'Visit Monitoring',
    icon: 'event_available',
    description: 'Published visits, recorded attendance and allocation oversight.',
  },
  {
    path: 'reports',
    label: 'Reports',
    icon: 'bar_chart',
    description: 'Review findings, recommend ratings and prepare an inspection report.',
  },
  {
    path: 'notes',
    label: 'Inspector Notes',
    icon: 'edit_note',
    description: 'Record observations and connect findings to source evidence.',
  },
] as const;
export interface InspectorDocument {
  id: string;
  name: string;
  category: string;
  questions: Question[];
  owner: string;
  updated: string;
  version: string;
  expiry: string;
  status: string;
  content: string;
  source: string;
}
export interface InspectorFinding {
  id: string;
  question: Question;
  type: 'Strength' | 'Concern' | 'Required action';
  text: string;
  owner: string;
  due: string;
  status: 'Open' | 'In progress' | 'Completed';
  evidenceIds: string[];
  at: string;
  by: string;
}
export interface InspectionDraft {
  revision: number;
  type: string;
  start: string;
  end: string;
  ratings: Record<string, string>;
  notes: Record<string, string>;
  summary: string;
  findings: InspectorFinding[];
  updated: string;
  by: string;
}
export interface InspectorData {
  documents: InspectorDocument[];
  draft: InspectionDraft;
}
export const emptyInspection = (): InspectorData => ({
  documents: [],
  draft: {
    revision: 0,
    type: 'CQC review',
    start: '',
    end: '',
    ratings: {},
    notes: {},
    summary: '',
    findings: [],
    updated: '',
    by: '',
  },
});
export function documentStatus(
  document: Pick<InspectorDocument, 'status' | 'expiry'>,
  today: string,
): string {
  if (document.expiry && document.expiry < today) return 'Expired';
  if (document.expiry && (Date.parse(document.expiry) - Date.parse(today)) / 86400000 <= 30)
    return 'Review due';
  return document.status;
}
export function csv(rows: unknown[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let text = String(value ?? '');
          if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
          return '"' + text.replaceAll('"', '""') + '"';
        })
        .join(','),
    )
    .join('\r\n');
}
export function safeFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .replace(/^\.+/, '_')
      .slice(0, 150) || 'document'
  );
}
