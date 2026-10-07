import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { vacancyClosed, vacancyScheduled } from '../recruitment/vacancy-deadline';
import { WorkspaceService } from '../../../core/auth/workspace.service';

export interface Company {
  id: string;
  name: string;
  code: string;
  sector: string;
  size: string;
  registration: string;
  postcode: string;
  color: string;
  accent: string;
  tagline: string;
  logo: string;
  modules: string[];
}
export interface StaffDocument {
  id: string;
  name: string;
  type: string;
  content: string;
  requirement?: string;
  requirementId?: string;
}
export interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string;
  stage: string;
  vacancy: string;
  vacancyId?: string;
  application?: {
    submitted: string;
    phone: string;
    answers: { fieldId?: string; label: string; value: string }[];
  };
  visaType?: string;
  visaExpiry?: string;
  checkExpiry?: Record<string, string>;
  documents?: StaffDocument[];
  start: string;
  notes: string[];
  checks: boolean[];
  onboarding: boolean[];
  learning: string[];
  progress: Record<string, number>;
}
export interface ApplicationField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'number' | 'date';
  required: boolean;
}
export interface DocumentRequirement {
  id: string;
  label: string;
  required: boolean;
}
export interface Vacancy {
  id: string;
  title: string;
  location: string;
  type: string;
  salary: string;
  description?: string;
  published?: boolean;
  closingDate?: string;
  goLiveDate?: string;
  fields?: ApplicationField[];
  documents?: DocumentRequirement[];
}
export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}
export interface Leave {
  id: string;
  person: string;
  type: string;
  start: string;
  end: string;
}
export interface Review {
  id: string;
  person: string;
  type: string;
  date: string;
  status: string;
}
export interface Course {
  id: string;
  title: string;
  category: string;
  icon: string;
  duration: string;
  description: string;
}
export const COURSES: Course[] = [
  {
    id: 'safeguarding',
    title: 'Safeguarding Adults',
    category: 'Mandatory',
    icon: 'shield',
    duration: '45 min',
    description: 'Recognise concerns, respond confidently and protect the people in your care.',
  },
  {
    id: 'handling',
    title: 'Moving & Handling',
    category: 'Mandatory',
    icon: 'accessibility_new',
    duration: '35 min',
    description: 'Safe movement, practical techniques and person-centred risk assessment.',
  },
  {
    id: 'medication',
    title: 'Medication Awareness',
    category: 'Clinical care',
    icon: 'medication',
    duration: '40 min',
    description: 'Support safe medication administration, recording and escalation.',
  },
  {
    id: 'dementia',
    title: 'Dementia Care',
    category: 'Clinical care',
    icon: 'psychology',
    duration: '50 min',
    description: 'Understand dementia and provide compassionate, individual support.',
  },
  {
    id: 'wellbeing',
    title: 'Mental Health Awareness',
    category: 'Development',
    icon: 'favorite',
    duration: '30 min',
    description: 'Recognise signs of distress and support wellbeing through everyday care.',
  },
  {
    id: 'infection',
    title: 'Infection Prevention',
    category: 'Mandatory',
    icon: 'health_and_safety',
    duration: '25 min',
    description: 'Build safer habits around hygiene, protective equipment and infection control.',
  },
];
export const CHECKS = [
  'Right to work',
  'DBS check',
  'Adult barred list',
  'Child barred list',
  'References',
  'Health declaration',
  'Code of conduct',
];
export const ONBOARDING = [
  'Offer accepted',
  'Right-to-work check',
  'DBS check',
  'Contract issued',
  'Induction scheduled',
  'Mandatory training assigned',
  'Manager welcome',
  'First-day checklist',
];
export const STAGES = ['Applied', 'Interview', 'Offer', 'Hired'];
export const MODULES = [
  'Care delivery',
  'People & HR',
  'Training academy',
  'Quality & compliance',
  'Finance',
  'Reports & insights',
];
const seedPerson = (
  id: string,
  name: string,
  role: string,
  stage: string,
  location: string,
): Person => ({
  id,
  name,
  email: name.toLowerCase().replace(' ', '..') + '@example.co.uk',
  role,
  stage,
  location,
  checkExpiry:
    stage === 'Hired' ? { 'Right to work': '2026-10-27', 'DBS check': '2026-11-12' } : {},
  visaType: '',
  visaExpiry: '',
  documents: [],
  vacancy: role,
  start: stage === 'Hired' ? '2026-10-19' : '',
  notes: [],
  checks:
    stage === 'Hired'
      ? [true, true, true, true, true, true, true]
      : [true, false, false, false, true, false, false],
  onboarding:
    stage === 'Hired' ? [true, true, true, true, false, true, false, false] : Array(8).fill(false),
  learning: ['safeguarding', 'handling', 'infection'],
  progress: stage === 'Hired' ? { safeguarding: 100, handling: 40 } : {},
});
interface WorkspaceData {
  people: Person[];
  vacancies: Vacancy[];
  members: Member[];
  permissions: Record<string, boolean[]>;
  workflows: Record<string, string[]>;
  backup: boolean;
  leaves: Leave[];
  reviews: Review[];
  apiKeys?: { id: string; name: string; created: string }[];
  workflowPreferences?: Record<string, { notify: boolean; escalation: number }>;
  cpd: {
    personId?: string;
    id: string;
    activity: string;
    hours: number;
    date: string;
    reflection: string;
  }[];
}
function seed(): WorkspaceData {
  return {
    people: [
      seedPerson('sophie', 'Sophie Williams', 'Care Worker', 'Interview', 'Manchester'),
      seedPerson('oliver', 'Oliver Bennett', 'Senior Carer', 'Applied', 'London'),
      seedPerson('amara', 'Amara Khan', 'Care Worker', 'Applied', 'London'),
      seedPerson('ella', 'Ella Thompson', 'Team Leader', 'Offer', 'Leeds'),
      seedPerson('james', 'James Carter', 'Care Worker', 'Hired', 'Manchester'),
      seedPerson('aisha', 'Aisha Khan', 'Care Worker', 'Hired', 'London'),
      seedPerson('maria', 'Maria Lopez', 'Senior Carer', 'Hired', 'London'),
    ],
    vacancies: [
      {
        id: 'v1',
        title: 'Care Worker',
        location: 'Manchester',
        type: 'Full time',
        salary: '£12.80–£14.20 / hour',
      },
      {
        id: 'v2',
        title: 'Senior Carer',
        location: 'London',
        type: 'Full time',
        salary: '£15.00–£17.00 / hour',
      },
      {
        id: 'v3',
        title: 'Team Leader',
        location: 'Leeds',
        type: 'Full time',
        salary: '£28,000–£32,000 / year',
      },
    ],
    members: [
      {
        id: 'u1',
        name: 'Arthur Bennett',
        email: 'arthur.bennett@example.co.uk',
        role: 'Registered Manager',
        status: 'Active',
      },
      {
        id: 'u2',
        name: 'Mary Wilson',
        email: 'mary.wilson@example.co.uk',
        role: 'Care Worker',
        status: 'Active',
      },
      {
        id: 'u3',
        name: 'James Carter',
        email: 'james.carter@example.co.uk',
        role: 'Company Admin',
        status: 'Active',
      },
      {
        id: 'u4',
        name: 'Sarah Thompson',
        email: 'sarah.thompson@example.co.uk',
        role: 'Compliance Officer',
        status: 'Active',
      },
    ],
    permissions: {},
    workflows: {
      'Care plans': ['Create', 'Manager review', 'Compliance approval'],
      Policies: ['Draft', 'Compliance review', 'Publish'],
      Incidents: ['Report', 'Manager review', 'Close'],
      Training: ['Assign', 'Complete', 'Manager verification'],
      Exports: ['Request', 'Administrator approval', 'Export'],
    },
    backup: true,
    leaves: [
      {
        id: 'l1',
        person: 'Aisha Khan',
        type: 'Annual leave',
        start: '2026-10-12',
        end: '2026-10-16',
      },
    ],
    reviews: [
      {
        id: 'r1',
        person: 'Maria Lopez',
        type: 'Supervision',
        date: '2026-10-14',
        status: 'Scheduled',
      },
    ],
    cpd: [],
  };
}
@Injectable({ providedIn: 'root' })
export class ManagementStore {
  private readonly workspace = inject(WorkspaceService);
  readonly companies = signal<Company[]>(
    this.restore('cv_companies_v1', [
      {
        id: 'lqcs',
        name: 'London Quality Care Services',
        code: 'LQ',
        sector: 'Domiciliary care',
        size: '11–50 staff',
        registration: '1-234567890',
        postcode: 'SW1A 1AA',
        color: '#087f76',
        accent: '#3b82f6',
        tagline: 'Quality care. Brighter everyday lives.',
        logo: '',
        modules: [...MODULES],
      },
      ...this.workspace
        .myWorkspaces()
        .filter((w) => w.id !== 'lqcs')
        .map((w) => ({
          id: w.id,
          name: w.name,
          code: w.shortCode,
          sector: w.careType,
          size: '11–50 staff',
          registration: '',
          postcode: '',
          color: '#087f76',
          accent: '#3b82f6',
          tagline: 'People. Purpose. Progress.',
          logo: '',
          modules: [...MODULES],
        })),
    ]),
  );
  readonly records = signal<Record<string, WorkspaceData>>(this.restore('cv_management_v1', {}));
  readonly companyId = computed(() => this.workspace.currentWorkspace()?.id ?? 'lqcs');
  readonly company = computed(() => this.companies().find((c) => c.id === this.companyId()));
  readonly data = computed(() => this.records()[this.companyId()] ?? seed());
  readonly staff = computed(() => this.data().people.filter((p) => p.stage === 'Hired'));
  readonly applicants = computed(() => this.data().people.filter((p) => p.stage !== 'Hired'));
  readonly storageAvailable = signal(true);
  private readonly deadlineClock = signal(new Date());
  readonly openVacancies = computed(() =>
    this.data().vacancies.filter(
      (v) => v.published && !this.vacancyClosed(v) && !this.vacancyScheduled(v),
    ),
  );
  update(change: (data: WorkspaceData) => WorkspaceData): void {
    this.records.update((all) => ({ ...all, [this.companyId()]: change(this.data()) }));
    this.persist('cv_management_v1', this.records());
  }
  constructor() {
    const refresh = (event: StorageEvent) => {
      if (event.key === 'cv_management_v1') this.records.set(this.restore('cv_management_v1', {}));
    };
    window.addEventListener('storage', refresh);
    const timer = window.setInterval(() => this.deadlineClock.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('storage', refresh);
      window.clearInterval(timer);
    });
  }
  vacancyClosed(vacancy: Vacancy): boolean {
    return vacancyClosed(vacancy, this.deadlineClock());
  }
  vacancyScheduled(vacancy: Vacancy): boolean {
    return vacancyScheduled(vacancy, this.deadlineClock());
  }
  vacancyStatus(vacancy: Vacancy): string {
    if (this.vacancyClosed(vacancy)) return 'Deadline passed';
    if (!vacancy.published) return 'Not accepting applications';
    return this.vacancyScheduled(vacancy) ? 'Scheduled' : 'Accepting applications';
  }
  publicVacancy(companyId: string, vacancyId: string): Vacancy | undefined {
    return this.records()[companyId]?.vacancies.find((v) => v.id === vacancyId && v.published);
  }
  saveVacancy(vacancy: Vacancy): boolean {
    const all = this.restore<Record<string, WorkspaceData>>('cv_management_v1', this.records());
    const data = all[this.companyId()] ?? this.data();
    const next = {
      ...all,
      [this.companyId()]: {
        ...data,
        vacancies: data.vacancies.some((v) => v.id === vacancy.id)
          ? data.vacancies.map((v) => (v.id === vacancy.id ? structuredClone(vacancy) : v))
          : [...data.vacancies, structuredClone(vacancy)],
      },
    };
    if (!this.persist('cv_companies_v1', this.companies())) return false;
    if (!this.persist('cv_management_v1', next)) return false;
    this.records.set(next);
    return true;
  }
  submitApplication(companyId: string, vacancyId: string, person: Person): string | null {
    const all = this.restore<Record<string, WorkspaceData>>('cv_management_v1', this.records());
    const data = all[companyId];
    const vacancy = data?.vacancies.find((v) => v.id === vacancyId && v.published);
    if (!data || !vacancy) return 'This vacancy is no longer accepting applications.';
    if (vacancyScheduled(vacancy, new Date()))
      return 'Applications have not opened yet. Please return on the go-live date.';
    if (vacancyClosed(vacancy, new Date()))
      return 'The application deadline has passed. This vacancy is closed.';
    if (
      (vacancy.fields ?? []).some(
        (f) =>
          f.required &&
          !person.application?.answers.some((a) => a.fieldId === f.id && a.value.trim()),
      ) ||
      (vacancy.documents ?? []).some(
        (d) => d.required && !person.documents?.some((doc) => doc.requirementId === d.id),
      )
    )
      return 'The application requirements have changed. Reload this page and complete the required questions and documents.';
    if (
      data.people.some(
        (p) => p.vacancyId === vacancyId && p.email.toLowerCase() === person.email.toLowerCase(),
      )
    )
      return 'An application with this email has already been received for this vacancy.';
    const next = { ...all, [companyId]: { ...data, people: [...data.people, person] } };
    if (!this.persist('cv_management_v1', next))
      return 'Your application could not be saved. Free some browser storage and try again.';
    this.records.set(next);
    return null;
  }
  updatePerson(person: Person): void {
    this.update((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === person.id ? structuredClone(person) : p)),
    }));
  }
  addPerson(person: Person): void {
    this.update((d) => ({ ...d, people: [...d.people, person] }));
  }
  saveCompany(company: Company): void {
    const isNew = !this.companies().some((c) => c.id === company.id);
    if (isNew)
      this.records.update((all) => ({
        ...all,
        [company.id]: {
          ...seed(),
          people: [],
          vacancies: [],
          members: [],
          leaves: [],
          reviews: [],
        },
      }));
    this.workspace.registerWorkspace({
      id: company.id,
      name: company.name,
      shortCode: company.code,
      logoUrl: company.logo || undefined,
      careType: company.sector,
      serviceUserCount:
        this.workspace.allWorkspaces().find((w) => w.id === company.id)?.serviceUserCount ?? 0,
      colorClass: 'bg-teal-600',
    });
    this.companies.update((all) =>
      all.some((c) => c.id === company.id)
        ? all.map((c) => (c.id === company.id ? structuredClone(company) : c))
        : [...all, structuredClone(company)],
    );
    this.persist('cv_companies_v1', this.companies());
    this.persist('cv_management_v1', this.records());
  }
  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
  }
  download(filename: string, content: string, type = 'text/plain'): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  exportPeople(): void {
    const escape = (s: string) => '"' + s.replaceAll('"', '""') + '"';
    const rows = [
      ['Name', 'Email', 'Role', 'Location', 'Stage'],
      ...this.data().people.map((p) => [p.name, p.email, p.role, p.location, p.stage]),
    ];
    this.download('people.csv', rows.map((r) => r.map(escape).join(',')).join('\r\n'), 'text/csv');
  }
  private restore<T>(key: string, fallback: T): T {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
    } catch {
      return fallback;
    }
  }
  private persist(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.storageAvailable.set(true);
      return true;
    } catch {
      this.storageAvailable.set(false);
      return false;
    }
  }
}
