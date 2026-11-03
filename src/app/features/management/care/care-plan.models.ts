import { RotaCall, RotaClient } from '../rota/rota.models';

export const PLAN_SECTIONS = [
  'About Me',
  'Personal Care',
  'Mobility',
  'Nutrition & Hydration',
  'Continence',
  'Dressing & Grooming',
  'Communication',
  'Mental Health / Behaviour',
  'Medication Support',
  'Environment & Home Safety',
  'Social & Community Support',
  'Daily Routine',
  'Cultural / Religious Needs',
  'Managing Money',
  'End of Life',
  'Home Access & Security',
  'Call Package',
];
export const DEMO_CARE_AREAS = PLAN_SECTIONS.slice(0, 3);
export const DEFERRED_CARE_AREAS = PLAN_SECTIONS.slice(3);
export const DEMO_APPROVAL_LABEL = 'Demo approval — 14 care areas deferred';
export function inReviewScope(p: PlanVersion, section: PlanSection) {
  return p.demoScope !== 'available-sections' || DEMO_CARE_AREAS.includes(section.name);
}
export interface PackageHandoff {
  id: string;
  versionId: string;
  version: string;
  proposal: string;
  status: 'Authorised' | 'Awaiting rota update' | 'Completed';
  note: string;
  events: PlanEvent[];
}
export interface VisitEvidenceReview {
  evidenceId: string;
  by: string;
  at: string;
  reflection: string;
}
export const PLAN_FIELDS = [
  ['situation', 'Current situation with regard to my needs'],
  ['assistance', 'What assistance is required'],
  ['equipment', 'Equipment / aids required'],
  ['strengths', 'My strengths and independence'],
  ['preferences', 'My preferences, wishes and choices'],
  ['goal', 'Desired outcome / goal'],
  ['risks', 'Risks and escalation instructions'],
  ['actions', 'How the outcome will be achieved'],
  ['changes', 'Changes since last review'],
] as const;
export const ABOUT_ME_FIELDS = [
  ['background', 'My background and life story'],
  ['family', 'My family and important relationships'],
  ['culture', 'My cultural and religious needs'],
  ['lifestyle', 'My interests and lifestyle'],
  ['matters', 'What matters most to me'],
] as const;
export interface PlanSection {
  name: string;
  required: boolean;
  complete: boolean;
  fields: Record<string, string>;
  review: string;
  visibility: { staff: boolean; family: boolean; inspector: boolean };
}
export interface BodyObservation {
  id: string;
  view: 'Front' | 'Back';
  x: number;
  y: number;
  location: string;
  type: string;
  description: string;
  size: string;
  pain: string;
  date: string;
  issue: string;
  action: string;
  professional: string;
  photo: string;
  related: string;
  status: 'Open' | 'Monitoring' | 'Resolved';
  history: { at: string; by: string; detail: string }[];
}
export interface PlanAssessment {
  fields?: Record<string, string>;
  id: string;
  name: string;
  section: string;
  findings: string;
  action: string;
  review: string;
  status: 'Recommended' | 'In progress' | 'Completed';
}
export interface PlanEvent {
  at: string;
  by: string;
  action: string;
  detail: string;
}
export interface PlanVersion {
  demoScope?: 'available-sections';
  demoSignature?: { name: string; userId: string; at: string; label: 'Demonstration signature' };
  visitEvidenceReviews?: VisitEvidenceReview[];
  id: string;
  version: string;
  status: 'Draft' | 'In review' | 'Approved' | 'Superseded';
  contributors?: string[];
  author: string;
  authorId: string;
  reviewer: string;
  approver: string;
  approvedAt: string;
  createdAt: string;
  packageSnapshot: RotaCall[];
  documentSnapshot: { name: string; version: string }[];
  review: string;
  confirmed: boolean;
  details: Record<string, string>;
  participation: Record<string, string>;
  capacity: Record<string, string>;
  packageDecision: string;
  packageProposal: string;
  packageStatus: string;
  sections: PlanSection[];
  body: BodyObservation[];
  assessments: PlanAssessment[];
  events: PlanEvent[];
  qualityReview: string;
  reviewReport?: import('./care-plan-review.models').ReviewReport;
}
export interface CarePlanRecord {
  packageHandoffs?: PackageHandoff[];
  revision: number;
  versions: PlanVersion[];
}
export function planDetails(c: RotaClient): Record<string, string> {
  const f = c.file;
  return {
    clientId: c.reference,
    postcode: c.postcode,
    mobile: f?.details['mobile'] || '',
    name: c.name,
    preferred: f?.details['preferredName'] || '',
    gender: f?.details['gender'] || '',
    ethnicity: f?.details['ethnicity'] || '',
    marital: f?.details['marital'] || '',
    dob: f?.details['dob'] || '',
    nhs: f?.details['nhs'] || '',
    address: c.address + ', ' + c.postcode,
    phone: c.phone || '',
    email: c.email || '',
    language: f?.details['language'] || '',
    religion: f?.details['religion'] || '',
    allergies: (f?.entries['allergies'] || []).map((e) => e.name + ': ' + e.detail).join('; '),
    risks: (c.riskFlags || []).join('; '),
    access: Object.values(f?.sections['access'] || {}).join('; '),
    contacts:
      (f?.contacts || [])
        .map((p) => `${p.type}: ${p.name} (${p.relationship}) ${p.phone}`)
        .join('\n') +
      (f?.details['gp'] ? '\nGP / practice: ' + f.details['gp'] : '') +
      (c.representative
        ? `\nRepresentative: ${c.representative.name} (${c.representative.relationship}) ${c.representative.phone}`
        : ''),
  };
}
const fValue = (c: RotaClient, key: string) => c.file?.details[key] || '';
export function seedCarePlan(c: RotaClient): CarePlanRecord {
  const date = new Date().toISOString().slice(0, 10);
  const review = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const previous = c.file?.sections['plan'];
  const sections: PlanSection[] = PLAN_SECTIONS.map((name) => ({
    name,
    required: true,
    complete: false,
    review,
    visibility: { staff: true, family: false, inspector: false },
    fields: Object.fromEntries(PLAN_FIELDS.map(([key]) => [key, ''])),
  }));
  sections[0].fields = {
    ...sections[0].fields,
    situation: previous?.['needs'] || c.file?.details['living'] || '',
    assistance: previous?.['support'] || '',
    preferences: c.file?.sections['support']?.['preferences'] || '',
  };
  sections[0].fields['background'] = fValue(c, 'about');
  sections[0].fields['family'] = (c.file?.contacts || [])
    .filter((p) => p.type === 'Family')
    .map((p) => p.name + ' · ' + p.relationship)
    .join('; ');
  sections[0].fields['culture'] = fValue(c, 'religion');
  sections[0].fields['lifestyle'] = [fValue(c, 'likes'), fValue(c, 'dislikes')]
    .filter(Boolean)
    .join('; ');
  sections[0].fields['matters'] = fValue(c, 'about');
  sections[2].fields = {
    ...sections[2].fields,
    assistance: c.file?.sections['moving']?.['support'] || '',
    equipment: c.file?.sections['moving']?.['equipment'] || '',
    actions: c.file?.sections['moving']?.['instructions'] || '',
  };
  sections[8].fields['situation'] = (c.file?.medications || [])
    .map((m) => `${m.name} · ${m.support}`)
    .join('; ');
  sections[15].fields['situation'] = Object.values(c.file?.sections['access'] || {}).join('; ');
  return {
    revision: 0,
    versions: [
      {
        id: crypto.randomUUID(),
        version: '1.0',
        status: 'Draft',
        author: '',
        authorId: '',
        reviewer: '',
        approver: '',
        approvedAt: '',
        createdAt: date,
        packageSnapshot: [],
        documentSnapshot: (c.file?.documents || [])
          .filter((d) => !d.deletedAt)
          .map((d) => ({ name: d.name, version: d.version })),
        review,
        confirmed: false,
        details: planDetails(c),
        participation: {
          source: 'Service user',
          involvement: 'Fully',
          name: '',
          relationship: '',
          reason: '',
          authority: '',
        },
        capacity: {
          concerns: 'Not recorded',
          decision: '',
          assessment: '',
          welfare: c.file?.sections['capacity']?.['welfareLpa'] || '',
          finance: c.file?.sections['capacity']?.['financeLpa'] || '',
          deputy: '',
          bestInterests: '',
        },
        packageDecision: 'Not reviewed',
        packageProposal: '',
        packageStatus: 'Not requested',
        sections,
        body: [],
        assessments: [],
        events: [],
        qualityReview: '',
      },
    ],
  };
}
export const planDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value + 'T12:00:00Z')) &&
  new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
