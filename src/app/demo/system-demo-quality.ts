import type { WorkspaceData } from '../features/management/shared/management.store';
import {
  ASSESSMENT_TEMPLATES,
  emptyQuality,
  type Assessment,
  type CorrectiveAction,
} from '../features/management/quality/quality.models';
import {
  emptyInspection,
  QUESTIONS,
  CATEGORIES,
  type InspectorDocument,
  type InspectorFinding,
} from '../features/inspector/inspector.models';
import { addDays } from '../features/management/rota/rota.models';
import { appendDemo, demoAt, demoId } from './system-demo-utils';

export function seedSystemQuality(data: WorkspaceData, today: string): WorkspaceData {
  const clients = data.rota!.clients;
  const staff = data.people.filter((person) => person.stage === 'Hired');
  const evidence = clients[0]?.file?.documents?.[0];
  const assessments: Assessment[] = ASSESSMENT_TEMPLATES.flatMap((template, index) =>
    Array.from({ length: 2 }, (_, copy) => {
      const person = staff[(index + copy) % staff.length];
      const client = clients[(index + copy) % clients.length];
      const subject =
        template.subject === 'staff'
          ? person
          : template.subject === 'client'
            ? client
            : { id: 'service', name: 'Demo community care service' };
      return {
        id: demoId('assessment-' + index + '-' + copy),
        templateId: template.id,
        subjectId: subject.id,
        subjectName: subject.name,
        assessorId: staff[0].id,
        assessorName: staff[0].name,
        date: addDays(today, -14 + index),
        reviewDate: addDays(today, copy === 0 ? 30 + index : -2),
        context: 'Fictional demonstration assessment, linked to the care and staff records.',
        answers: Object.fromEntries(
          template.fields.map((field) => [
            field.id,
            field.options?.[0] ?? 'Demo observation recorded; follow-up agreed with the care team.',
          ]),
        ),
        outcome:
          copy === 0
            ? 'Demo review completed; support arrangements remain appropriate.'
            : 'Demo follow-up review needed.',
        recommendations: 'Review the care record, confirm actions and retain supporting evidence.',
        evidence: evidence
          ? [
              {
                id: demoId('quality-evidence-' + index + '-' + copy),
                name: evidence.name,
                type: evidence.mime,
                size: evidence.size,
                content: evidence.data,
                caption: 'Fictional demonstration evidence only.',
              },
            ]
          : [],
        status: copy === 0 ? 'Signed off' : index % 2 ? 'Scheduled' : 'Submitted',
        ...(copy === 0
          ? {
              signature: {
                name: 'Demo quality reviewer',
                role: 'Demo assessor',
                at: demoAt(today, -7),
                declaration: true,
              },
            }
          : {}),
        revision: 1,
        audit: [
          {
            id: demoId('quality-audit-' + index + '-' + copy),
            at: demoAt(today, -7),
            actor: 'Demo quality reviewer',
            action: 'Demo assessment recorded',
            detail: template.title,
          },
        ],
      };
    }),
  );
  const actions: CorrectiveAction[] = assessments
    .filter((assessment) => assessment.status !== 'Signed off')
    .map((assessment, index) => ({
      id: demoId('quality-action-' + index),
      assessmentId: assessment.id,
      title: [
        'Review care-plan follow-up',
        'Confirm medication competency',
        'Update risk assessment evidence',
      ][index % 3],
      ownerId: staff[index % staff.length].id,
      due: addDays(today, index === 0 ? -2 : index + 3),
      priority: index === 0 ? 'High' : 'Standard',
      status: index % 3 === 0 ? 'Open' : index % 3 === 1 ? 'In progress' : 'Completed',
      resolution: index % 3 === 2 ? 'Demo follow-up reviewed and completed.' : '',
      revision: 1,
      audit: [],
    }));
  const quality = data.quality ?? emptyQuality();
  const inspection = data.inspection ?? emptyInspection();
  const documents: InspectorDocument[] = CATEGORIES.map((category, index) => ({
    id: demoId('inspection-document-' + index),
    name: 'DEMO - ' + category + ' evidence.pdf',
    category,
    questions: [QUESTIONS[index % QUESTIONS.length].key],
    owner: 'Demo compliance coordinator',
    updated: demoAt(today, -14 + index),
    version: '1.0',
    expiry: addDays(today, index === 1 ? 21 : 180),
    status: 'Recorded',
    content: evidence?.data ?? '',
    source: 'Fictional demonstration evidence library',
  }));
  const findings: InspectorFinding[] = QUESTIONS.map((question, index) => ({
    id: demoId('inspection-finding-' + index),
    question: question.key,
    type: index === 0 ? 'Concern' : index === 3 ? 'Required action' : 'Strength',
    text: [
      'Demo medication stock review requires follow-up.',
      'Demo training and competency records are available.',
      'Demo care plans reflect recorded personal preferences.',
      'Demo review dates need confirmation.',
      'Demo governance and action tracking are in place.',
    ][index],
    owner: staff[index % staff.length].name,
    due: addDays(today, 7 + index),
    status: index === 2 ? 'Completed' : 'In progress',
    evidenceIds: [documents[index].id],
    at: demoAt(today, -2),
    by: 'Demo inspector',
  }));
  const blankDraft =
    !inspection.draft.summary && !inspection.draft.findings.length && !inspection.draft.start;
  return {
    ...data,
    quality: {
      assessments: appendDemo(quality.assessments, assessments),
      actions: appendDemo(quality.actions, actions),
    },
    inspection: {
      ...inspection,
      documents: appendDemo(inspection.documents, documents),
      draft: blankDraft
        ? {
            ...inspection.draft,
            revision: 1,
            type: 'Demo readiness review',
            start: addDays(today, -2),
            end: today,
            ratings: Object.fromEntries(
              QUESTIONS.map((question, index) => [
                question.key,
                index === 0 ? 'Requires improvement' : 'Good',
              ]),
            ),
            notes: Object.fromEntries(
              QUESTIONS.map((question) => [
                question.key,
                'Fictional demonstration observation; this is not a regulatory rating.',
              ]),
            ),
            summary:
              'Fictional demonstration review. Evidence links, medication oversight and open follow-up actions illustrate inspection preparation.',
            findings,
            updated: demoAt(today),
            by: 'Demo inspector',
          }
        : { ...inspection.draft, findings: appendDemo(inspection.draft.findings, findings) },
    },
  };
}
