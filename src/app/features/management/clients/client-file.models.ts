export interface ClientEntry {
  id: string;
  name: string;
  detail: string;
  date: string;
  level: 'Low' | 'Medium' | 'High';
  status: 'Active' | 'Completed' | 'Inactive';
}

export interface ClientFile {
  details: Record<string, string>;
  sections: Record<string, Record<string, string>>;
  entries: Record<string, ClientEntry[]>;
  updatedAt: string;
}

export interface ClientField {
  key: string;
  label: string;
  type?: 'date' | 'textarea';
  options?: string[];
}

export interface ClientSection {
  key: string;
  label: string;
  icon: string;
  tone: string;
  description: string;
  fields?: ClientField[];
  entryLabel?: string;
  nameLabel?: string;
  detailLabel?: string;
  risk?: boolean;
}

export const CLIENT_SECTIONS: ClientSection[] = [
  { key: 'overview', label: 'Overview', icon: 'person', tone: 'teal', description: 'The person, their priorities and the care around them.' },
  { key: 'details', label: 'Demographics & contacts', icon: 'contact_page', tone: 'blue', description: 'Personal details, preferences and people to contact.' },
  { key: 'diagnoses', label: 'Diagnoses & communication', icon: 'clinical_notes', tone: 'blue', description: 'Record known diagnoses and practical communication guidance.', entryLabel: 'diagnosis', nameLabel: 'Diagnosis', detailLabel: 'Communication needs and support', fields: [
    { key: 'communication', label: 'How to communicate with me', type: 'textarea' },
    { key: 'sensory', label: 'Hearing, sight and other support', type: 'textarea' },
  ] },
  { key: 'plan', label: 'Care plan', icon: 'assignment', tone: 'teal', description: 'A personalised plan that connects needs, goals and daily support.', entryLabel: 'goal', nameLabel: 'Care goal', detailLabel: 'Interventions and expected outcome', fields: [
    { key: 'name', label: 'Care plan name' }, { key: 'start', label: 'Start date', type: 'date' },
    { key: 'review', label: 'Review date', type: 'date' }, { key: 'status', label: 'Plan status', options: ['Draft', 'Active', 'Archived'] },
    { key: 'needs', label: 'Care needs', type: 'textarea' }, { key: 'support', label: 'How to support me', type: 'textarea' },
  ] },
  { key: 'risks', label: 'Risk assessments', icon: 'health_and_safety', tone: 'amber', description: 'Record assessed risks, review dates and measures that reduce harm.', entryLabel: 'assessment', nameLabel: 'Risk / assessment', detailLabel: 'Findings and mitigation', risk: true },
  { key: 'moving', label: 'Moving & handling', icon: 'accessible', tone: 'blue', description: 'Practical instructions for safe mobility and transfers.', fields: [
    { key: 'assessed', label: 'Last assessed', type: 'date' }, { key: 'review', label: 'Next review', type: 'date' },
    { key: 'support', label: 'Assistance required', options: ['Independent', 'One person', 'Two people', 'Specialist assessment required'] },
    { key: 'equipment', label: 'Equipment' }, { key: 'instructions', label: 'Transfer and mobility instructions', type: 'textarea' },
  ] },
  { key: 'capacity', label: 'Mental capacity', icon: 'psychology', tone: 'purple', description: 'Record a decision-specific assessment and the support given.', entryLabel: 'assessment', nameLabel: 'Decision being assessed', detailLabel: 'Findings, decision and best interests', fields: [
    { key: 'support', label: 'Support to understand and communicate decisions', type: 'textarea' },
    { key: 'review', label: 'Next review date', type: 'date' },
  ] },
  { key: 'consent', label: 'Consent & agreements', icon: 'verified_user', tone: 'green', description: 'Capture the scope, date and source of consent. Review when circumstances change.', fields: [
    { key: 'status', label: 'Consent status', options: ['Not recorded', 'Given', 'Declined', 'Withdrawn'] },
    { key: 'date', label: 'Recorded date', type: 'date' }, { key: 'by', label: 'Given by / authority' },
    { key: 'care', label: 'Care and support', options: ['Not recorded', 'Agreed', 'Declined'] },
    { key: 'medication', label: 'Medication support', options: ['Not recorded', 'Agreed', 'Declined'] },
    { key: 'family', label: 'Sharing with family / representative', options: ['Not recorded', 'Agreed', 'Declined'] },
    { key: 'photo', label: 'Care record photography', options: ['Not recorded', 'Agreed', 'Declined'] },
    { key: 'notes', label: 'Scope, restrictions and supporting agreement', type: 'textarea' },
  ] },
  { key: 'medication', label: 'Medication profile', icon: 'medication', tone: 'purple', description: 'A medication information register. Administration is recorded through visit evidence; this is not a MAR chart.', entryLabel: 'medication', nameLabel: 'Medication and strength', detailLabel: 'Dose, route, frequency and support instructions' },
  { key: 'allergies', label: 'Allergies', icon: 'warning', tone: 'red', description: 'Record known allergies, reactions and response guidance. An empty register means not recorded.', entryLabel: 'allergy', nameLabel: 'Allergen', detailLabel: 'Reaction and response guidance', risk: true },
  { key: 'access', label: 'Key safe & access', icon: 'key', tone: 'amber', description: 'Property access instructions for authorised care staff.', fields: [
    { key: 'location', label: 'Key safe location' }, { key: 'code', label: 'Access code' },
    { key: 'checked', label: 'Last checked', type: 'date' }, { key: 'instructions', label: 'Access and emergency instructions', type: 'textarea' },
  ] },
  { key: 'tasks', label: 'Tasks & outcomes', icon: 'task_alt', tone: 'teal', description: 'Track planned care tasks and record the outcome when completed.', entryLabel: 'task', nameLabel: 'Care task', detailLabel: 'Instructions / recorded outcome' },
  { key: 'family', label: 'Family / representative', icon: 'diversity_1', tone: 'pink', description: 'Maintain contact details and define the information approved for sharing.', fields: [
    { key: 'approved', label: 'Approved information to share', type: 'textarea' }, { key: 'preferences', label: 'Contact preferences and restrictions', type: 'textarea' },
  ] },
  { key: 'documents', label: 'Documents & care summary', icon: 'description', tone: 'blue', description: 'Register supporting documents and print a care-plan summary. Document files are held outside this device demo.', entryLabel: 'document', nameLabel: 'Document name', detailLabel: 'Type, version and storage reference' },
];

