import { DEMO_WORKSPACES } from './system-demo-utils';
import { installDemoImages } from './care-demo-images';
import { seedCareProfiles } from './care-demo-profiles';
import { effect, Injector } from '@angular/core';
import {
  COURSES,
  ManagementStore,
  type Person,
  type WorkspaceData,
} from '../features/management/shared/management.store';
import { staffRecord } from '../features/management/people/hr.models';
import { emptyClientFile } from '../features/management/clients/client-file.models';
import {
  addDays,
  emptyRota,
  londonDate,
  londonInstant,
  type RotaCall,
  type RotaClient,
  type RotaVisit,
} from '../features/management/rota/rota.models';
import { emptyEcm } from '../features/management/ecm/ecm.models';

const VERSION = 2;
const PREFIX = 'care-demo-';
const STAFF = [
  'Sarah Clarke',
  'James Turner',
  'Priya Desai',
  'Mark Wilson',
  'Arthur Brown',
  'Laura Thomas',
  'Kelly Stevens',
  'Samir Patel',
];
const CLIENTS = [
  ['Arthur Bennett', 'Harrow', 'HA1 1AA', 'Personal care', '1938-04-12'],
  ['Mary Wilson', 'Wembley', 'HA0 1AB', 'Medication support', '1942-07-19'],
  ['James Carter', 'Kenton', 'HA3 8AZ', 'Mobility support', '1940-02-24'],
  ['Dorothy Clarke', 'Pinner', 'HA5 1AX', 'Dementia support', '1936-11-08'],
  ['Margaret Williams', 'Ruislip', 'HA4 7AB', 'Companionship', '1939-08-14'],
  ['Evelyn Hughes', 'Harrow', 'HA2 0AA', 'Personal care', '1944-03-06'],
  ['George Evans', 'Kenton', 'HA3 0AA', 'Medication support', '1937-09-22'],
  ['Joan Thompson', 'Wembley', 'HA9 7AB', 'Mobility support', '1946-01-30'],
  ['Albert Morris', 'Pinner', 'HA5 3AB', 'Companionship', '1941-06-11'],
  ['Rose Ahmed', 'Ruislip', 'HA4 8AB', 'Personal care', '1948-12-03'],
];
const TYPES = ['Personal care', 'Medication', 'Domestic', 'Social'];

function carers(today: string): Person[] {
  return STAFF.map((name, index) => {
    const person: Person = {
      id: PREFIX + 'staff-' + index,
      name,
      email: name.toLowerCase().replaceAll(' ', '.') + '@example.test',
      role: 'Care Worker',
      location: CLIENTS[index][1],
      stage: 'Hired',
      vacancy: '',
      start: addDays(today, -365),
      notes: ['Fictional demonstration record.'],
      checks: Array(7).fill(true),
      onboarding: Array(8).fill(true),
      learning: COURSES.map((course) => course.id),
      progress: Object.fromEntries(COURSES.map((course) => [course.id, 100])),
      documents: [],
    };
    const hr = staffRecord(person);
    hr.status = 'Active';
    hr.personal.gender = index % 3 === 0 ? 'Male' : 'Female';
    hr.personal.driver = index % 3 !== 1;
    hr.personal.languages = 'English';
    hr.employment.hours = index === 0 ? 16 : 40;
    hr.employment.type = 'Permanent';
    hr.employment.rate = 14.5;
    hr.employment.department = 'Community care';
    hr.availability = hr.availability.map((day) => ({
      ...day,
      start: '07:00',
      end: '21:00',
      preference: 'Available',
    }));
    hr.training = hr.training.map((training) => ({
      ...training,
      completed: addDays(today, -90),
      expiry: addDays(today, 275),
      competency: 'Competent',
      assessor: 'Demo training assessor',
    }));
    hr.checks = hr.checks.map((check) => ({
      ...check,
      status: 'Verified',
      completed: addDays(today, -180),
      expiry: addDays(today, 185),
      reviewer: 'Demo compliance reviewer',
    }));
    person.hr = hr;
    return person;
  });
}

