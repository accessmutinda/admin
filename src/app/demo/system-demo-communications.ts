import type { WorkspaceData } from '../features/management/shared/management.store';
import type { JournalEntry, JournalTask } from '../features/management/journal/journal.models';
import {
  emptyPortal,
  type PortalConcern,
  type ProfessionalRecord,
} from '../features/management/staff-portal/portal.models';
import { DEMO_EMAIL } from '../core/auth/fixtures';
import { addDays } from '../features/management/rota/rota.models';
import { appendDemo, demoAt, demoId } from './system-demo-utils';

export function seedSystemCommunications(data: WorkspaceData, today: string): WorkspaceData {
  const clients = data.rota!.clients.filter((client) => client.active);
  const staff = data.people.filter((person) => person.stage === 'Hired');
  const manager = 'coordinator@example.test';
  const entries: JournalEntry[] = Array.from({ length: 12 }, (_, index) => ({
    id: demoId('journal-' + index),
    author: index % 3 ? 'Demo care coordinator' : 'Jane Doe',
    authorEmail: index % 3 ? manager : DEMO_EMAIL,
    to: index % 3 ? [DEMO_EMAIL, staff[index % staff.length].email] : [manager],
    cc: [],
    subject: [
      'Morning handover and care priorities',
      'Medication stock follow-up',
      'Family appointment update',
      'Weekly team briefing',
    ][index % 4],
    clientId: clients[index % clients.length].id,
    category: ['Care update', 'Safeguarding', 'General', 'Meetings'][index % 4],
    priority: index === 1 ? 'High' : 'Normal',
    body: 'Fictional demo communication: review the linked care record, complete the agreed follow-up and keep the team informed.',
    attachments: [],
    state: index === 11 ? 'Draft' : 'Sent',
    createdAt: demoAt(today, -Math.floor(index / 2), '08:30'),
    readBy: index % 3 === 0 ? [DEMO_EMAIL] : [],
    archivedBy: index === 8 ? [DEMO_EMAIL] : [],
    starredBy: index === 2 ? [DEMO_EMAIL] : [],
    followUpBy: index === 1 ? [DEMO_EMAIL] : [],
  }));
  const statuses: JournalTask['status'][] = [
    'Open',
    'In progress',
    'Awaiting response',
    'Escalated',
    'Resolved',
  ];
  const tasks: JournalTask[] = Array.from({ length: 10 }, (_, index) => ({
    id: demoId('task-' + index),
    owner:
      index < 6 ? DEMO_EMAIL : index < 9 ? 'admin@example.test' : staff[index % staff.length].email,
    title: [
      'Confirm updated care preferences',
      'Review medication cupboard stock',
      'Follow up family appointment',
      'Upload supervision reflection',
      'Complete daily wellbeing review',
    ][index % 5],
    clientId: clients[index % clients.length].id,
    due: addDays(today, index - 2),
    priority: index === 3 ? 'High' : 'Normal',
    status: statuses[index % statuses.length],
    shared: true,
    assignedBy: manager,
    notes: 'Fictional demo task with a linked service-user record.',
    actions: index % 2 ? 'Demo follow-up in progress.' : '',
    followUp: addDays(today, index + 1),
    attachments: [],
  }));
  const concerns: PortalConcern[] = Array.from({ length: 6 }, (_, index) => ({
    id: demoId('concern-' + index),
    reference: 'DEMO-CON-' + String(index + 1).padStart(3, '0'),
    title: [
      'Medication stock discrepancy',
      'Change in mobility reported',
      'Family communication follow-up',
      'Access arrangement needs review',
      'Missed documentation check',
      'Wellbeing concern resolved',
    ][index],
    description:
      'Fictional demonstration concern. No actual incident or safeguarding event is represented.',
    type: index === 0 ? 'Medication' : 'Care concern',
    priority: index < 2 ? 'High' : 'Normal',
    clientId: clients[index % clients.length].id,
    staffEmail: DEMO_EMAIL,
    assignedTo: manager,
    followers: [DEMO_EMAIL],
    visitDate: addDays(today, -index),
    raisedBy: 'Jane Doe',
    raisedAt: demoAt(today, -index),
    status: ['Raised', 'Assigned', 'Under investigation', 'Action taken', 'Escalated', 'Resolved'][
      index
    ] as PortalConcern['status'],
    checklist: [
      {
        id: demoId('concern-check-' + index),
        title: 'Review the linked care record and agree follow-up',
        done: index > 2,
      },
    ],
    notes: [
      {
        id: demoId('concern-note-' + index),
        author: 'Demo care coordinator',
        text: 'Demonstration review note recorded.',
        at: demoAt(today, -index),
      },
    ],
    evidence: [],
    outcome: index === 5 ? 'Demo follow-up completed.' : '',
  }));
  const communications: ProfessionalRecord[] = clients.slice(0, 6).map((client, index) => ({
    id: demoId('professional-' + index),
    clientId: client.id,
    contactId: client.file!.contacts!.find((contact) => contact.type === 'GP')!.id,
    direction: index % 2 ? 'Sent' : 'Received',
    type: 'Professional update',
    subject: 'Demo routine care review - ' + client.name,
    details:
      'Fictional correspondence: routine care update received and follow-up responsibility recorded.',
    at: demoAt(today, -index),
    loggedBy: 'Jane Doe',
    loggedByEmail: DEMO_EMAIL,
    followUp: addDays(today, index + 2),
    status: index === 5 ? 'Resolved' : index % 2 ? 'Open' : 'In progress',
    attachments: [],
  }));
  const portal = data.staffPortal ?? emptyPortal();
  const journal = data.journal ?? { entries: [], tasks: [], events: [] };
  return {
    ...data,
    journal: {
      entries: appendDemo(journal.entries, entries),
      tasks: appendDemo(journal.tasks, tasks),
      events: appendDemo(
        journal.events,
        entries
          .filter((entry) => entry.state === 'Sent')
          .map((entry) => ({
            id: entry.id + '-event',
            actor: entry.author,
            audience: [...entry.to, entry.authorEmail],
            action: 'Demo message recorded',
            subject: entry.subject,
            at: entry.createdAt,
          })),
      ),
    },
    staffPortal: {
      concerns: appendDemo(portal.concerns, concerns),
      communications: appendDemo(portal.communications, communications),
      events: appendDemo(
        portal.events,
        concerns.map((concern) => ({
          id: concern.id + '-event',
          clientId: concern.clientId,
          entityId: concern.id,
          actor: 'Demo care coordinator',
          action: 'Concern reviewed',
          detail: concern.title,
          at: concern.raisedAt,
          category: 'Concern',
          status: concern.status,
          audience: [DEMO_EMAIL, manager],
        })),
      ),
    },
  };
}