export const PERSONAL_FIELDS: ClientField[] = [
  { key: 'dob', label: 'Date of birth', type: 'date' }, { key: 'gender', label: 'Gender' },
  { key: 'preferredName', label: 'Preferred name' }, { key: 'language', label: 'Preferred language' },
  { key: 'nhs', label: 'NHS number' }, { key: 'religion', label: 'Religion / beliefs' },
  { key: 'ethnicity', label: 'Ethnicity' }, { key: 'gp', label: 'GP / practice and contact' },
  { key: 'about', label: 'What matters to me', type: 'textarea' },
];

export const emptyClientFile = (): ClientFile => ({ details: {}, sections: {}, entries: {}, updatedAt: '' });

export function clientFileError(file: ClientFile): string | null {
  const dates = [file.details['dob'], ...Object.entries(file.sections).flatMap(([key, section]) =>
    (CLIENT_SECTIONS.find((s) => s.key === key)?.fields ?? []).filter((f) => f.type === 'date').map((f) => section[f.key])),
    ...Object.values(file.entries).flat().map((e) => e.date)];
  if (dates.some((d) => d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) !== d)))
    return 'Enter valid dates for this client record.';
  const plan = file.sections['plan'];
  if (plan?.['start'] && plan['review'] && plan['review'] < plan['start']) return 'The care plan review date cannot be before its start date.';
  if (Object.values(file.entries).flat().some((e) => !e.name.trim() || !['Low', 'Medium', 'High'].includes(e.level) || !['Active', 'Completed', 'Inactive'].includes(e.status)))
    return 'Give each record a name, valid priority and status.';
  return null;
}
