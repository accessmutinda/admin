import { DEMO_EMAIL, DEMO_USER } from '../core/auth/fixtures';
import type { WorkspaceData } from '../features/management/shared/management.store';
import { emptyEcm, type CallStyle } from '../features/management/ecm/ecm.models';
import {
  addDays,
  completedVisit,
  londonInstant,
  type RotaCall,
  type RotaVisit,
  type RotaAudit,
} from '../features/management/rota/rota.models';
import {
  type VisitNote,
  type VisitNoteAttachment,
  visitNoteRevision,
  validVisitNoteAttachment,
} from '../features/management/care/visit-notes.models';
import { appendDemo, demoId } from './system-demo-utils';

const noteTypes = [
  'Personal Care',
  'Evening Care',
  'Domestic Support',
  'Medication',
  'Observation',
];
const descriptions = [
  'Supported washing and dressing with consent. Encouraged independence; the person was comfortable before leaving.',
  'Prepared an evening meal and drink. Followed the agreed routine and left preferred items within reach.',
  'Completed light cleaning and laundry. Prepared a snack and checked that walking routes were clear.',
  'Supported the prescribed routine. Medication outcomes must be recorded separately in MAR.',
  'Observed increased tiredness. Encouraged fluids and requested a care-coordinator review.',
];
const compactTasks = (tasks: string) =>
  tasks === 'Demonstration visit: follow the personalised care plan.' ||
  tasks === 'Demo: follow the care plan.' ||
  tasks === 'Follow care plan.'
    ? 'Follow plan.'
    : tasks;
function visitFields(call: RotaCall) {
  const { id, name, active, weekdays, regularStaffIds, ...fields } = call;
  return fields;
}
export function compactDemoVisit(visit: RotaVisit): RotaVisit {
  if (!visit.id.startsWith('care-demo-')) return visit;
  const { name, active, weekdays, regularStaffIds, ...fields } = visit as RotaVisit &
    Partial<RotaCall>;
  return { ...fields, tasks: compactTasks(visit.tasks) };
}

