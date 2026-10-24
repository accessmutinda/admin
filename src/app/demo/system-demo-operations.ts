import type { Person, WorkspaceData } from '../features/management/shared/management.store';
import { DEMO_EMAIL } from '../core/auth/fixtures';
import { staffRecord } from '../features/management/people/hr.models';
import { emptyLocation } from '../features/management/locations/locations.models';
import {
  emptyEcm,
  type EcmEscalation,
  type EcmEvidence,
  type EcmRecord,
  type DemoNotification,
} from '../features/management/ecm/ecm.models';
import {
  addDays,
  londonDate,
  londonInstant,
  type RotaVisit,
} from '../features/management/rota/rota.models';
import { appendDemo, demoAt, demoId } from './system-demo-utils';

export function seedSystemOperations(
  data: WorkspaceData,
  today: string,
  now: number,
): WorkspaceData {
  const template = data.people.find((person) => person.id === 'care-demo-staff-0')!;
  const saved = data.people.find((person) => person.email.toLowerCase() === DEMO_EMAIL);
  const jane: Person = saved ?? {
    ...structuredClone(template),
    id: demoId('staff-jane'),
    name: 'Jane Doe',
    email: DEMO_EMAIL,
    notes: ['Fictional staff record for the standard demo login.'],
  };
  if (!saved) {
    const hr = staffRecord(jane);
    hr.reference = 'DEMO-STF-JANE';
    hr.personal.firstName = 'Jane';
    hr.personal.surname = 'Doe';
    hr.personal.photo = '/demo/images/staff-sophie.webp';
    hr.actions = [
      {
        id: demoId('jane-action'),
        title: 'Complete demo care-plan review',
        owner: 'Jane Doe',
        due: addDays(today, 3),
        status: 'Open',
        evidence: '',
      },
    ];
    hr.requests = [
      {
        id: demoId('jane-request'),
        title: 'Confirm next supervision availability',
        at: demoAt(today, -1),
        status: 'Open',
      },
    ];
    jane.hr = hr;
  }
  const people = appendDemo(data.people, saved ? [] : [jane]);
  const rota = data.rota!;
  const clients = rota.clients.filter((client) => client.active);
  const planned: RotaVisit[] = [];
  for (let day = 0; day < 14; day++)
    for (let slot = 0; slot < 2; slot++) {
      const client = clients[(day + slot) % clients.length],
        date = addDays(today, day - 3);
      const call = rota.calls.find((item) => item.clientId === client.id && item.active)!;
      const start = slot === 0 ? '10:00' : '14:00',
        end = slot === 0 ? '11:00' : '15:00';
      planned.push({
        id: demoId('jane-visit-' + day + '-' + slot),
        clientId: client.id,
        clientName: client.name,
        address: client.address,
        callId: call.id,
        callName: call.name,
        date,
        start,
        end,
        carers: 1,
        skills: [],
        tasks: 'Demo visit: provide the recorded support and complete the care note.',
        staffIds: [jane.id],
        allocation: slot ? 'Temporary' : 'Regular',
        state: day < 10 ? 'Published' : 'Draft',
        priority: 'Standard',
        exception: '',
        demo: true,
        attendance:
          date < today
            ? [
                {
                  personId: jane.id,
                  start: londonInstant(date, start)!,
                  end: londonInstant(date, end)!,
                },
              ]
            : [],
      });
    }
  const time = (at: number) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(at);
  const staff = people.filter((person) => /^care-demo-staff-\d+$/.test(person.id));
  const live: RotaVisit[] = [-100, -30, -15, 20, 60].map((offset, index) => {
    const at = now + offset * 60000,
      finish = at + 45 * 60000,
      client = clients[index % clients.length];
    const person = staff[index % staff.length],
      call = rota.calls.find((item) => item.clientId === client.id && item.active)!;
    return {
      id: demoId('live-visit-' + index),
      clientId: client.id,
      clientName: client.name,
      address: client.address,
      callId: call.id,
      callName: call.name,
      date: londonDate(new Date(at)),
      start: time(at),
      end: time(finish),
      carers: 1,
      skills: [],
      tasks: 'Fictional live-monitoring example.',
      staffIds: [person.id],
      allocation: 'Regular',
      state: 'Published',
      priority: index === 2 ? 'High' : 'Standard',
      exception: '',
      demo: true,
      attendance:
        index === 0
          ? [
              {
                personId: person.id,
                start: new Date(at).toISOString(),
                end: new Date(finish).toISOString(),
              },
            ]
          : index === 1
            ? [{ personId: person.id, start: new Date(at + 3 * 60000).toISOString(), end: '' }]
            : [],
    };
  });
  const ecm = rota.ecm ?? emptyEcm();
  const records: EcmRecord[] = live.slice(0, 3).map((visit, index) => ({
    id: demoId('ecm-record-' + index),
    visitId: visit.id,
    at: new Date(now - 5 * 60000).toISOString(),
    user: 'Demo care coordinator',
    action: index === 2 ? 'Record delay notification' : 'Manager note',
    note: 'Fictional live-care review note.',
    contact: 'Demo care worker',
    outcome: index === 2 ? 'Demo ETA recorded; follow-up due.' : 'Demo monitoring review recorded.',
    eta: index === 2 ? time(now + 10 * 60000) : '',
    accepted: true,
    concern: index === 2,
    followUp: index === 2 ? 'Review the demo arrival status.' : '',
  }));
  const notifications: DemoNotification[] = live.slice(0, 3).map((visit, index) => ({
    id: demoId('notification-' + index),
    visitId: visit.id,
    at: demoAt(today),
    user: 'Demo care coordinator',
    recipient: 'family@example.test',
    channel: 'In-app',
    subject: 'DEMO - care visit update',
    body: 'Fictional notification record; no external message was sent.',
    state: index === 2 ? 'Queued' : 'Delivered',
    attempts: index === 2 ? 0 : 1,
    updatedAt: demoAt(today),
    error: '',
  }));
  const escalations: EcmEscalation[] = [
    {
      id: demoId('ecm-escalation'),
      visitId: live[2].id,
      at: new Date(now).toISOString(),
      ownerId: staff[0].id,
      severity: 'Priority',
      state: 'In review',
      note: 'Fictional demo delay review.',
      dueAt: new Date(now + 15 * 60000).toISOString(),
      resolution: '',
      history: [
        {
          at: new Date(now).toISOString(),
          user: 'Demo care coordinator',
          note: 'Demo follow-up assigned.',
        },
      ],
    },
  ];
  const evidence: EcmEvidence[] = live.slice(0, 2).map((visit, index) => ({
    id: demoId('visit-evidence-' + index),
    visitId: visit.id,
    at: demoAt(today),
    user: 'Demo care worker',
    type: index ? 'Other concern' : 'Care note',
    note: index
      ? 'Fictional wellbeing observation queued for review.'
      : 'Fictional care note: planned support completed and wellbeing recorded.',
    photo: index ? '' : '/demo/images/activity-garden.jpg',
    photoName: index ? '' : 'Demo garden activity.jpg',
  }));
  const locations = ['Harrow Community Team', 'Wembley Service Branch', 'Pinner Outreach Team'].map(
    (name, index) => ({
      ...emptyLocation(),
      id: demoId('location-' + index),
      name,
      code: 'DEMO-BR-' + (index + 1),
      type: index === 2 ? 'Outreach Service' : 'Domiciliary Care',
      region: 'Greater London',
      address: {
        line1: 24 + index * 10 + ' Example Street',
        line2: 'Demo branch office',
        city: 'London',
        county: 'Greater London',
        postcode: ['HA1 1AA', 'HA0 1AB', 'HA5 1AX'][index],
        country: 'United Kingdom',
      },
      registeredPlaces: 0,
      manager: staff[index].name,
      managerEmail: staff[index].email,
      managerPhone: '07700 900300',
      phone: '07700 90030' + index,
      email: 'branch.' + index + '@example.test',
      hours: 'Monday-Sunday 07:00-21:00',
      services: ['Personal care', 'Medication support', 'Companionship'],
      status: index === 2 ? 'Pending Review' : 'Active',
      modifiedAt: demoAt(today, -7),
      modifiedBy: 'Demo company administrator',
    }),
  );
  const familyClients = rota.clients.map((client, index) => {
    if (!client.id.startsWith('care-demo-client-') || !client.file) return client;
    const file = client.file;
    return {
      ...client,
      billingRate: client.billingRate ?? 42,
      billingBasis: client.billingBasis ?? ('Visit hour' as const),
      file: {
        ...file,
        familyAccess: appendDemo(
          file.familyAccess,
          index === 0 && file.sections['consent']?.['family'] === 'Agreed'
            ? [
                {
                  id: demoId('family-jane'),
                  name: 'Jane Doe',
                  email: DEMO_EMAIL,
                  relationship: 'Demo family representative',
                  status: 'Active' as const,
                  scopes: [
                    'Care plan',
                    'Medication',
                    'Visits',
                    'Notes',
                    'Invoices',
                    'Messages',
                    'Documents',
                    'Photos',
                  ] as import('../features/management/care/care.models').FamilyScope[],
                  at: demoAt(today, -1),
                },
              ]
            : [],
        ),
      },
    };
  });
  return {
    ...data,
    people,
    locations: appendDemo(data.locations, locations),
    rota: {
      ...rota,
      clients: familyClients,
      visits: appendDemo(appendDemo(rota.visits, planned), live),
      ecm: {
        ...ecm,
        records: appendDemo(ecm.records, records),
        notifications: appendDemo(ecm.notifications, notifications),
        escalations: appendDemo(ecm.escalations, escalations),
        evidence: appendDemo(ecm.evidence, evidence),
      },
    },
  };
}
