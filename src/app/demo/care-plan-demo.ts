import {
  PERSONAL_ASSISTANCE,
  PERSONAL_EQUIPMENT,
} from '../features/management/care/care-plan-personal-care.models';
import { demoCareDocument } from './care-demo-profiles';
import {
  ASSESSMENT_FIELDS,
  seededAssessment,
} from '../features/management/care/care-plan-assessment.models';
import { seededReviewReport } from '../features/management/care/care-plan-review.models';
import { WorkspaceData } from '../features/management/shared/management.store';
import { PlanVersion, seedCarePlan } from '../features/management/care/care-plan.models';
import { addDays } from '../features/management/rota/rota.models';

// Only enrich untouched fictional review examples; approved and edited records remain unchanged.
function seedOverviewProgress(version: PlanVersion, index: number) {
  if (
    index !== 1 ||
    version.status !== 'Draft' ||
    !version.sections.every((s) => s.complete) ||
    version.events.length !== 1 ||
    !['Review started', 'Demo review example created'].includes(version.events[0].action)
  )
    return;
  for (const i of [4, 11]) {
    version.sections[i].complete = false;
    version.sections[i].fields['changes'] =
      'Fictional review in progress: confirm current preferences and agree any updates.';
  }
  for (const i of [9, 13, 14]) version.sections[i].complete = false;
}

function seedPersonalCareExample(version: PlanVersion, index: number) {
  if (
    index !== 1 ||
    version.status !== 'Draft' ||
    version.sections[1].fields['personalCareSeed'] ||
    version.events.length !== 1 ||
    !['Review started', 'Demo review example created'].includes(version.events[0].action)
  )
    return;
  const section = version.sections[1];
  section.fields['assistance'] = [...PERSONAL_ASSISTANCE.slice(0, 3), section.fields['assistance']]
    .filter(Boolean)
    .join('\n');
  section.fields['equipment'] = [PERSONAL_EQUIPMENT[0], section.fields['equipment']]
    .filter(Boolean)
    .join('\n');
  section.fields['reviewOutcome'] = 'No significant change';
  section.fields['personalVoiceTranscript'] = [
    section.fields['situation'],
    section.fields['preferences'],
    section.fields['assistance'],
  ]
    .filter(Boolean)
    .join(' ');
  section.fields['personalCareSeed'] = '1';
  section.complete = false;
}

