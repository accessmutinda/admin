import type { PlanSection, PlanVersion } from './care-plan.models';

export type ReviewDecision = 'Pending' | 'Accepted' | 'Rejected';
export interface ReviewSource {
  id: string;
  category: string;
  title: string;
  date: string;
  author: string;
  detail: string;
  enabled: boolean;
}
export interface ReviewFinding {
  id: string;
  category: string;
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  detail: string;
  section: string;
  field: string;
  suggested: string;
  sourceIds: string[];
  decision: ReviewDecision;
  rationale: string;
}
export interface ReviewReport {
  mode: 'Demo';
  generatedAt: string;
  sources: ReviewSource[];
  findings: ReviewFinding[];
}
export interface WordingProposal {
  field: string;
  label: string;
  existing: string;
  suggested: string;
  reason: string;
  decision: ReviewDecision;
}
export const WORDING_SCENARIOS = [
  'No change',
  'Changes in needs',
  'Review discrepancies',
  'Service unavailable',
] as const;
export const REVIEW_SOURCE_CATEGORIES = [
  'Previous care plan',
  'Risk assessments',
  'Visit notes',
  'Incidents & falls',
  'Medication / eMAR',
  'Complaints',
  'Courtesy calls & feedback',
  'Professional communications',
  'Change of needs',
  'Care package',
];
const dateBefore = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

