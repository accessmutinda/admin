import { londonDate } from '../rota/rota.models';
import { validDate } from './care.models';
export const RISK_DOMAINS = [
  ['General', 'fact_check'],
  ['Falls & Mobility', 'directions_walk'],
  ['Moving & Handling', 'accessible'],
  ['Mental Health', 'psychology'],
  ['Behaviour / PBS', 'diversity_1'],
  ['Self-Harm / Suicide', 'health_and_safety'],
  ['Medication', 'pill'],
  ['Substance / Alcohol', 'no_drinks'],
  ['Safeguarding', 'shield'],
  ['Community / Outreach', 'groups'],
  ['Environmental / Fire', 'home'],
  ['Nutrition & Hydration', 'restaurant'],
  ['Skin / Pressure Care', 'healing'],
  ['Dysphagia / Choking', 'pulmonology'],
  ['Epilepsy / Seizures', 'neurology'],
  ['Diabetes', 'bloodtype'],
  ['Lone Working / Staff Safety', 'person_shield'],
  ['Financial Risk', 'payments'],
  ['Home Access', 'key'],
  ['Equipment Safety', 'medical_services'],
  ['Other condition-specific risks', 'clinical_notes'],
] as const;
export const DESIGNED_DOMAINS: readonly string[] = [
  'General',
  'Falls & Mobility',
  'Moving & Handling',
  'Mental Health',
  'Behaviour / PBS',
  'Medication',
  'Substance / Alcohol',
  'Community / Outreach',
  'Environmental / Fire',
];
export const HANDLING_TASKS = [
  'Turning in bed',
  'Rolling in bed',
  'Lying to sitting',
  'Repositioning in bed',
  'Getting into bed',
  'Getting out of bed',
  'Toilet / commode transfers',
  'Bath / shower transfers',
  'Sitting to standing',
  'Standing',
  'Walking',
  'Stairs',
  'Wheelchair transfers',
  'Armchair transfers',
  'Floor transfers',
  'Car / transport access',
];
export const ASSISTANCE = [
  'Independent',
  'Supervision',
  'Assistance',
  'Double-up',
  'Not Applicable',
];
export const LIKELIHOOD = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
export const SEVERITY = ['Minor', 'Moderate', 'Significant', 'Major', 'Catastrophic'];
export const REVIEW_TRIGGERS = [
  'Accident',
  'Incident',
  'Fall',
  'Medication error',
  'Safeguarding concern',
  'Hospital admission / discharge',
  'New diagnosis',
  'Change in medication',
  'Change in mobility',
  'Behaviour escalation',
  'Change of care package',
  'New equipment',
  'Significant complaint',
  'Near miss',
  'Significant change in needs',
];
export type RiskStatus = 'Draft' | 'In review' | 'Approved';
export interface RiskAction {
  id: string;
  text: string;
  owner: string;
  due: string;
  status: 'Open' | 'In progress' | 'Completed';
}
export interface HandlingTask {
  task: string;
  support: string;
  equipment: string;
  technique: string;
  notes: string;
}
export interface HandlingRisk {
  id: string;
  task: string;
  risk: string;
  level: string;
  controls: string;
}
export interface RiskAssessment {
  id: string;
  groupId: string;
  version: number;
  domain: string;
  specific: string;
  date: string;
  review: string;
  status: RiskStatus;
  likelihood: number;
  severity: number;
  residualLikelihood: number;
  residualSeverity: number;
  harmed: string[];
  fields: Record<string, string>;
  checks: string[];
  triggers: string[];
  actions: RiskAction[];
  tasks: HandlingTask[];
  handlingRisks?: HandlingRisk[];
  careArea: string;
  incidentIds: string[];
  documentIds: string[];
  visibility: { staff: boolean; family: boolean; inspector: boolean };
  author: string;
  authorId: string;
  approver: string;
  approvedAt: string;
}
export interface RiskHistory {
  at: string;
  by: string;
  action: string;
  reason: string;
  assessment: RiskAssessment;
}
export interface RiskRegister {
  revision: number;
  assessments: RiskAssessment[];
  history: RiskHistory[];
}
export function riskLevel(score: number): string {
  return score <= 4 ? 'Low' : score <= 9 ? 'Medium' : score <= 15 ? 'High' : 'Critical';
}
export function blankRisk(domain: string): RiskAssessment {
  const id = crypto.randomUUID();
  return {
    id,
    groupId: id,
    version: 1,
    domain,
    specific: '',
    date: londonDate(),
    review: '',
    status: 'Draft',
    likelihood: 1,
    severity: 1,
    residualLikelihood: 1,
    residualSeverity: 1,
    harmed: [],
    fields: {},
    checks: [],
    triggers: [],
    actions: [],
    tasks: HANDLING_TASKS.map((task) => ({
      task,
      support: '',
      equipment: '',
      technique: '',
      notes: '',
    })),
    handlingRisks: [],
    careArea: '',
    incidentIds: [],
    documentIds: [],
    visibility: { staff: false, family: false, inspector: false },
    author: '',
    authorId: '',
    approver: '',
    approvedAt: '',
  };
}
export function riskError(risk: RiskAssessment, submitting = false): string | null {
  if (!RISK_DOMAINS.some((d) => d[0] === risk.domain) || !risk.specific.trim())
    return 'Choose a risk domain and enter the specific risk.';
  if (
    ![risk.likelihood, risk.severity, risk.residualLikelihood, risk.residualSeverity].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 5,
    )
  )
    return 'Likelihood and severity must be between 1 and 5.';
  if (!validDate(risk.date)) return 'Enter an assessment date.';
  if (risk.review && (risk.review < risk.date || !validDate(risk.review)))
    return 'The review date must be on or after the assessment date.';
  if (risk.actions.some((a) => !a.text.trim() || !a.owner.trim() || !a.due || !validDate(a.due)))
    return 'Every action needs an action, owner and valid due date.';
  if (
    submitting &&
    (!risk.review ||
      !risk.harmed.length ||
      !risk.fields['description']?.trim() ||
      !risk.fields['controls']?.trim() ||
      !risk.fields['instructions']?.trim() ||
      !risk.fields['escalation']?.trim())
  )
    return 'Complete the review date, who may be harmed, description, controls, carer instructions and escalation instructions before submitting.';
  if (
    submitting &&
    risk.domain === 'Moving & Handling' &&
    risk.tasks.some((t) => !ASSISTANCE.includes(t.support))
  )
    return 'Complete the support level for every mobility task.';
  return null;
}
export function latestRisks(assessments: RiskAssessment[]): RiskAssessment[] {
  return [
    ...new Map(
      [...assessments].sort((a, b) => a.version - b.version).map((a) => [a.groupId, a]),
    ).values(),
  ];
}