export function sectionError(s: PlanSection): string {
  if (!s.required) return '';
  for (const key of [
    'situation',
    'assistance',
    'strengths',
    'preferences',
    'goal',
    'risks',
    'actions',
  ])
    if (!s.fields[key]?.trim())
      return `${s.name}: complete ${PLAN_FIELDS.find((f) => f[0] === key)?.[1]}.`;
  if (!planDate(s.review)) return `${s.name}: enter a valid review date.`;
  return '';
}
export function planIssues(
  p: PlanVersion,
  c: RotaClient,
  calls: RotaCall[] = p.packageSnapshot,
): string[] {
  const issues: string[] = [];
  if (!p.confirmed)
    issues.push('Confirm the information brought forward from the service-user record.');
  if (!p.participation['involvement'] || !p.participation['source'])
    issues.push('Record participation and the information source.');
  if (
    p.participation['source'] !== 'Service user' &&
    ['name', 'relationship', 'reason', 'authority'].some((k) => !p.participation[k]?.trim())
  )
    issues.push('Complete the representative name, role, reason and authority.');
  if (p.capacity['concerns'] === 'Not recorded' || !p.capacity['decision'].trim())
    issues.push('Record capacity concerns and the specific care decision.');
  if (
    p.capacity['concerns'] === 'Yes' &&
    (!p.capacity['assessment'].trim() || !p.capacity['bestInterests'].trim())
  )
    issues.push(
      'Record the capacity assessment and best-interest decision or explain why it is not applicable.',
    );
  if (!['No change', 'Change required'].includes(p.packageDecision))
    issues.push('Review the current call package.');
  if (p.packageDecision === 'Change required' && !p.packageProposal.trim())
    issues.push('Describe the proposed package change.');
  for (const s of p.sections.filter((section) => inReviewScope(p, section))) {
    const error = sectionError(s);
    if (error) issues.push(error);
    if (s.required && !s.complete)
      issues.push(`${s.name}: mark the section complete after review.`);
    if (s.required && s.review < new Date().toISOString().slice(0, 10))
      issues.push(`${s.name}: review date is overdue.`);
  }
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const evidence = (c.file?.entries['incidents'] || []).filter((e) => e.date >= cutoff);
  if (
    p.packageDecision === 'No change' &&
    JSON.stringify(calls) !== JSON.stringify(p.packageSnapshot)
  )
    issues.push(
      'Care-package inconsistency: live calls have changed since this draft was started. Reconfirm the current package.',
    );
  const flagged = (c.file?.visitNotes || []).filter(
    (n) => n.status === 'Flagged' && n.date >= cutoff,
  );
  if (flagged.length)
    issues.push(
      `${flagged.length} recent flagged visit note(s): review possible changes in needs and escalation actions.`,
    );
  const falls = evidence.filter((e) => /fall/i.test(e.name + ' ' + e.detail));
  if (
    falls.length &&
    p.sections.some((s) =>
      /no (recent )?falls/i.test(
        [...PLAN_FIELDS, ...ABOUT_ME_FIELDS].map(([key]) => s.fields[key] || '').join(' '),
      ),
    )
  )
    issues.push(
      `Contradiction: ${falls.length} linked falls record(s); review wording that says no falls.`,
    );
  if (falls.length >= 2)
    issues.push(
      `${falls.length} falls recorded within 90 days: review the falls assessment and escalation actions.`,
    );
  const corrected = new Set(
    (c.file?.administrations || []).map((a) => a.correctionOf).filter(Boolean),
  );
  const refused =
    c.file?.administrations?.filter(
      (a) => a.outcome === 'Refused' && !corrected.has(a.id) && a.date >= cutoff,
    ) || [];
  if (refused.length >= 2)
    issues.push(
      `${refused.length} medication refusals recorded: review medication support and escalation.`,
    );
  for (const b of p.body.filter((b) => b.status !== 'Resolved' && !b.action.trim()))
    issues.push(`${b.location}: body observation requires an action.`);
  for (const a of p.assessments.filter((a) => a.status !== 'Completed'))
    issues.push(`${a.name}: linked assessment is ${a.status.toLowerCase()}.`);
  return issues;
}
export function approvedInstructions(c: RotaClient, audience: 'staff' | 'family' | 'inspector') {
  const p = c.file?.carePlan?.versions.find((v) => v.status === 'Approved');
  return (
    p?.sections
      .filter((s) => inReviewScope(p!, s) && s.required && s.visibility[audience])
      .map((s) => ({
        name: s.name,
        instructions: s.fields['assistance'],
        preferences: s.fields['preferences'],
        escalation: s.fields['risks'],
        outcome: s.fields['goal'],
        actions: s.fields['actions'],
      })) || []
  );
}
