import { effect, Injector, untracked } from '@angular/core';
import {
  ManagementStore,
  MODULES,
  type WorkspaceData,
  type Vacancy,
} from '../features/management/shared/management.store';
import { seedHrDemo } from '../features/management/people/hr-demo-data';
import { seedCareDemo } from './care-demo';
import { seedSystemOperations } from './system-demo-operations';
import { seedSystemFinance } from './system-demo-finance';
import { seedSystemQuality } from './system-demo-quality';
import { seedStaffPortal } from './staff-portal-demo';
import { seedSystemCommunications } from './system-demo-communications';
import { seedSystemAcademy } from './system-demo-academy';
import { seedSystemCompany } from './system-demo-company';
import { addDays, londonDate } from '../features/management/rota/rota.models';
import { WorkspaceService } from '../core/auth/workspace.service';
import { DEMO_EMAIL, WORKSPACES } from '../core/auth/fixtures';
import {
  appendDemo,
  demoAt,
  demoId,
  DEMO_WORKSPACES,
  SYSTEM_DEMO_VERSION,
} from './system-demo-utils';

export function seedSystemDemo(
  data: WorkspaceData,
  today = londonDate(),
  now = Date.now(),
): WorkspaceData {
  if (data.systemDemoVersion === SYSTEM_DEMO_VERSION) return data;
  let next = seedHrDemo(seedCareDemo(data, today), today);
  next = seedSystemOperations(next, today, now);
  next = seedSystemFinance(next, today);
  next = seedSystemQuality(next, today);
  next = seedStaffPortal(seedSystemCommunications(next, today), today);
  next = seedSystemAcademy(next, today);
  const vacancies: Vacancy[] = [
    'Community Care Worker',
    'Senior Care Worker',
    'Field Supervisor',
    'Care Coordinator',
    'Weekend Support Worker',
  ].map((title, index) => ({
    id: demoId('vacancy-' + index),
    title,
    location: ['Harrow', 'Wembley', 'Pinner'][index % 3],
    type: index === 4 ? 'Part time' : 'Full time',
    salary: index === 0 || index === 4 ? '£14.50-£16.00 per hour' : '£28,000-£34,000 per year',
    description:
      'Fictional demo vacancy: join the community care team, support individual care plans and complete the agreed induction programme.',
    published: index !== 4,
    goLiveDate: addDays(today, -14),
    closingDate: addDays(today, 14 + index * 7),
    fields: [
      {
        id: demoId('application-experience-' + index),
        label: 'Relevant care experience',
        type: 'textarea',
        required: true,
      },
    ],
    documents: [],
  }));
  const applicants = [
    'Hannah Lewis',
    'David Okafor',
    'Meera Patel',
    'Daniel Hughes',
    'Lucy Grant',
    'Adam Khan',
  ].map((name, index) => ({
    id: demoId('applicant-' + index),
    name,
    email: name.toLowerCase().replace(' ', '.') + '@example.test',
    role: vacancies[index % vacancies.length].title,
    location: vacancies[index % vacancies.length].location,
    stage: ['Applied', 'Interview', 'Offer'][index % 3],
    vacancy: vacancies[index % vacancies.length].title,
    vacancyId: vacancies[index % vacancies.length].id,
    start: '',
    notes: ['Fictional application for the recruitment demonstration.'],
    checks: Array(7).fill(false),
    onboarding: Array(8).fill(false),
    learning: [],
    progress: {},
    documents: [],
    application: {
      submitted: demoAt(today, -index - 1),
      phone: '07700 90040' + index,
      answers: [
        {
          fieldId: demoId('application-experience-' + (index % vacancies.length)),
          label: 'Relevant care experience',
          value:
            'Fictional applicant with community care experience and an interest in person-centred support.',
        },
      ],
    },
  }));
  const staff = next.people.filter((person) => person.stage === 'Hired');
  return {
    ...next,
    systemDemoVersion: SYSTEM_DEMO_VERSION,
    people: appendDemo(next.people, applicants),
    vacancies: appendDemo(next.vacancies, vacancies),
    members: appendDemo(next.members, [
      {
        id: demoId('member-admin'),
        name: 'Alex Morgan',
        email: 'admin@example.test',
        role: 'Company Admin',
        status: 'Active',
        department: 'Company administration',
        mfaEnabled: true,
        lastLoginAt: demoAt(today),
      },
      {
        id: demoId('member-manager'),
        name: 'Demo Registered Manager',
        email: 'manager@example.test',
        role: 'Registered Manager',
        status: 'Active',
        mfaEnabled: true,
      },
      {
        id: demoId('member-jane'),
        name: 'Jane Doe',
        email: DEMO_EMAIL,
        role: 'Care Worker',
        status: 'Active',
      },
      {
        id: demoId('member-coordinator'),
        name: 'Demo Care Coordinator',
        email: 'coordinator@example.test',
        role: 'Care Coordinator',
        status: 'Active',
      },
      {
        id: demoId('member-finance'),
        name: 'Demo Finance Officer',
        email: 'finance@example.test',
        role: 'Finance Officer',
        status: 'Active',
      },
      {
        id: demoId('member-inspector'),
        name: 'Demo Inspector',
        email: 'inspector@example.test',
        role: 'Inspector / Commissioner',
        status: 'Active',
      },
      {
        id: demoId('member-training'),
        name: 'Demo Training Manager',
        email: 'training@example.test',
        role: 'Training Manager',
        status: 'Active',
      },
      {
        id: demoId('member-invite'),
        name: 'Demo New Starter',
        email: 'starter@example.test',
        role: 'Care Worker',
        status: 'Invited',
      },
    ]),
    leaves: appendDemo(
      next.leaves,
      staff.slice(0, 3).map((person, index) => ({
        id: demoId('leave-' + index),
        personId: person.id,
        person: person.name,
        type: index === 2 ? 'Training' : 'Annual leave',
        start: addDays(today, 12 + index * 7),
        end: addDays(today, 14 + index * 7),
        status: index === 0 ? 'Pending' : 'Approved',
      })),
    ),
    reviews: appendDemo(
      next.reviews,
      staff.slice(0, 6).map((person, index) => ({
        id: demoId('review-' + index),
        personId: person.id,
        person: person.name,
        type: index % 2 ? 'Appraisal' : 'Supervision',
        date: addDays(today, index === 0 ? -7 : 3 + index * 2),
        status: index === 0 ? 'Completed' : 'Scheduled',
        assessor: 'Demo registered manager',
        discussion:
          index === 0 ? 'Fictional supervision covering wellbeing, practice and development.' : '',
        outcome: index === 0 ? 'Demo development goals agreed.' : '',
      })),
    ),
    cpd: appendDemo(
      next.cpd,
      staff.slice(0, 8).map((person, index) => ({
        id: demoId('cpd-' + index),
        personId: person.id,
        activity: 'Demo reflective care-practice session',
        hours: 1.5,
        date: addDays(today, -14 + index),
        reflection: 'Fictional reflection on communication, dignity and timely recording.',
      })),
    ),
    apiKeys: appendDemo(next.apiKeys, [
      {
        id: demoId('inactive-integration-key'),
        name: 'DEMO ONLY - integration placeholder, not a usable credential',
        created: demoAt(today, -14),
      },
    ]),
  };
}