export function seedCarePlans(data: WorkspaceData, today: string): WorkspaceData {
  if (!data.rota) return data;
  let demoIndex = 0;
  return {
    ...data,
    rota: {
      ...data.rota,
      clients: data.rota.clients.map((original) => {
        let client = original;
        if (!client.id.startsWith('care-demo-') || !client.file) return client;
        const entries = structuredClone(client.file.entries);
        const additions: Record<
          string,
          import('../features/management/clients/client-file.models').ClientEntry[]
        > = {
          incidents: [
            {
              id: client.id + '-workspace-incident',
              name: 'Reported change in mobility · demo',
              detail:
                'Fictional incident example: the carer reported a change in mobility. Supervisor contacted and current assessed instructions reviewed.',
              date: addDays(today, -3),
              level: 'Medium',
              status: 'Active',
            },
          ],
          complaints: [
            {
              id: client.id + '-workspace-complaint',
              name: 'Call felt rushed · demo',
              detail:
                'Fictional complaint from the family. Review the visit record, discuss preferences and record the agreed follow-up.',
              date: addDays(today, -5),
              level: 'Medium',
              status: 'Active',
            },
          ],
          feedback: [
            {
              id: client.id + '-workspace-feedback',
              name: 'Courtesy call and care-plan feedback · demo',
              detail:
                'The service user values familiar carers and being offered choices. Continue supporting independence and review call timing at the next care-plan discussion.',
              date: addDays(today, -2),
              level: 'Low',
              status: 'Completed',
            },
          ],
        };
        for (const [key, values] of Object.entries(additions))
          entries[key] = [
            ...(entries[key] || []),
            ...values.filter((v) => !(entries[key] || []).some((e) => e.id === v.id)),
          ];
        const contacts = [...(client.file.contacts || [])];
        if (!contacts.some((contact) => contact.type === 'Professional'))
          contacts.push({
            id: client.id + '-overview-social-worker',
            name: 'Demo Social Worker',
            type: 'Professional',
            relationship: 'Social Worker',
            phone: '07700 900103',
            email: 'social.worker@example.test',
            nextOfKin: false,
          });
        const documents = [...(client.file.documents || [])];
        const knownDocumentIds = new Set(
          [...documents, ...(client.file.documentArchive || [])].map((document) => document.id),
        );
        for (const [suffix, name] of [
          ['mobility-ot', 'Occupational Therapy Report.pdf'],
          ['mobility-risk', 'Risk Assessment - Mobility.pdf'],
        ]) {
          const id = client.id + '-' + suffix;
          if (!knownDocumentIds.has(id))
            documents.push(demoCareDocument(id, name, 'Mobility assessment', today));
        }
        client = { ...client, file: { ...client.file, entries, contacts, documents } };

        const index = /^care-demo-client-\d+$/.test(client.id)
          ? Number(client.id.split('-').at(-1))
          : demoIndex++;
        if (client.file!.carePlan) {
          const record = structuredClone(client.file!.carePlan);
          if (
            index < 2 &&
            !record.versions.some((v) => v.status === 'Draft' || v.status === 'In review')
          ) {
            const approved = record.versions.find((v) => v.status === 'Approved');
            if (approved)
              record.versions.unshift({
                ...structuredClone(approved),
                id: crypto.randomUUID(),
                version: (Math.max(...record.versions.map((v) => Number(v.version))) + 0.1).toFixed(
                  1,
                ),
                status: index === 0 ? 'In review' : 'Draft',
                author: 'Demo review supervisor',
                authorId: 'care-plan-demo-reviewer',
                contributors: ['care-plan-demo-reviewer'],
                approver: '',
                approvedAt: '',
                reviewer: '',
                createdAt: today,
                reviewReport: seededReviewReport(),
                events: [
                  {
                    at: today + 'T09:00:00Z',
                    by: 'Demo review supervisor',
                    action: 'Demo review example created',
                    detail:
                      'Created an additional fictional review for frontend evaluation; previous approved versions are retained.',
                  },
                ],
              });
          }

          record.versions = record.versions.map((version) => {
            if (version.status !== 'Draft') return version;
            seedOverviewProgress(version, index);
            seedPersonalCareExample(version, index);
            version.details['clientId'] ??= client.reference;
            version.details['postcode'] ??= client.postcode;
            version.details['mobile'] ??= client.file?.details['mobile'] || '07700 900123';
            version.reviewReport ||= seededReviewReport();
            version.assessments = version.assessments.map((a) => ({
              ...a,
              fields: a.fields || seededAssessment(a.name, version.review).fields,
            }));
            for (const name of Object.keys(ASSESSMENT_FIELDS))
              if (!version.assessments.some((a) => a.name === name))
                version.assessments.push(seededAssessment(name, version.review));
            return version;
          });
          return { ...client, file: { ...client.file!, carePlan: record } };
        }
        const record = seedCarePlan(client),
          approved = record.versions[0];
        approved.packageSnapshot = structuredClone(
          data.rota!.calls.filter((c) => c.clientId === client.id && c.active),
        );
        approved.author = 'Demo care supervisor';
        approved.authorId = 'care-plan-demo-supervisor';
        approved.approver = 'Demo registered manager';
        approved.reviewer = approved.approver;
        approved.status = 'Approved';
        approved.approvedAt = addDays(today, -14) + 'T10:00:00Z';
        approved.createdAt = addDays(today, -21);
        approved.confirmed = true;
        approved.packageDecision = 'No change';
        approved.review = addDays(today, 70);
        approved.capacity['concerns'] = 'No';
        approved.capacity['decision'] =
          'Fictional example: able to understand, retain, weigh and communicate the decision about daily personal care.';
        approved.capacity['bestInterests'] =
          'Not applicable to this recorded decision; support decision making and seek reassessment if concerns arise.';
        const instructions: [string, string, string][] = [
          [
            'I live at home and want to retain my daily routine.',
            'Ask how I would like to be supported today and allow time for my answers.',
            'Continue living at home with choices respected.',
          ],
          [
            'I benefit from support with my personal care routine.',
            'Offer privacy, obtain consent and support washing at my pace.',
            'Maintain comfort, dignity and personal hygiene.',
          ],
          [
            'I mobilise around my home and may need reassurance.',
            'Keep walking routes clear and use only equipment in the moving and handling assessment.',
            'Move safely while maintaining independence.',
          ],
          [
            'I prefer familiar meals and regular drinks.',
            'Support meal preparation, follow my dietary preferences and record food and fluid intake.',
            'Maintain nutrition and hydration with choices respected.',
          ],
          [
            'I value privacy when using the toilet.',
            'Offer discreet prompts and support in line with my agreed routine.',
            'Remain comfortable and maintain continence where possible.',
          ],
          [
            'I like to choose my own clothes.',
            'Lay out my chosen clothes and offer support with fastenings if requested.',
            'Dress in clothing of my choice.',
          ],
          [
            'I prefer clear explanations and time to respond.',
            'Speak clearly, check understanding and ensure my communication aids are available.',
            'Make my wishes understood.',
          ],
          [
            'Changes to routine can affect my wellbeing.',
            'Offer reassurance, listen to my concerns and record changes in mood.',
            'Feel safe, listened to and involved.',
          ],
          [
            'My medication support is recorded in Medication & MAR.',
            'Follow the current prescription and MAR, record outcomes and escalate refusals.',
            'Receive agreed medication support safely.',
          ],
          [
            'A safe and familiar home helps me stay independent.',
            'Check walkways and obvious hazards and report equipment or fire-safety concerns.',
            'Maintain a safe home environment.',
          ],
          [
            'Keeping in touch with people matters to me.',
            'Support agreed contact with family and community activities with consent.',
            'Maintain meaningful relationships.',
          ],
          [
            'I prefer predictable call times and an unhurried routine.',
            'Explain the planned tasks and agree their order with me.',
            'Keep a routine that reflects my choices.',
          ],
          [
            'My cultural and religious preferences are recorded in my profile.',
            'Ask about my preferences and follow agreed food and faith requirements.',
            'Have my beliefs and culture respected.',
          ],
          [
            'I want control over decisions about my money.',
            'Only assist with transactions under the agreed authority and record receipts.',
            'Manage money with appropriate safeguards.',
          ],
          [
            'My future wishes should be discussed sensitively.',
            'Check for current advance-care documents and seek professional advice where needed.',
            'Have future care wishes understood and respected.',
          ],
          [
            'Access information is held securely in my service-user record.',
            'Follow the authorised access instructions and secure the home on leaving.',
            'Receive visits safely with the property secured.',
          ],
          [
            'My agreed calls are shown in the current care package.',
            'Follow the approved call times, duration and single or double-up arrangements.',
            'Receive the agreed support at the planned times.',
          ],
        ];
        approved.sections.forEach((section, i) => {
          const [situation, assistance, goal] = instructions[i];
          section.complete = true;
          section.review = approved.review;
          section.fields = {
            situation,
            assistance,
            goal,
            equipment:
              'Use only assessed aids listed in the linked record; no additional equipment recommended in this example.',
            strengths: 'I can express preferences and take part in tasks at my own pace.',
            preferences:
              i === 3
                ? 'Ask me which meal I prefer and respect my recorded dietary requirements.'
                : 'Ask for my consent, explain each step and respect my choices.',
            risks:
              'Record changes or concerns and contact the duty supervisor. Follow the emergency procedure for immediate danger.',
            actions: assistance,
            changes:
              'Fictional seeded example for workflow evaluation; confirm at the next review.',
          };
          section.visibility = {
            staff: true,
            family: [0, 3, 10, 11, 12].includes(i),
            inspector: i !== 15,
          };
        });
        Object.assign(approved.sections[0].fields, {
          background: 'I have lived locally for many years.',
          family: 'My family are important to me; ask who I would like involved.',
          culture: 'Respect my recorded cultural and religious preferences.',
          lifestyle: 'I enjoy familiar activities and staying in touch with people.',
          matters: 'Being listened to and maintaining my independence.',
        });
        approved.body = [
          {
            id: crypto.randomUUID(),
            view: 'Front',
            x: 68,
            y: 62,
            location: 'Left upper leg',
            type: 'Bruising',
            description: 'Fictional small bruise recorded for demonstration.',
            size: '2 cm',
            pain: '0 / 10 reported',
            date: addDays(today, -4),
            issue: 'Existing',
            action: 'Monitor and report any change to the duty supervisor.',
            professional: 'Demo district nurse',
            photo: '',
            related: 'Demo skin observation',
            status: 'Monitoring',
            history: [
              {
                at: addDays(today, -4) + 'T10:00:00Z',
                by: 'Demo care supervisor',
                detail: 'Observation added; monitoring agreed.',
              },
            ],
          },
        ];
        approved.assessments = [
          {
            id: crypto.randomUUID(),
            name: 'Falls / Moving & Handling',
            section: 'Mobility',
            findings: 'Keep walking routes clear and follow assessed transfer instructions.',
            action: 'Report changes in mobility to the duty supervisor.',
            review: approved.review,
            status: 'Completed',
          },
        ];
        approved.events = [
          {
            at: approved.approvedAt,
            by: approved.approver,
            action: 'Approved seeded example',
            detail:
              'Fictional demonstration version. Not a clinical instruction for a real service user.',
          },
        ];
        approved.qualityReview =
          'Demo manager reviewed the fictional linked evidence and agreed actions.';
        if (index < 3) {
          const draft = structuredClone(approved);
          draft.id = crypto.randomUUID();
          draft.version = '1.1';
          draft.status = index === 0 ? 'In review' : 'Draft';
          draft.author = 'Demo review supervisor';
          draft.authorId = 'care-plan-demo-reviewer';
          draft.approver = '';
          draft.approvedAt = '';
          draft.reviewer = '';
          draft.createdAt = today;
          draft.reviewReport = seededReviewReport();
          draft.assessments = draft.assessments.map((a) => ({
            ...a,
            fields: seededAssessment(a.name, draft.review).fields,
          }));
          for (const name of Object.keys(ASSESSMENT_FIELDS))
            if (!draft.assessments.some((a) => a.name === name))
              draft.assessments.push(seededAssessment(name, draft.review));
          draft.events = [
            {
              at: today + 'T09:00:00Z',
              by: draft.author,
              action: index === 0 ? 'Submitted for review' : 'Review started',
              detail: 'Brought forward the previous approved version for review.',
            },
          ];
          seedOverviewProgress(draft, index);
          seedPersonalCareExample(draft, index);
          record.versions.unshift(draft);
        }
        return { ...client, file: { ...client.file!, carePlan: record } };
      }),
    },
  };
}
