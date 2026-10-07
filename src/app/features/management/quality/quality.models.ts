export interface AssessmentField {
  id: string;
  label: string;
  options?: string[];
}
export interface AssessmentTemplate {
  id: string;
  title: string;
  category: 'Care assessments' | 'Quality assurance' | 'People & training';
  subject: 'client' | 'staff' | 'service';
  icon: string;
  tone: string;
  description: string;
  fields: AssessmentField[];
}
const risk = ['Low', 'Medium', 'High', 'Not applicable'];
const check = ['Yes', 'No', 'Not applicable'];
const quality = ['Good', 'Requires improvement', 'Urgent concern', 'Not applicable'];
const competence = ['Competent', 'Needs development', 'Not observed'];
export const ASSESSMENT_TEMPLATES: AssessmentTemplate[] = [
  {
    id: 'handling',
    title: 'Moving and handling assessment',
    category: 'Care assessments',
    subject: 'client',
    icon: 'accessibility_new',
    tone: 'teal',
    description: 'Record mobility, transfer risks and the agreed handling plan.',
    fields: [
      { id: 'bed', label: 'Getting in and out of bed', options: risk },
      { id: 'transfer', label: 'Transfers and standing', options: risk },
      { id: 'walking', label: 'Walking and moving around', options: risk },
      { id: 'stairs', label: 'Use of stairs', options: risk },
      { id: 'equipment', label: 'Use of equipment', options: risk },
      { id: 'plan', label: 'Agreed handling plan and equipment' },
    ],
  },
  {
    id: 'capacity',
    title: 'Mental capacity assessment',
    category: 'Care assessments',
    subject: 'client',
    icon: 'psychology',
    tone: 'blue',
    description: 'Record a decision-specific assessment and the assessor’s conclusion.',
    fields: [
      { id: 'decision', label: 'Specific decision being assessed' },
      { id: 'support', label: 'Support provided for this decision' },
      { id: 'understand', label: 'Understand relevant information', options: check },
      { id: 'retain', label: 'Retain relevant information', options: check },
      { id: 'weigh', label: 'Use or weigh relevant information', options: check },
      { id: 'communicate', label: 'Communicate the decision', options: check },
      {
        id: 'conclusion',
        label: 'Assessor’s conclusion',
        options: [
          'Has capacity for this decision',
          'Lacks capacity for this decision',
          'Further assessment needed',
        ],
      },
      { id: 'rationale', label: 'Reasoning and next steps' },
    ],
  },
  {
    id: 'consent',
    title: 'Agreement and consent to care',
    category: 'Care assessments',
    subject: 'client',
    icon: 'handshake',
    tone: 'purple',
    description: 'Capture accessible information, consent and the agreed care arrangements.',
    fields: [
      { id: 'scope', label: 'Care or information-sharing agreement' },
      { id: 'accessible', label: 'Information provided in an accessible format', options: check },
      { id: 'questions', label: 'Opportunity to ask questions', options: check },
      { id: 'understanding', label: 'Understanding of the proposed care recorded', options: check },
      {
        id: 'consent',
        label: 'Consent recorded',
        options: ['Given', 'Declined', 'Withdrawn', 'Pending'],
      },
      { id: 'agreement', label: 'Agreement, preferences and any limits' },
    ],
  },
  {
    id: 'needs',
    title: 'Change-of-needs review',
    category: 'Care assessments',
    subject: 'client',
    icon: 'change_circle',
    tone: 'amber',
    description: 'Review changes in care needs and record care-plan follow-up.',
    fields: [
      { id: 'trigger', label: 'Trigger and change details' },
      ...[
        'Physical health',
        'Mobility and daily living',
        'Medication',
        'Risks and safeguarding',
        'Care plan',
      ].map((label, i) => ({
        id: 'section' + i,
        label,
        options: ['Reviewed', 'Needs update', 'Not applicable'],
      })),
      { id: 'updates', label: 'Agreed care-plan updates' },
    ],
  },
  {
    id: 'spot',
    title: 'Care worker spot check',
    category: 'Quality assurance',
    subject: 'staff',
    icon: 'person_check',
    tone: 'blue',
    description: 'Observe care practice and record strengths and areas to improve.',
    fields: [
      ...[
        'Arrived on time',
        'Professional appearance',
        'Followed care plan',
        'Person-centred approach',
        'Safe and respectful practice',
        'Environment safe and appropriate',
      ].map((label, i) => ({ id: 'check' + i, label, options: check })),
      { id: 'feedback', label: 'Feedback discussed with the care worker' },
    ],
  },
  {
    id: 'visit',
    title: 'Quality visit form',
    category: 'Quality assurance',
    subject: 'service',
    icon: 'fact_check',
    tone: 'teal',
    description: 'Review the care environment, records, safety and service feedback.',
    fields: [
      { id: 'visitType', label: 'Visit type', options: ['Planned', 'Unannounced', 'Follow-up'] },
      ...[
        'Care environment',
        'Infection prevention and control',
        'Medication storage and management',
        'Food and nutrition',
        'Health and safety',
        'Care records',
        'Service-user feedback',
      ].map((label, i) => ({ id: 'area' + i, label, options: quality })),
      { id: 'feedback', label: 'Feedback and observations' },
    ],
  },
  {
    id: 'observation',
    title: 'Care practice observation',
    category: 'People & training',
    subject: 'staff',
    icon: 'visibility',
    tone: 'purple',
    description: 'Record an observation of care delivery and practical development needs.',
    fields: [
      ...[
        'Personal care delivery',
        'Communication and dignity',
        'Infection control',
        'Use of equipment',
        'Person-centred approach',
      ].map((label, i) => ({ id: 'area' + i, label, options: competence })),
      { id: 'feedback', label: 'Observation notes and feedback' },
    ],
  },
  {
    id: 'competency',
    title: 'Competency review',
    category: 'People & training',
    subject: 'staff',
    icon: 'workspace_premium',
    tone: 'green',
    description: 'Review demonstrated skills and agree a development plan.',
    fields: [
      { id: 'scope', label: 'Skills and competency scope' },
      ...[
        'Knowledge and understanding',
        'Practical demonstration',
        'Safe practice',
        'Record keeping',
      ].map((label, i) => ({ id: 'skill' + i, label, options: competence })),
      { id: 'development', label: 'Agreed development and reassessment plan' },
    ],
  },
];
export type AssessmentStatus = 'Draft' | 'Scheduled' | 'Submitted' | 'Signed off';
export interface QualityAudit {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}
export interface QualityEvidence {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  caption: string;
}
export interface Assessment {
  id: string;
  templateId: string;
  subjectId: string;
  subjectName: string;
  assessorId: string;
  assessorName: string;
  date: string;
  reviewDate: string;
  context: string;
  answers: Record<string, string>;
  outcome: string;
  recommendations: string;
  evidence: QualityEvidence[];
  signature?: { name: string; role: string; at: string; declaration: boolean };
  status: AssessmentStatus;
  revision: number;
  audit: QualityAudit[];
}
export interface CorrectiveAction {
  id: string;
  assessmentId: string;
  title: string;
  ownerId: string;
  due: string;
  priority: 'Standard' | 'High';
  status: 'Open' | 'In progress' | 'Completed';
  resolution: string;
  revision: number;
  audit: QualityAudit[];
}
export interface QualityData {
  assessments: Assessment[];
  actions: CorrectiveAction[];
}
export const emptyQuality = (): QualityData => ({ assessments: [], actions: [] });
export const templateFor = (id: string) => ASSESSMENT_TEMPLATES.find((t) => t.id === id);
export function ukDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)!.value).join('-');
}
export function dateValid(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export const assessmentOverdue = (a: Assessment, today: string) =>
  a.status !== 'Signed off' && a.date < today;
export const actionOverdue = (a: CorrectiveAction, today: string) =>
  a.status !== 'Completed' && a.due < today;

export function qualityDefaults(role: string): boolean[] {
  return [
    'Platform Owner',
    'Company Admin',
    'Registered Manager',
    'Field Supervisor',
    'Quality Assurance',
    'Compliance Officer',
    'Care Coordinator',
  ].includes(role)
    ? [true, true, true, false, true]
    : [false, false, false, false, false];
}

export function ukTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}
