import { addDays, RotaClient } from '../features/management/rota/rota.models';
import { WorkspaceData } from '../features/management/shared/management.store';
import { RiskRegister, blankRisk } from '../features/management/care/risk-assessment.models';

function riskRegisterForClient(
  client: RotaClient,
  today: string,
  clientIndex: number,
): RiskRegister {
  const examples: [string, string, number, number, number, number, string][] = [
    ['Falls & Mobility', 'Falls when using stairs', 3, 2, 2, 2, 'Mobility'],
    ['Moving & Handling', 'Safe transfers and mobility', 3, 2, 2, 2, 'Mobility'],
    ['Mental Health', 'Relapse and deterioration', 4, 5, 2, 5, 'Mental Health / Behaviour'],
    [
      'Behaviour / PBS',
      'Escalation following changes to routine',
      4,
      5,
      2,
      5,
      'Mental Health / Behaviour',
    ],
    ['Medication', 'Medication refusal', 3, 4, 2, 3, 'Medication Support'],
    ['Substance / Alcohol', 'Substance use and relapse', 4, 4, 3, 4, 'Mental Health / Behaviour'],
    ['Environmental / Fire', 'Fire and home safety', 3, 3, 2, 3, 'Environment & Home Safety'],
    [
      'Community / Outreach',
      'Safety when accessing the community',
      3,
      4,
      2,
      4,
      'Social & Community Support',
    ],
  ];
  const assessments = examples.map(
    (
      [domain, specific, likelihood, severity, residualLikelihood, residualSeverity, careArea],
      index,
    ) => {
      const r = blankRisk(domain);
      Object.assign(r, {
        specific,
        likelihood,
        severity,
        residualLikelihood,
        residualSeverity,
        careArea,
        date: addDays(today, -30),
        review: addDays(today, index === 2 ? -1 : 180),
        status: 'Approved',
        author: 'Hussein Ahmed',
        authorId: 'care-demo-risk-assessor',
        approver: 'Maria Abukar',
        approvedAt: addDays(today, -28) + 'T10:00:00Z',
        harmed: ['Service user', 'Staff'],
        visibility: { staff: true, family: false, inspector: false },
      });
      r.fields = {
        assessmentType: 'Scheduled Review',
        assessorName: 'Hussein Ahmed',
        designation: 'Manager',
        description: specific + '. Review the controls with the service user and care team.',
        circumstances: 'Support needs are reviewed with the service user and care team.',
        controls: 'Follow the individual support plan. Monitor changes and record concerns.',
        instructions:
          'Speak calmly.\nExplain changes in advance.\nGive time and space.\nFollow the approved support plan.',
        escalation:
          'Contact the office if concerns increase. Follow the individual escalation plan.',
        outcome: 'Continue current controls and actions. Review if needs or circumstances change.',
        baseline:
          'Usually calm and cooperative. Engages in conversation and makes simple decisions.',
        diagnosis:
          client.file?.sections['diagnoses']?.['primary'] || 'See the current health record.',
        triggers: 'Unexpected changes to routine. Confrontation. Crowded areas.',
        warning: 'Pacing. Raised voice. Repeated questions. Withdrawal.',
        escalating: 'Increasing agitation and difficulty engaging with support.',
        crisis: 'Follow the individual crisis plan and contact the office for support.',
        preventative: 'Give time and space. Explain changes in advance. Avoid confrontation.',
        deescalation:
          'Reduce demands. Communicate calmly. Allow space. Contact the office if escalation continues.',
        should:
          'Use calm and respectful language.\nGive space and time.\nExplain changes in advance.\nFollow the behaviour support plan.\nReport early signs of escalation.',
        mustNot:
          'Do not argue or challenge.\nDo not crowd or block exits.\nDo not use unauthorised restraint.\nDo not ignore early warning signs.',
        recovery:
          'Offer reassurance and time to recover. Record the incident and arrange a review.',
        height: '175',
        weight: '70',
        bmi: '22.9',
        mobility: 'Independently mobile',
        constraints: 'No current physical constraints recorded.',
        equipment: 'No routine equipment required.',
        independent: 'Independent for routine mobility; supervision on stairs.',
        support: 'Prompt and assist',
        types: 'Oral medication',
        monitoring: 'Record refusals and report concerns in line with the support plan.',
        property: 'Supported accommodation',
        floor: 'Ground floor',
        access: 'Secure entry system',
        pets: 'No',
        evacuation: 'Follow the agreed evacuation plan. Keep exits and walkways clear.',
      };
      const domainGuidance: Record<string, Partial<Record<string, string>>> = {
        'Falls & Mobility': {
          description:
            'Risk of a fall when using stairs or moving through areas with trip hazards.',
          controls:
            'Keep walking routes clear. Use the handrail on stairs. Allow time to mobilise.',
          instructions:
            'Keep routes clear.\nEncourage use of the handrail.\nMonitor and report changes in mobility.',
          escalation:
            'Report a fall, near miss or change in mobility to the office and follow the incident procedure.',
        },
        'Moving & Handling': {
          description:
            'Risk of injury during transfers, bathing or transport access if assessed techniques are not followed.',
          controls:
            'Follow the task-specific mobility checklist and assessed handling instructions.',
          instructions:
            'Follow the mobility checklist.\nUse the assessed technique for each transfer.\nCheck that any required equipment is available.',
          escalation:
            'Stop and contact the office if support needs change or the assessed technique cannot be followed safely.',
        },
        'Mental Health': {
          description:
            'Risk of deterioration or relapse when changes in wellbeing or medication adherence go unreported.',
          controls:
            'Regular contact with the mental-health team. Medication support. A consistent daily routine.',
          instructions:
            'Observe changes in mood or behaviour.\nFollow the agreed support plan.\nRecord and report concerns promptly.',
          escalation:
            'Contact the office and relevant professional according to the individual crisis plan.',
        },
        Medication: {
          description: 'Risk of missed medication, refusal or an administration error.',
          controls:
            'Use the current eMAR. Follow the medication support plan. Record refusals and liaise with the office.',
          instructions:
            'Follow the current MAR.\nRecord medication refusal immediately.\nReport concerns using the escalation procedure.',
          escalation:
            'Contact the office if medication is refused, missed or an error is identified. Follow the agreed medication procedure.',
        },
        'Substance / Alcohol': {
          description:
            'Risk of relapse affecting wellbeing, community safety or medication adherence.',
          controls:
            'Support access to appointments. Monitor changes in presentation. Follow the agreed substance-use support plan.',
          instructions:
            'Monitor for changes in presentation.\nSupport agreed appointments.\nRecord and report concerns.',
          escalation:
            'Inform the office of suspected use or increased concerns and follow the individual escalation plan.',
        },
        'Environmental / Fire': {
          description:
            'Risk from smoking, electrical hazards, clutter or obstructed escape routes.',
          controls:
            'Smoke alarm fitted. Regular safety checks. Keep exits clear and follow the evacuation plan.',
          instructions:
            'Keep walkways and exits clear.\nReport unsafe equipment.\nFollow the agreed fire safety and evacuation instructions.',
          escalation:
            'Report hazards to the office. Follow the evacuation procedure in a fire or emergency.',
        },
        'Community / Outreach': {
          description:
            'Risk of getting lost, exploitation or conflict when accessing the community.',
          controls:
            'Use known routes and destinations. Follow the agreed community support plan. Carry contact details.',
          instructions:
            'Follow the agreed routes and support plan.\nCarry contact details.\nReport changes in behaviour or concerns during community access.',
          escalation:
            'Inform the office if concerns arise and follow the agreed missing-person or incident procedure when applicable.',
        },
      };
      Object.assign(r.fields, domainGuidance[domain] ?? {});
      if (domain === 'Behaviour / PBS' && clientIndex === 3) {
        r.residualLikelihood = 4;
        r.residualSeverity = 4;
      }
      r.tasks.forEach((task) => {
        task.support = task.task === 'Stairs' ? 'Supervision' : 'Independent';
        task.notes = task.task === 'Stairs' ? 'Use handrail' : 'No issue';
      });
      if (domain === 'Moving & Handling')
        r.handlingRisks = [
          {
            id: crypto.randomUUID(),
            task: 'Bathing / showering',
            risk: 'Risk of slip / fall in bathroom',
            level: 'Medium',
            controls: 'Non-slip mat. Grab rails. Monitor and assist if needed.',
          },
          {
            id: crypto.randomUUID(),
            task: 'Stairs',
            risk: 'Risk of fall on stairs',
            level: 'Medium',
            controls: 'Use handrail. Encourage a slow pace.',
          },
          {
            id: crypto.randomUUID(),
            task: 'Transport',
            risk: 'Risk when getting in / out of car',
            level: 'Low',
            controls: 'Allow time. Provide support if required.',
          },
        ];
      r.incidentIds = (client.file?.entries['incidents'] ?? [])
        .slice(0, 1)
        .map((incident) => incident.id);
      r.documentIds = (client.file?.documents ?? []).slice(0, 1).map((document) => document.id);
      r.triggers = ['Incident', 'Fall', 'Significant change in needs'];
      r.actions = [
        {
          id: crypto.randomUUID(),
          text:
            domain === 'Moving & Handling'
              ? 'Ensure grab rails in bathroom are secure'
              : 'Review controls and update linked care instructions',
          owner: 'Registered Manager',
          due: addDays(today, index === 2 ? -3 : 14),
          status: index === 0 ? 'Completed' : index === 5 ? 'In progress' : 'Open',
        },
      ];
      if (domain === 'Medication')
        r.checks = ['Medication refusal', 'Incorrect dose', 'PRN medication', 'Medication storage'];
      if (domain === 'Environmental / Fire')
        r.checks = ['Fire safety', 'Clutter / trip hazards', 'Smoking'];
      return r;
    },
  );
  const history = assessments.flatMap((assessment) => [
    {
      at: assessment.date + 'T09:00:00Z',
      by: assessment.author,
      action: 'Draft',
      reason: 'Initial individual assessment',
      assessment: {
        ...structuredClone(assessment),
        status: 'Draft' as const,
        approver: '',
        approvedAt: '',
      },
    },
    {
      at: assessment.approvedAt,
      by: assessment.approver,
      action: 'Approved',
      reason: 'Controls, carer instructions and review date agreed',
      assessment: structuredClone(assessment),
    },
  ]);
  if (clientIndex < 3) {
    const draft = structuredClone(assessments[clientIndex === 0 ? 4 : 2]);
    draft.id = crypto.randomUUID();
    draft.version = 2;
    draft.status = clientIndex === 0 ? 'In review' : 'Draft';
    draft.author = 'Hussein Ahmed';
    draft.authorId = 'care-demo-risk-reviewer';
    draft.approver = '';
    draft.approvedAt = '';
    draft.date = today;
    draft.review = addDays(today, 90);
    draft.fields['outcome'] =
      'Review following a change in support needs. Check the updated controls before approval.';
    assessments.push(draft);
    history.push({
      at: today + 'T09:00:00Z',
      by: draft.author,
      action: draft.status,
      reason: 'Review following a change in support needs',
      assessment: structuredClone(draft),
    });
  }
  return { revision: 1, assessments, history };
}

export function seedRiskAssessments(data: WorkspaceData, today: string): WorkspaceData {
  if (!data.rota) return data;
  let changed = false;
  const clients = data.rota.clients.map((client) => {
    const match = /^care-demo-client-(\d+)$/.exec(client.id);
    if (!match || !client.file || client.file.riskRegister !== undefined) return client;
    changed = true;
    return {
      ...client,
      file: {
        ...client.file,
        riskRegister: riskRegisterForClient(client, today, Number(match[1])),
      },
    };
  });
  return changed ? { ...data, rota: { ...data.rota, clients } } : data;
}