function serviceUsers(today: string): RotaClient[] {
  return CLIENTS.map(([name, area, postcode, need, dob], index) => {
    const file = emptyClientFile();
    file.updatedAt = today + 'T09:00:00Z';
    file.details = {
      dob,
      gender: index % 3 === 0 ? 'Male' : 'Female',
      language: 'English',
      ethnicity: 'Not recorded',
      living: index % 2 ? 'Lives with family' : 'Lives alone',
      gp: 'Demo Community Practice · ' + area,
      about:
        'Fictional demonstration profile. Enjoys conversation, familiar routines and time with family.',
      likes: 'Music, gardening and a cup of tea',
      dislikes: 'Feeling rushed',
    };
    file.sections = {
      diagnoses: {
        primary: need,
        communication: 'Use clear language and allow time to respond.',
        diet: 'Regular meals and drinks; preferences checked at each visit.',
      },
      plan: {
        name: name + ' · Personalised care plan',
        status: index === 9 ? 'Archived' : 'Active',
        start: addDays(today, -60),
        review: addDays(today, index === 3 ? -3 : 30),
        needs: need,
        support: 'Promote independence, explain each task and record the support provided.',
      },
      support: {
        personal: 'Support with washing and dressing as agreed.',
        nutrition: 'Prepare meals and encourage fluids.',
        gender: 'Any',
      },
      moving: {
        support: index === 2 ? 'Two people' : 'One person',
        equipment: index % 2 ? 'Walking frame' : 'None recorded',
        instructions:
          'Follow the assessed mobility plan and check the environment before each transfer.',
        assessed: addDays(today, -30),
        review: addDays(today, 60),
      },
      capacity: {
        status: index === 3 ? 'Fluctuates' : 'Has capacity',
        support: 'Explain choices and allow time for decisions.',
      },
      access: {
        location: 'Front door',
        instructions: 'Knock and introduce yourself. Fictional address for demonstration.',
      },
    };
    file.entries = {
      risks: [
        {
          id: PREFIX + 'risk-' + index,
          name: index === 2 ? 'Falls risk' : 'Daily wellbeing',
          detail: 'Follow the care plan, promote independence and report changes.',
          date: today,
          level: index === 2 ? 'High' : 'Low',
          status: 'Active',
        },
      ],
    };
    file.contacts = [
      {
        id: PREFIX + 'contact-' + index,
        name: ['Emma', 'Daniel', 'Sophie', 'Michael'][index % 4] + ' ' + name.split(' ').at(-1),
        relationship: 'Family member',
        type: 'Family',
        phone: '07700 900' + String(index).padStart(3, '0'),
        email: 'family.' + index + '@example.test',
        nextOfKin: true,
      },
    ];
    return {
      id: PREFIX + 'client-' + index,
      name,
      reference: 'DEMO-SU-' + String(index + 1).padStart(3, '0'),
      address: 12 + index * 4 + ' Example Road, ' + area,
      postcode,
      funding: index % 3 === 0 ? 'Local authority' : index % 3 === 1 ? 'Private' : 'NHS',
      priority: index === 2 || index === 3 ? 'High' : 'Standard',
      active: index < 9,
      phone: '07700 900' + String(index + 10).padStart(3, '0'),
      email: 'service.user.' + index + '@example.test',
      riskFlags:
        index === 3 ? ['Dementia', 'Living alone'] : index === 1 ? ['Medication support'] : [],
      file,
    };
  });
}