export function seedCareWorkspaces(data: WorkspaceData, today: string): WorkspaceData {
  const rota = data.rota;
  const staff = data.people.filter(
    (p) => /^care-demo-staff-\d+$/.test(p.id) && p.stage === 'Hired',
  );
  if (!rota || !staff.length) return data;
  const visits: RotaVisit[] = [];
  const calls: RotaCall[] = [];
  const audit: RotaAudit[] = [];
  const templates = [
    {
      name: 'Morning call',
      start: '08:00',
      end: '08:45',
      task: 'Personal Care',
      priority: 'High' as const,
    },
    {
      name: 'Lunch call',
      start: '12:00',
      end: '12:30',
      task: 'Meals & hydration',
      priority: 'Standard' as const,
    },
    {
      name: 'Tea call',
      start: '17:00',
      end: '17:30',
      task: 'Domestic Support',
      priority: 'Standard' as const,
    },
    {
      name: 'Bed call',
      start: '20:15',
      end: '20:45',
      task: 'Evening Care',
      priority: 'Standard' as const,
    },
  ];
  const firstClientId =
    rota.clients
      .filter((c) => c.id.startsWith('care-demo-client-') && c.active && c.file)
      .map((c) => c.id)
      .sort()[0] ?? '';
  const clients = rota.clients.map((client, clientIndex) => {
    if (!client.id.startsWith('care-demo-client-') || !client.active || !client.file) return client;
    const file = client.file;
    const first = client.id === firstClientId;
    const clientKey = client.id.slice('care-demo-client-'.length);
    const packages = first
      ? templates.map((template, slot): RotaCall => ({
          id: demoId(`workspace-package-${client.id}-${slot}`),
          clientId: client.id,
          name: template.name,
          start: template.start,
          end: template.end,
          weekdays: [1, 2, 3, 4, 5, 6, 0],
          carers: 1,
          skills: [],
          regularStaffIds: [staff[(clientIndex + slot) % staff.length].id],
          backupStaffId: staff[(clientIndex + slot + 1) % staff.length].id,
          tasks: `Demo: ${template.task.toLowerCase()} following the care plan.`,
          taskType: template.task,
          priority: template.priority,
          active: true,
          location: 'Home',
          timeSensitive: slot === 0,
          toleranceMinutes: 15,
          flexible: slot === 2,
        }))
      : rota.calls.filter((call) => call.clientId === client.id && call.active);
    if (!packages.length) return client;
    if (first) calls.push(...packages);
    const sourceVisits = rota.visits
      .filter(
        (v) =>
          v.clientId === client.id &&
          v.date < today &&
          completedVisit(v) &&
          v.staffIds.length > 0 &&
          data.people.some((p) => p.id === v.staffIds[0]) &&
          Number.isFinite(
            Date.parse(v.attendance.find((a) => a.personId === v.staffIds[0] && a.end)?.end ?? ''),
          ),
      )
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
    const notes: VisitNote[] = [];
    for (let index = 0; index < (first ? 12 : 2); index++) {
      let visit = sourceVisits[index];
      if (!visit) {
        const call = packages[index % packages.length];
        const person = staff[(clientIndex + index) % staff.length];
        const date = addDays(today, -1 - index);
        visit = {
          ...visitFields(call),
          id: demoId(`workspace-completed-${client.id}-${index}`),
          callId: call.id,
          clientName: client.name,
          address: client.address,
          date,
          start: '09:00',
          end: '10:00',
          callName: call.name,
          carers: 1,
          staffIds: [person.id],
          allocation: 'Regular',
          state: 'Published',
          priority: 'Standard',
          demo: true,
          exception: '',
          attendance: [
            {
              personId: person.id,
              start: londonInstant(date, '09:00')!,
              end: londonInstant(date, '10:00')!,
            },
          ],
        };
        visits.push(visit);
      }
      const person = data.people.find((p) => p.id === visit.staffIds[0])!;
      const ended = visit.attendance.find((entry) => entry.personId === person.id && entry.end)!;
      const at = new Date(Date.parse(ended.end) + 10 * 60000).toISOString();
      const attachments: VisitNoteAttachment[] =
        first && index === 0
          ? (file.documents ?? [])
              .filter((doc) => doc.mime === 'application/pdf')
              .slice(0, 2)
              .map((doc, i) => ({
                id: demoId(`note-attachment-${clientKey}-${i}`),
                name: 'DEMO - ' + doc.name,
                mime: doc.mime,
                size: doc.size,
                data: doc.data,
                uploadedAt: at,
                uploadedBy: person.name,
              }))
              .filter(validVisitNoteAttachment)
          : [];
      const type = (index + clientIndex) % noteTypes.length;
      const flagged = type === 4 || (!first && index === 1);
      const note: VisitNote = {
        id: demoId(`visit-note-${clientKey}-${index}`),
        visitId: visit.id,
        date: visit.date,
        start: visit.start,
        end: visit.end,
        carerId: person.id,
        visitType: noteTypes[type],
        body:
          'Fictional demo. ' +
          descriptions[type] +
          (flagged && type !== 4 ? ' Coordinator review requested.' : ''),
        status: flagged ? 'Flagged' : 'Completed',
        attachments,
        visibility: { staff: index % 6 !== 4, family: index % 3 !== 1, inspector: index % 4 !== 3 },
        createdAt: at,
        createdById: person.email === DEMO_EMAIL ? DEMO_USER.id : person.id,
        createdBy: person.name,
        updatedAt: at,
        updatedBy: person.name,
        version: 1,
        revisions: [],
      };
      if (first && index === 1) {
        note.revisions = [visitNoteRevision(note)];
        note.body += ' Follow-up: comfort confirmed before leaving.';
        note.updatedAt = new Date(Date.parse(at) + 20 * 60000).toISOString();
        note.version = 2;
      }
      notes.push(note);
    }
    const event: RotaAudit = {
      id: demoId(`workspace-notes-${clientKey}`),
      clientId: client.id,
      userId: staff[0].id,
      user: 'Demo care coordinator',
      at: londonInstant(addDays(today, -1), '20:00')!,
      action: 'Demo visit notes added',
      detail: `${client.name} · fictional notes, visibility and revision examples.`,
    };
    audit.push(event);
    return {
      ...client,
      file: {
        ...file,
        visitNotes: appendDemo(file.visitNotes, notes),
        audit: appendDemo(file.audit, [
          {
            id: event.id,
            at: event.at,
            by: event.user,
            action: event.action,
            detail: event.detail,
          },
        ]),
      },
    };
  });
  const first = clients.find((c) => c.id === firstClientId);
  const bed = calls.find((c) => c.clientId === firstClientId && c.name === 'Bed call');
  if (first && bed) {
    for (const [index, state] of (
      ['Draft', 'Draft', 'Published', 'Cancelled'] as const
    ).entries()) {
      const date = addDays(today, state === 'Cancelled' ? -2 : 1 + index);
      visits.push({
        ...visitFields(bed),
        id: demoId(`workspace-publishing-${index}`),
        callId: bed.id,
        clientName: first.name,
        address: first.address,
        callName: bed.name,
        date,
        start: bed.start,
        end: bed.end,
        carers: 1,
        staffIds: index === 1 ? [] : [staff[1 % staff.length].id],
        allocation: 'Regular',
        state,
        priority: 'Standard',
        attendance: [],
        demo: true,
        exception: state === 'Cancelled' ? 'Demo: family arranged alternative support.' : '',
      });
      audit.push({
        id: demoId(`workspace-visit-audit-${index}`),
        clientId: first.id,
        userId: staff[0].id,
        user: staff[0].name,
        at: londonInstant(addDays(today, -1), '15:00')!,
        action:
          state === 'Cancelled'
            ? 'Demo visit cancelled'
            : state === 'Published'
              ? 'Demo rota published'
              : 'Demo draft planned',
        detail: `${first.name} · ${date} · ${state}`,
      });
    }
    for (let index = 0; index < 2; index++)
      visits.push({
        ...visitFields(bed),
        id: demoId('workspace-conflict-' + index),
        callId: bed.id,
        clientName: first.name,
        address: first.address,
        callName: bed.name,
        date: addDays(today, 2),
        start: '10:00',
        end: '11:00',
        carers: 1,
        staffIds: [staff[0].id],
        allocation: 'Regular',
        state: 'Draft',
        priority: 'High',
        attendance: [],
        exception: '',
        demo: true,
      });
  }
  const customStyles: Record<string, CallStyle> = {
    'Welfare check': {
      label: 'Welfare',
      duration: 30,
      priority: 'High',
      skills: [],
      active: true,
      background: '#fff6df',
      color: '#936300',
    },
    'Community support': {
      label: 'Community',
      duration: 60,
      priority: 'Standard',
      skills: [],
      active: true,
      background: '#eaf5fc',
      color: '#0066ac',
    },
  };
  if (bed)
    Object.keys(customStyles).forEach((name, index) =>
      calls.push({
        ...bed,
        id: demoId('workspace-custom-package-' + index),
        name,
        start: '14:00',
        end: index ? '15:00' : '14:30',
        weekdays: [1, 3, 5],
        active: index === 0,
        taskType: name,
        tasks: 'Demo: community support.',
      }),
    );
  const ecm = rota.ecm ?? emptyEcm();
  return {
    ...data,
    rota: {
      ...rota,
      clients,
      calls: appendDemo(
        rota.calls.map((call) =>
          call.id.startsWith('care-demo-') ? { ...call, tasks: compactTasks(call.tasks) } : call,
        ),
        calls,
      ),
      visits: appendDemo(rota.visits.map(compactDemoVisit), visits),
      audit: appendDemo(rota.audit, audit),
      ecm: { ...ecm, styles: { ...emptyEcm().styles, ...customStyles, ...ecm.styles } },
    },
  };
}