export function seededReviewReport(): ReviewReport {
  const sources: ReviewSource[] = [
    {
      id: 'previous',
      category: REVIEW_SOURCE_CATEGORIES[0],
      title: 'Previous approved care plan · v1.0',
      date: dateBefore(28),
      author: 'Demo care supervisor',
      detail:
        'Mobility wording: no recent falls. Nutrition goal: maintain regular meals. This is a fictional evidence example.',
      enabled: true,
    },
    {
      id: 'risk',
      category: REVIEW_SOURCE_CATEGORIES[1],
      title: 'Moving & handling assessment',
      date: dateBefore(14),
      author: 'Demo assessor',
      detail:
        'Keep walking routes clear; follow the assessed transfer instructions. Review if mobility changes.',
      enabled: true,
    },
    {
      id: 'fall-1',
      category: REVIEW_SOURCE_CATEGORIES[3],
      title: 'Fall incident · DEMO-FALL-01',
      date: dateBefore(8),
      author: 'Demo duty supervisor',
      detail:
        'First fictional fall recorded. Incident review and moving-and-handling follow-up requested.',
      enabled: true,
    },
    {
      id: 'fall-2',
      category: REVIEW_SOURCE_CATEGORIES[3],
      title: 'Fall incident · DEMO-FALL-02',
      date: dateBefore(3),
      author: 'Demo duty supervisor',
      detail:
        'Second fictional fall within the review period. Repeated falls require supervisor review.',
      enabled: true,
    },
    {
      id: 'visit',
      category: REVIEW_SOURCE_CATEGORIES[2],
      title: 'Lunch visit note',
      date: dateBefore(2),
      author: 'Demo carer',
      detail:
        'Meal support took longer than planned; service user requested more time to eat independently. This is a fictional example.',
      enabled: true,
    },
    {
      id: 'mar',
      category: REVIEW_SOURCE_CATEGORIES[4],
      title: 'eMAR refusal records · DEMO-MAR-01 / 02',
      date: dateBefore(1),
      author: 'Demo medication record',
      detail:
        'Two fictional medication refusals recorded. Review the documented reason, support preferences and escalation actions.',
      enabled: true,
    },
    {
      id: 'complaint',
      category: REVIEW_SOURCE_CATEGORIES[5],
      title: 'Family complaint · DEMO-COMP-01',
      date: dateBefore(6),
      author: 'Demo quality coordinator',
      detail:
        'Family reported that lunch support felt rushed. No conclusion has been made; check the visit record and agree follow-up.',
      enabled: true,
    },
    {
      id: 'feedback',
      category: REVIEW_SOURCE_CATEGORIES[6],
      title: 'Courtesy call feedback',
      date: dateBefore(5),
      author: 'Demo care coordinator',
      detail:
        'Service user would like more choice about meal preparation and to remain involved in familiar daily tasks.',
      enabled: true,
    },
    {
      id: 'professional',
      category: REVIEW_SOURCE_CATEGORIES[7],
      title: 'District nurse communication',
      date: dateBefore(4),
      author: 'Demo district nurse',
      detail:
        'Fictional communication requests monitoring of a recorded skin observation and escalation of changes.',
      enabled: true,
    },
    {
      id: 'needs',
      category: REVIEW_SOURCE_CATEGORIES[8],
      title: 'Change-of-needs record',
      date: dateBefore(2),
      author: 'Demo supervisor',
      detail:
        'Meal preparation may require additional time. Confirm with the service user and assess whether a package recommendation is needed.',
      enabled: true,
    },
    {
      id: 'package',
      category: REVIEW_SOURCE_CATEGORIES[9],
      title: 'Current lunch call pattern',
      date: dateBefore(1),
      author: 'Demo rota coordinator',
      detail:
        'Fictional lunch call: 30 minutes, single carer. Any proposed duration change must follow management approval before the live rota changes.',
      enabled: true,
    },
  ];
  const seed: Omit<ReviewFinding, 'decision' | 'rationale'>[] = [
    {
      id: 'fall-wording',
      category: 'Contradictory information',
      severity: 'High',
      title: '“No recent falls” conflicts with two incident records',
      detail:
        'Compare the previous wording with both fictional fall incidents and confirm the current position.',
      section: 'Mobility',
      field: 'situation',
      suggested:
        'Two falls are recorded in the linked review evidence. Review my mobility and agreed support with me, and update the linked falls assessment before confirming the care instructions.',
      sourceIds: ['previous', 'fall-1', 'fall-2'],
    },
    {
      id: 'repeat-falls',
      category: 'Repeated incidents / falls',
      severity: 'High',
      title: 'Repeated falls need a reviewed action',
      detail:
        'Two fictional incidents are recorded in the review period. Confirm assessment and escalation follow-up.',
      section: 'Mobility',
      field: 'risks',
      suggested:
        'Follow my current assessed mobility instructions. Record and report any further fall or change in mobility to the duty supervisor and follow the agreed escalation procedure.',
      sourceIds: ['fall-1', 'fall-2', 'risk'],
    },
    {
      id: 'refusals',
      category: 'Repeated medication refusals',
      severity: 'High',
      title: 'Two eMAR refusals need follow-up',
      detail: 'Review the recorded reasons and confirm person-centred support and escalation.',
      section: 'Medication Support',
      field: 'actions',
      suggested:
        'Ask for my consent and follow the current MAR instructions. Record any refusal, the reason I give and the support offered; notify the duty supervisor in line with the agreed escalation instructions.',
      sourceIds: ['mar'],
    },
    {
      id: 'skin-action',
      category: 'Risks without actions',
      severity: 'High',
      title: 'Link the skin observation to an escalation action',
      detail:
        'The fictional professional communication should be reflected in the personal-care instructions.',
      section: 'Personal Care',
      field: 'risks',
      suggested:
        'Monitor the recorded skin observation as agreed with the professional involved. Document changes and contact the duty supervisor for review and escalation.',
      sourceIds: ['professional'],
    },
    {
      id: 'goal-date',
      category: 'Goals without review dates',
      severity: 'Medium',
      title: 'Confirm the nutrition goal review date',
      detail:
        'Ensure the goal has a review date after the change-of-needs discussion. Open the care area to set the agreed date.',
      section: 'Nutrition & Hydration',
      field: 'goal',
      suggested:
        'I want to remain involved in choosing and preparing familiar meals, with the support and time agreed during my review.',
      sourceIds: ['previous', 'needs', 'feedback'],
    },
    {
      id: 'package-time',
      category: 'Care-package inconsistencies',
      severity: 'Medium',
      title: 'Meal-support needs may exceed the example call duration',
      detail:
        'Compare the 30-minute fictional package with visit notes and the change-of-needs record. A recommendation does not update the live rota.',
      section: 'Call Package',
      field: 'changes',
      suggested:
        'Review whether my lunch call allows enough time for the agreed support. Submit any proposed change through the care-package approval process before updating the live rota.',
      sourceIds: ['visit', 'needs', 'package'],
    },
    {
      id: 'preferences',
      category: 'Changes in needs',
      severity: 'Medium',
      title: 'Reflect meal choice and independence in the plan',
      detail:
        'The fictional feedback and complaint identify a preference to review with the service user.',
      section: 'Nutrition & Hydration',
      field: 'preferences',
      suggested:
        'Offer me a choice of familiar meals and allow time for me to take part at my own pace. Check my recorded food preferences and tell the supervisor if the agreed call cannot meet my needs.',
      sourceIds: ['visit', 'feedback', 'complaint'],
    },
    {
      id: 'communication-review',
      category: 'Out-of-date sections',
      severity: 'Low',
      title: 'Reconfirm communication preferences at this review',
      detail:
        'Check that the previous plan still reflects the service user’s wishes and preferred way of communicating.',
      section: 'Communication',
      field: 'changes',
      suggested:
        'Confirm my preferred way of communicating with me at this review. Record any changes and share the approved practical instructions with my carers.',
      sourceIds: ['previous', 'feedback'],
    },
    {
      id: 'missing-escalation',
      category: 'Missing information',
      severity: 'Medium',
      title: 'Confirm who to contact if needs change',
      detail:
        'The change-of-needs record needs a clear care-plan follow-up and contact instruction.',
      section: 'Daily Routine',
      field: 'actions',
      suggested:
        'Discuss changes in my needs with me, document what has changed and contact the duty supervisor to review my agreed care instructions.',
      sourceIds: ['needs'],
    },
  ];
  return {
    mode: 'Demo',
    generatedAt: new Date().toISOString(),
    sources,
    findings: seed.map((f) => ({ ...f, decision: 'Pending', rationale: '' })),
  };
}