export function seedCareDemo(data: WorkspaceData, today = londonDate()): WorkspaceData {
  if (data.careDemoVersion === VERSION) return data;
  if (data.careDemoVersion === 1)
    return seedCareProfiles({ ...data, careDemoVersion: VERSION }, today);
  const start = addDays(today, -((new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7));
  const people = carers(today);
  const clients = serviceUsers(today);
  const calls: RotaCall[] = clients
    .filter((client) => client.active)
    .flatMap((client, index) =>
      TYPES.map((name, type) => ({
        id: PREFIX + 'call-' + index + '-' + type,
        clientId: client.id,
        name,
        start: ['08:00', '12:00', '17:00', '19:00'][type],
        end: ['09:30', '13:30', '18:00', '20:00'][type],
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        carers: 1,
        skills: name === 'Medication' ? ['medication'] : [],
        regularStaffIds: [people[index % people.length].id],
        tasks: 'Demonstration visit: follow the personalised care plan.',
        active: true,
        timeSensitive: name === 'Medication',
        location: 'Home',
        taskType: name,
      })),
    );
  const visits: RotaVisit[] = [];
  for (let week = 0; week < 2; week++) {
    for (let day = 0; day < 7; day++) {
      const date = addDays(start, week * 7 + day);
      for (let slot = 0; slot < 2; slot++) {
        people.forEach((person, index) => {
          const clientIndex = (index + day + slot) % 8;
          const type = (index + day + slot) % 4;
          const client = clients[clientIndex];
          const call = calls.find(
            (item) => item.clientId === client.id && item.name === TYPES[type],
          )!;
          const missing = (day * 16 + slot * 8 + index) % 12 === 0;
          const coverLeave = index === 6 && day >= 5;
          visits.push({
            ...call,
            id: PREFIX + 'visit-' + week + '-' + day + '-' + slot + '-' + index,
            callId: call.id,
            clientName: client.name,
            address: client.address,
            callName: call.name,
            date,
            start: coverLeave ? (slot === 0 ? '10:00' : '14:00') : slot === 0 ? '08:00' : '12:00',
            end: coverLeave ? (slot === 0 ? '11:30' : '15:30') : slot === 0 ? '09:30' : '13:30',
            staffIds: missing ? [] : [coverLeave ? people[7].id : person.id],
            allocation: 'Regular',
            state: week === 0 ? 'Published' : 'Draft',
            priority: call.timeSensitive ? 'High' : 'Standard',
            attendance: [],
            exception: '',
            demo: true,
          });
        });
      }
      const extras = day === 0 ? 4 : 2;
      for (let extra = 0; extra < extras; extra++) {
        const client = clients[(day + extra + 2) % 8];
        const call = calls.find((item) => item.clientId === client.id && item.name === 'Social')!;
        const double = extra === 0 || (day === 0 && extra === 1);
        const staffIds = double
          ? [people[extra * 2].id, people[extra * 2 + 1].id]
          : [people[4 + extra].id];
        visits.push({
          ...call,
          id: PREFIX + 'extra-' + week + '-' + day + '-' + extra,
          callId: call.id,
          clientName: client.name,
          address: client.address,
          callName: call.name,
          date,
          start: '17:00',
          end: '18:00',
          carers: double ? 2 : 1,
          staffIds,
          allocation: 'Regular',
          state: week === 0 ? 'Published' : 'Draft',
          priority: 'Standard',
          attendance: [],
          exception: '',
          demo: true,
        });
      }
    }
  }
  for (const visit of visits) {
    if (!visit.staffIds.length) {
      visit.state = 'Draft';
    } else if (visit.date < today) {
      visit.attendance = visit.staffIds.map((personId) => ({
        personId,
        start: londonInstant(visit.date, visit.start)!,
        end: londonInstant(visit.date, visit.end)!,
      }));
    }
  }
  const existing = data.rota ?? emptyRota();
  const appendMissing = <T extends { id: string }>(current: T[], added: T[]): T[] => [
    ...current,
    ...added.filter((item) => !current.some((saved) => saved.id === item.id)),
  ];
  const ecm = existing.ecm ?? emptyEcm();
  const colors = ['#cce8fc', '#d1f2df', '#fff0c8', '#e7d8fa'];
  const seeded: WorkspaceData = {
    ...data,
    careDemoVersion: VERSION,
    leaves: appendMissing(data.leaves, [
      {
        id: PREFIX + 'annual-leave',
        personId: people[6].id,
        person: people[6].name,
        type: 'Annual leave',
        status: 'Approved',
        start: addDays(start, 5),
        end: addDays(start, 6),
      },
    ]),
    people: [
      ...people.filter((person) => !data.people.some((saved) => saved.id === person.id)),
      ...data.people,
    ],
    rota: {
      ...existing,
      clients: appendMissing(existing.clients, clients),
      calls: appendMissing(existing.calls, calls),
      visits: appendMissing(existing.visits, visits),
      ecm: {
        ...ecm,
        styles: {
          ...Object.fromEntries(
            TYPES.map((name, index) => [
              name,
              {
                background: colors[index],
                color: '#123352',
                label: name,
                duration: 60,
                priority: 'Standard',
                skills: name === 'Medication' ? ['medication'] : [],
                active: true,
              },
            ]),
          ),
          ...ecm.styles,
        },
      },
    },
  };
  return seedCareProfiles(seeded, today);
}

export function installCareDemo(injector: Injector): void {
  installDemoImages(injector);
  const store = injector.get(ManagementStore);
  effect(
    () => {
      if (!DEMO_WORKSPACES.includes(store.companyId()) || store.data().careDemoVersion === VERSION)
        return;
      store.saveWorkspace((data) => seedCareDemo(data));
    },
    { injector },
  );
}
