import type { WorkspaceData, Person } from '../features/management/shared/management.store';
import type {
  JournalEntry,
  JournalTask,
  JournalAttachment,
} from '../features/management/journal/journal.models';
import type {
  PortalConcern,
  ProfessionalRecord,
  PortalEvent,
} from '../features/management/staff-portal/portal.models';
import { staffRecord } from '../features/management/people/hr.models';
import { DEMO_EMAIL } from '../core/auth/fixtures';
import { addDays } from '../features/management/rota/rota.models';
import { appendDemo, demoAt, demoId } from './system-demo-utils';

export function seedStaffPortal(data: WorkspaceData, today: string): WorkspaceData {
  const staffNames = ['Fatima Bullet', 'Zaid Ahmed', 'Irtisaal Khan'];
  const addedStaff: Person[] = staffNames.map((name, i) => {
    const person: Person = {
      id: demoId('portal-staff-' + i),
      name,
      email: name.toLowerCase().replaceAll(' ', '.') + '@example.test',
      role: i === 0 ? 'Supervisor' : 'Care Worker',
      location: 'Harrow',
      stage: 'Hired',
      vacancy: '',
      start: addDays(today, -365),
      notes: [],
      checks: Array(7).fill(true),
      onboarding: Array(8).fill(true),
      learning: [],
      progress: {},
      documents: [],
    };
    person.hr = staffRecord(person);
    person.hr.status = 'Active';
    person.hr.reference = 'CV-STF-' + String(23 + i).padStart(5, '0');
    person.hr.personal.photo = '/demo/images/staff-' + [2, 7, 3][i] + '.webp';
    person.hr.personal.phone = '07700 90020' + i;
    person.hr.employment.manager = 'Alex Morgan';
    person.hr.employment.type = 'Permanent';
    return person;
  });
  const people = appendDemo(data.people, addedStaff);
  const audience = [
    DEMO_EMAIL,
    'admin@example.test',
    'manager@example.test',
    'coordinator@example.test',
    ...addedStaff.map((p) => p.email),
  ];
  const clients = data.rota!.clients.filter((c) => c.id.startsWith('care-demo-') && c.active);
  const attachment = (name: string, clientId: string): JournalAttachment[] => {
    const doc = clients.find((c) => c.id === clientId)?.file?.documents?.[0];
    return doc ? [{ id: demoId(name + clientId), name, size: doc.size, content: doc.data }] : [];
  };
  const rota = {
    ...data.rota!,
    clients: data.rota!.clients.map((client) => {
      if (!clients.some((c) => c.id === client.id) || !client.file) return client;
      const contacts = [
        ['District Nurse', 'Fatima Bullet', 'nurse.fatima'],
        ['Occupational Therapist', 'Ruth Patel', 'ot.ruth'],
        ['Social Worker', 'Zaid Ahmed', 'social.zaid'],
        ['Hospital Team', 'Sarah Clarke', 'hospital.sarah'],
      ].map(([role, name, email], i) => ({
        id: demoId('portal-contact-' + client.id + '-' + i),
        name,
        type: 'Professional' as const,
        relationship: role,
        phone: '07700 90030' + i,
        email: email + '@example.test',
        nextOfKin: false,
      }));
      return {
        ...client,
        file: { ...client.file, contacts: appendDemo(client.file.contacts, contacts) },
      };
    }),
  };
  const entries: JournalEntry[] = [];
  const tasks: JournalTask[] = [];
  const concerns: PortalConcern[] = [];
  const communications: ProfessionalRecord[] = [];
  const events: PortalEvent[] = [];
  clients.forEach((client, index) => {
    const contacts = rota.clients.find((c) => c.id === client.id)!.file!.contacts!;
    const professionals = [
      contacts.find((c) => c.relationship === 'District Nurse')!,
      contacts.find((c) => c.type === 'GP')!,
      ...contacts.filter(
        (c) => c.id.startsWith(demoId('portal-contact-')) && c.relationship !== 'District Nurse',
      ),
      contacts.find((c) => c.type === 'Family') ?? contacts[0],
    ];
    const visits = rota.visits
      .filter((v) => v.clientId === client.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const visit = visits.find((v) => v.date <= today) ?? visits[0];
    const subjects = [
      'Wound care update',
      'GP review outcome',
      'OT assessment completed',
      'Support plan meeting',
      'Discharge summary received',
      'Family update – infection concern',
      'Medication change',
      'Equipment delivery',
    ];
    for (let i = 0; i < (client.name === 'Margaret Williams' ? 8 : 1); i++) {
      const contact = professionals[i % professionals.length];
      const entry: JournalEntry = {
        id: demoId('portal-journal-' + index + '-' + i),
        author: contact.name,
        authorEmail: contact.email.toLowerCase(),
        to: audience,
        cc: i % 3 === 0 ? [audience[0], audience[1]] : [],
        subject: subjects[i],
        clientId: client.id,
        visitId: visit?.id,
        category: i === 5 ? 'Safeguarding' : 'Care update',
        priority: i === 5 ? 'High' : 'Normal',
        body: [
          'Dressing changed. Wound healing well. Please review the visit notes and confirm follow-up.',
          'Review completed. Please confirm the follow-up appointment.',
          'Assessment completed. Recommendations shared; please confirm equipment delivery.',
          'Support plan discussed with family. Please update the record after confirmation.',
        ][i % 4],
        attachments:
          client.name === 'Margaret Williams' && i % 4 === 0
            ? attachment('Visit_Notes.pdf', client.id)
            : [],
        state: 'Sent',
        createdAt: demoAt(today, -Math.floor(i / 2), '10:14'),
        readBy: i < 4 ? [] : audience,
        archivedBy: [],
        starredBy: i === 0 ? audience : [],
        followUpBy: i === 1 ? audience : [],
        responseRequired: i < 3,
        responseStatus: i < 3 ? 'Awaiting response' : undefined,
        kind: 'Message',
      };
      entries.push(entry);
      communications.push({
        id: demoId('portal-professional-' + index + '-' + i),
        clientId: client.id,
        contactId: contact.id,
        direction: i % 2 ? 'Sent' : 'Received',
        type: [
          'District nurse note',
          'GP note',
          'OT request',
          'Social worker email',
          'Hospital communication',
          'Family update',
          'Phone call',
          'Email',
        ][i],
        subject: subjects[i],
        details: entry.body,
        at: entry.createdAt,
        createdAt: entry.createdAt,
        updatedAt: entry.createdAt,
        updatedBy: 'Alex Morgan',
        loggedBy: 'Alex Morgan',
        loggedByEmail: 'admin@example.test',
        followUp: addDays(today, i - 2),
        status: i === 6 ? 'Resolved' : i % 2 ? 'Open' : 'In progress',
        attachments: [],
        responseRequired: i < 5,
        responseStatus: i < 5 ? 'Awaiting response' : 'Responded',
      });
    }
    for (let i = 0; i < (client.name === 'Margaret Williams' ? 6 : 1); i++) {
      const taskIndex = client.name === 'Margaret Williams' ? i : index % 6;
      const status: JournalTask['status'] = [
        'Escalated',
        'Open',
        'In progress',
        'Awaiting response',
        'Resolved',
        'Open',
      ][taskIndex] as JournalTask['status'];
      tasks.push({
        createdAt: demoAt(today, -Math.max(1, i)),
        id: demoId('portal-task-' + index + '-' + i),
        owner: audience[index % audience.length],
        title: [
          'Follow up on medication incident',
          'Request GP notes',
          'District nurse update',
          'Safeguarding concern',
          'Care plan review',
          'Equipment check',
        ][taskIndex],
        clientId: client.id,
        due: addDays(today, taskIndex - 1),
        dueTime: i % 2 ? '16:00' : '10:00',
        priority: taskIndex === 0 ? 'High' : taskIndex < 3 ? 'Medium' : 'Low',
        status,
        shared: true,
        assignedBy: 'admin@example.test',
        notes: 'Review visit notes and confirm actions taken.',
        actions:
          taskIndex === 4
            ? 'Care plan reviewed and shared with the team.'
            : 'Awaiting professional confirmation.',
        followUp: addDays(today, i + 1),
        followUpTime: '09:00',
        attachments:
          client.name === 'Margaret Williams' && i === 0
            ? attachment('Medication_Review.pdf', client.id)
            : [],
        visitId: visit?.id,
        journalId: demoId('portal-journal-' + index + '-' + i),
        resolvedAt: taskIndex === 4 ? demoAt(today, 0, '06:45') : undefined,
      });
    }
    const state: PortalConcern['status'] =
      index === 0
        ? 'Under investigation'
        : index === 1
          ? 'Escalated'
          : index === 2
            ? 'Resolved'
            : 'Assigned';
    const stages = [
      'Raised',
      'Acknowledged',
      'Assigned',
      ...(state === 'Under investigation' || state === 'Escalated' || state === 'Resolved'
        ? ['Under investigation']
        : []),
      ...(state === 'Escalated' ? ['Escalated'] : []),
      ...(state === 'Resolved' ? ['Action taken', 'Resolved'] : []),
    ];
    const concern: PortalConcern = {
      id: demoId('portal-concern-' + index),
      reference: 'SC-' + today.slice(0, 4) + '-' + String(173 + index).padStart(4, '0'),
      title:
        index === 0
          ? 'Safeguarding concern – service user visit'
          : 'Care follow-up – ' + client.name,
      description:
        'Demonstration case: a reported change in wellbeing requires review of the visit record, staff account and agreed care plan.',
      type: index === 0 ? 'Safeguarding' : 'Care concern',
      priority: index < 2 ? 'High' : 'Normal',
      clientId: client.id,
      staffEmail: addedStaff[0].email,
      assignedTo: addedStaff[0].email,
      followers: audience,
      visitDate: visit?.date ?? addDays(today, -1),
      visitId: visit?.id,
      visitTime: visit ? visit.start + ' – ' + visit.end : '14:00 – 15:00',
      location: 'Harrow Community',
      raisedBy: 'Dr. Emily Watson',
      raisedAt: demoAt(today, -2, '10:14'),
      status: state,
      history: stages.map((status, i) => ({
        status,
        at: demoAt(
          today,
          i < 3 ? -2 : -1,
          ['10:14', '11:02', '11:15', '09:30', '12:30', '16:45'][i],
        ),
        actor: i === 0 ? 'Dr. Emily Watson' : i < 3 ? 'Alex Morgan' : 'Fatima Bullet',
      })),
      checklist: [
        'Review initial report and care records',
        'Gather and review visit notes',
        'Collect evidence (documents, photos, logs)',
        'Interview staff members involved',
        'Speak with service user / family',
        'Review care plan and risk assessments',
      ].map((title, i) => ({
        id: demoId('portal-check-' + index + '-' + i),
        title,
        done: i < 3,
        assignedTo: i % 2 ? 'fatima.bullet@example.test' : 'admin@example.test',
        due: addDays(today, i < 3 ? -1 : 1),
        completedAt: i < 3 ? demoAt(today, -1) : undefined,
      })),
      notes: [
        {
          id: demoId('portal-note-' + index),
          author: 'Fatima Bullet',
          text: 'Spoke with the care worker involved. Their account has been recorded. Awaiting further evidence from the visit log.',
          at: demoAt(today, -1, '09:30'),
          kind: 'Note',
          attachments: [],
        },
        {
          id: demoId('portal-note2-' + index),
          author: 'Alex Morgan',
          text: 'Reviewed the initial report and care plan. Staff interview scheduled and copies of visit notes requested.',
          at: demoAt(today, -2, '14:21'),
          kind: 'Note',
          attachments: [],
        },
      ],
      evidence: index === 0 ? attachment('Visit_Notes.pdf', client.id) : [],
      outcome:
        state === 'Resolved'
          ? 'Reviewed all evidence and agreed follow-up actions with the care team and family.'
          : '',
    };
    if (index < 3) concerns.push(concern);
    tasks
      .filter((t) => index < 3 && t.clientId === client.id && t.status === 'Escalated')
      .forEach((t) => (t.concernId = concern.id));
    if (index < 3)
      concern.history!.forEach((h, i) =>
        events.push({
          id: demoId('portal-event-' + index + '-' + i),
          clientId: client.id,
          entityId: concern.id,
          actor: h.actor,
          action: 'Concern ' + h.status.toLowerCase(),
          detail: concern.title,
          at: h.at,
          category: 'Concern',
          status: h.status,
        }),
      );
  });
  const primary = clients.find((c) => c.name === 'Margaret Williams') ?? clients[0];
  if (primary)
    audience.forEach((owner, i) => {
      for (let j = 0; j < (i === 0 || i === 1 || i === 4 ? 2 : 0); j++)
        entries.push({
          id: demoId('portal-personal-' + i + '-' + j),
          author:
            i === 0
              ? 'Jane Doe'
              : i === 1
                ? 'Alex Morgan'
                : (addedStaff[i - 4]?.name ?? 'Care Coordinator'),
          authorEmail: owner,
          to: [],
          cc: [],
          subject: j ? 'Weekly handover draft' : 'Internal care review',
          clientId: primary.id,
          category: 'Care update',
          priority: 'Normal',
          kind: j ? 'Message' : 'Internal note',
          body: j
            ? 'Please review this update before sharing with the team.'
            : 'Reviewed the latest visit record and agreed follow-up actions with the supervisor.',
          state: j ? 'Draft' : 'Sent',
          createdAt: demoAt(today, 0, '08:30'),
          attachments: [],
          readBy: [owner],
          archivedBy: [],
          starredBy: [],
          followUpBy: [],
        });
      entries.push({
        id: demoId('portal-request-' + i),
        author: i === 0 ? 'Jane Doe' : i === 1 ? 'Alex Morgan' : 'Care Coordinator',
        authorEmail: owner,
        to: ['nurse.fatima@example.test'],
        cc: [],
        subject: 'Wound care update – follow-up needed',
        clientId: primary.id,
        category: 'Care update',
        priority: 'Normal',
        body: 'Please confirm the follow-up plan and whether the current dressing regime should continue until the next visit.',
        state: 'Sent',
        createdAt: demoAt(today, -1, '14:32'),
        attachments: [],
        readBy: [owner],
        archivedBy: [],
        starredBy: [],
        followUpBy: [],
        responseRequired: true,
        responseStatus: 'Awaiting response',
      });
    });
  communications.forEach((c) =>
    events.push({
      id: c.id + '-event',
      clientId: c.clientId,
      entityId: c.id,
      actor: c.loggedBy,
      action: c.subject,
      detail: c.subject,
      at: c.at,
      category: c.type,
      status: c.status,
      direction: c.direction,
      recipient: rota.clients
        .find((client) => client.id === c.clientId)
        ?.file?.contacts?.find((contact) => contact.id === c.contactId)?.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      updatedBy: c.updatedBy,
    }),
  );
  return {
    ...data,
    people,
    rota,
    journal: {
      entries: appendDemo(data.journal?.entries, entries),
      tasks: appendDemo(data.journal?.tasks, tasks),
      events: data.journal?.events ?? [],
    },
    staffPortal: {
      concerns: appendDemo(data.staffPortal?.concerns, concerns),
      communications: appendDemo(data.staffPortal?.communications, communications),
      events: appendDemo(data.staffPortal?.events, events),
    },
  };
}
