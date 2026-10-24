import {
  CHECKS,
  COURSES,
  ONBOARDING,
  Person,
  StaffDocument,
  WorkspaceData,
} from '../shared/management.store';
import { DAYS, staffRecord, today } from './hr.models';

const PEOPLE = [
  ['Sarah Mitchell', 'Care Worker', 'London', 'Active'],
  ['Daniel Foster', 'Senior Carer', 'London', 'Active'],
  ['Emma Clarke', 'Registered Nurse', 'Manchester', 'Active'],
  ['Priya Nair', 'Care Worker', 'Leeds', 'Active'],
  ['Michael Osei', 'Support Worker', 'Manchester', 'Active'],
  ['Laura Jenkins', 'Team Leader', 'Leeds', 'Active'],
  ['Thomas Reed', 'Care Worker', 'London', 'Onboarding'],
  ['Grace Wilson', 'Care Worker', 'Manchester', 'Onboarding'],
  ['Ravi Singh', 'Senior Carer', 'Leeds', 'Onboarding'],
  ['Emily Turner', 'Care Worker', 'London', 'Onboarding'],
  ['Noah Evans', 'Support Worker', 'Manchester', 'Inactive'],
  ['Olivia Brown', 'Care Worker', 'Leeds', 'Left'],
] as const;
const offset = (day: string, days: number): string =>
  new Date(Date.parse(day + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);
const document = (
  id: string,
  name: string,
  day: string,
  expiry: string,
  requirement: string,
): StaffDocument => ({
  id,
  name: 'SAMPLE · ' + name,
  type: 'text/plain',
  content:
    'data:text/plain;base64,' +
    btoa(
      'SAMPLE DOCUMENT\nFictional workforce demonstration only. Not valid employment, identity, training or compliance evidence.\n' +
        name,
    ),
  category: 'Compliance',
  requirement,
  requirementId: id,
  uploadedAt: day,
  expiry,
  status: 'Verified',
  reviewedBy: 'Sample HR reviewer',
  reviewedAt: day,
  version: 1,
});
export function seedHrDemo(data: WorkspaceData, day = today()): WorkspaceData {
  if (data.hrDemoVersion === 1) return data;
  const reserved = new Set(data.people.map((p) => p.id));
  const emails = new Set(data.people.map((p) => p.email.trim().toLowerCase()));
  const references = new Set(data.people.map((p) => p.hr?.reference.toLowerCase()).filter(Boolean));
  const people: Person[] = [];
  PEOPLE.forEach(([name, role, location, status], i) => {
    const id = 'hr-sample-' + (i + 1).toString().padStart(2, '0'),
      reference = 'SAMPLE-STF-' + (i + 1).toString().padStart(3, '0');
    const email = name.toLowerCase().replaceAll(' ', '.') + '.sample@example.test';
    if (reserved.has(id) || emails.has(email) || references.has(reference.toLowerCase())) return;
    const settled = status !== 'Onboarding';
    const p: Person = {
      id,
      name,
      email,
      role,
      location,
      stage: 'Hired',
      vacancy: role,
      start: offset(day, settled ? -240 : -10),
      notes: ['Fictional sample employee for workspace demonstrations.'],
      checks: CHECKS.map(() => false),
      onboarding: ONBOARDING.map(() => false),
      learning: COURSES.filter((c) => c.category === 'Mandatory' || c.id === 'medication').map(
        (c) => c.id,
      ),
      progress: {},
      documents: [],
    };
    const h = staffRecord(p);
    p.hr = h;
    h.reference = reference;
    h.status = status;
    h.personal = {
      ...h.personal,
      firstName: name.split(' ')[0],
      surname: name.split(' ').slice(1).join(' '),
      birthDate: `${1980 + i}-04-12`,
      phone: '07700 900' + (100 + i).toString(),
      address: `${i + 1} Sample Street`,
      postcode: location === 'London' ? 'SW1A 1AA' : location === 'Leeds' ? 'LS1 1UR' : 'M1 1AE',
      town: location,
      emergencyName: 'Sample emergency contact',
      emergencyPhone: '07700 900200',
      emergencyRelationship: 'Sibling',
      languages: i % 3 === 0 ? 'English, French' : 'English',
      driver: i % 2 === 0,
      vehicle: i % 2 === 0 ? 'Sample vehicle · insurance to be checked' : '',
      additionalNotes:
        'SAMPLE RECORD · Fictional person. Do not use as actual employment or care evidence.',
    };
    h.employment = {
      ...h.employment,
      type: i % 3 === 0 ? 'Part time' : 'Full time',
      department: 'Care delivery',
      manager: 'Sample Registered Manager',
      hours: i % 3 === 0 ? 24 : 37.5,
      rate: role === 'Registered Nurse' ? 24 : role === 'Team Leader' ? 18 : 14.5,
      payrollNumber: 'SAMPLE-PAY-' + (i + 1),
      probationMonths: 6,
      noticeWeeks: 4,
      history: 'Sample care employment history, entered for demonstration.',
      gaps: 'No gaps in the fictional employment timeline.',
    };
    h.checks = CHECKS.map((title, j) => {
      const verified = settled || j < 2;
      const expiry =
        i === 6 && j === 0
          ? offset(day, -7)
          : i === 7 && j === 0
            ? offset(day, 14)
            : offset(day, 240 + j * 10);
      const evidence = document(id + '-check-' + j, title, offset(day, -60), expiry, title);
      if (verified) p.documents!.push(evidence);
      return {
        id: 'sample-check-' + j,
        title,
        status: verified ? 'Verified' : j === 2 ? 'Pending' : 'Not started',
        completed: verified ? offset(day, -60) : '',
        expiry: verified ? expiry : '',
        reviewer: verified ? 'Sample HR reviewer' : '',
        documentId: verified ? evidence.id : '',
        note: 'SAMPLE · Demonstration employment check; not real verification.',
      };
    });
    h.induction = h.induction.map((t, j) => ({ ...t, complete: settled || j < i % 4 }));
    h.training = h.training.map((t, j) => ({
      ...t,
      completed: settled ? offset(day, -45) : '',
      expiry: settled ? offset(day, 300) : '',
      assessor: settled ? 'Sample training assessor' : '',
      competency: settled ? 'Competent' : 'Not assessed',
      score: settled ? 88 + (i % 10) : null,
      certificateId: '',
    }));
    h.availability = DAYS.map((day, j) => ({
      day,
      start: j < 5 ? '07:00' : '',
      end: j < 5 ? '19:00' : '',
      preference: j < 5 ? 'Available' : 'Unavailable',
    }));
    h.preferences = {
      areas: location,
      travel: 'Up to 10 miles',
      shifts: i % 2 ? 'Evening' : 'Morning',
      notes: 'Sample preferences; confirm before allocating real care.',
      clientGroups: ['Adults'],
      liveIn: 'No',
    };
    h.references = [
      {
        id: id + '-reference',
        name: 'Sample previous employer',
        organisation: 'Example Care Provider',
        email: 'reference@example.test',
        status: settled ? 'Verified' : 'Requested',
      },
    ];
    h.actions = [
      {
        id: id + '-action',
        title: settled ? 'Annual development conversation' : 'Complete starter evidence',
        owner: 'Sample HR team',
        due: offset(day, i === 8 ? -3 : 14 + i),
        status: settled ? 'Completed' : 'Open',
        evidence: settled ? 'Sample discussion record' : '',
      },
    ];
    h.notes = [
      {
        id: id + '-note',
        at: day + 'T09:00:00.000Z',
        author: 'Sample HR team',
        text: 'SAMPLE RECORD · Created to demonstrate People & HR workflows.',
        reflective: false,
      },
    ];
    h.audit = [
      {
        id: id + '-created',
        at: day + 'T09:00:00.000Z',
        actor: 'Sample data setup',
        action: 'Created fictional sample staff record',
      },
    ];
    h.bookings = settled
      ? []
      : [
          {
            id: id + '-booking',
            courseId: 'safeguarding',
            date: offset(day, 7),
            provider: 'Sample training provider',
            type: 'Training',
            status: 'Scheduled',
          },
        ];
    p.checks = h.checks.map((c) => c.status === 'Verified');
    p.checkExpiry = Object.fromEntries(h.checks.map((c) => [c.title, c.expiry]));
    p.onboarding = h.induction.map((t) => t.complete);
    p.progress = Object.fromEntries(h.training.map((t) => [t.courseId, settled ? 100 : 0]));
    people.push(p);
  });
  return {
    ...data,
    hrDemoVersion: 1,
    people: [...data.people, ...people],
    leaves: [
      ...data.leaves,
      ...people.slice(0, 4).map((p, i) => ({
        id: p.id + '-leave',
        personId: p.id,
        person: p.name,
        type: 'Annual leave',
        start: offset(day, 5 + i * 3),
        end: offset(day, 7 + i * 3),
        status: i === 0 ? ('Pending' as const) : ('Approved' as const),
      })),
    ],
    reviews: [
      ...data.reviews,
      ...people.slice(0, 6).map((p, i) => ({
        id: p.id + '-review',
        personId: p.id,
        person: p.name,
        type: i % 2 ? 'Appraisal' : 'Supervision',
        date: offset(day, i === 0 ? -2 : 7 + i * 3),
        status: i === 0 ? 'Completed' : 'Scheduled',
        ...(i === 0
          ? {
              score: 88,
              competencies: [
                { title: 'Communication', score: 90 },
                { title: 'Care documentation', score: 86 },
              ],
            }
          : {}),
        assessor: 'Sample Registered Manager',
        discussion: i === 0 ? 'Sample wellbeing and development discussion.' : '',
        outcome: i === 0 ? 'Sample learning goals agreed.' : '',
        completedAt: i === 0 ? offset(day, -2) + 'T10:00:00.000Z' : '',
      })),
    ],
    cpd: [
      ...data.cpd,
      ...people.slice(0, 3).map((p) => ({
        id: p.id + '-cpd',
        personId: p.id,
        activity: 'Sample reflective learning session',
        hours: 1.5,
        date: offset(day, -14),
        reflection: 'Fictional reflection for demonstrating the CPD record.',
      })),
    ],
  };
}