const demoInstallations = new WeakSet<Injector>();

export function installSystemDemo(injector: Injector): void {
  if (demoInstallations.has(injector)) return;
  demoInstallations.add(injector);
  const store = injector.get(ManagementStore);
  const workspace = injector.get(WorkspaceService);
  effect(
    () => {
      const id = store.companyId(),
        data = store.data();
      if (!DEMO_WORKSPACES.includes(id) || data.systemDemoVersion === SYSTEM_DEMO_VERSION) return;
      untracked(() => {
        const seeded = seedSystemDemo(data);
        const fixture = WORKSPACES.find((provider) => provider.id === id)!;
        const company = store.company() ?? {
          id,
          name: fixture.name,
          code: fixture.shortCode,
          sector: fixture.careType,
          size: '11–50 staff',
          registration: 'DEMO-REG-' + fixture.shortCode,
          postcode: 'HA1 1AA',
          color: '#093252',
          accent: '#008afa',
          tagline: 'Demonstration care provider',
          logo: '',
          modules: [...MODULES],
        };
        const provider = seedSystemCompany(company, seeded, londonDate());
        if (!store.saveCompany(provider)) return;
        if (store.saveWorkspace(() => seeded))
          workspace.registerWorkspace({
            ...fixture,
            logoUrl: provider.logo || undefined,
            serviceUserCount: seeded.rota!.clients.filter((client) => client.active).length,
          });
      });
    },
    { injector },
  );
}