export function wordingExample(
  section: PlanSection,
  scenario: string,
  fields: readonly (readonly [string, string])[],
): { transcript: string; proposals: WordingProposal[] } {
  const changed = scenario === 'Changes in needs';
  const discrepancy = scenario === 'Review discrepancies';
  const mobility = section.name === 'Mobility';
  const nutrition = section.name === 'Nutrition & Hydration';
  const transcript = discrepancy
    ? 'The previous plan says no recent falls, but the review evidence includes two fall incidents. Please flag this for the supervisor and review the mobility support before confirming the wording.'
    : mobility
      ? changed
        ? 'I want to stay as independent as possible, but I would like my mobility support reviewed after a recent change. Please follow my assessed instructions, keep the route clear and allow me time.'
        : 'There has been no change in my mobility since the last review. I want to remain independent. Please follow my current assessed instructions and allow me to move at my own pace.'
      : nutrition
        ? 'I would like to choose familiar meals and take part in preparation. Please allow me enough time, follow my recorded food preferences and record my food and fluid intake.'
        : 'I want to do as much as possible independently. Please explain each step, ask for my consent and allow me time to make choices. Review any changes with me and report concerns to the duty supervisor.';
  const content: Record<string, string> = {
    situation: discrepancy
      ? 'The previous wording and linked fall incidents require supervisor review before confirming my current mobility needs.'
      : changed
        ? `My ${section.name.toLowerCase()} support needs have changed and should be reviewed with me before revised instructions are approved.`
        : `No change was reported in this fictional ${section.name.toLowerCase()} review. Confirm that my current assessed support remains appropriate.`,
    assistance: nutrition
      ? 'Offer me a choice of meals, support preparation at my pace and record my food and fluid intake.'
      : 'Explain the planned support, obtain my consent, follow the current assessed instructions and offer help at my pace.',
    strengths:
      'Encourage me to do the parts of the task I can manage and allow time for me to make decisions.',
    preferences: nutrition
      ? 'Respect my recorded food preferences and my choice of familiar meals.'
      : 'Ask what I would like to do myself and respect my choices and preferred routine.',
    goal: nutrition
      ? 'Remain involved in choosing and preparing meals with the agreed support.'
      : 'Maintain my independence while receiving the support agreed with me.',
    risks:
      'Record changes or concerns and contact the duty supervisor for review. Follow the current risk assessment and escalation instructions.',
    actions:
      'Agree the support with me, follow my current assessed instructions, record the care provided and report changes for supervisor review.',
    changes: discrepancy
      ? 'Review the two fictional fall incidents against the previous care-plan wording before approval.'
      : changed
        ? 'A change in needs was reported in this fictional review; confirm the assessment, care instructions and review date.'
        : 'No change reported in this fictional review; confirm with the service user before completing the section.',
  };
  return {
    transcript,
    proposals: fields
      .filter(([key]) => key in content)
      .map(([field, label]) => ({
        field,
        label,
        existing: section.fields[field] || '',
        suggested: content[field],
        reason:
          'Seeded person-centred wording for the selected demo scenario. Confirm against the transcript and linked evidence.',
        decision: 'Pending',
      })),
  };
}
export function visibleReviewFindings(report: ReviewReport, severity = 'All', decision = 'All') {
  const enabled = new Set(report.sources.filter((s) => s.enabled).map((s) => s.id));
  return report.findings.filter(
    (f) =>
      f.sourceIds.every((id) => enabled.has(id)) &&
      (severity === 'All' || f.severity === severity) &&
      (decision === 'All' || f.decision === decision),
  );
}
