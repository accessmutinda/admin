import { CompanyAccessService, MODULE_CODES } from '../../../core/access/company-access.service';
import { companyProfileFields } from '../companies/company-profile.models';
import { CompaniesApiService } from '../companies/companies-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { AccessChange } from '../company-admin/access/access.models';
import type { WorkspaceSetup } from '../companies/company-create.models';
import type { CompanyCompliance } from '../companies/company-compliance.models';
import type { ServiceLocation } from '../locations/locations.models';
import type { CompanySubscription } from '../companies/company-modules.models';
import type {
  CompanyBranding,
  PublishedCompanyBranding,
} from '../companies/company-branding.models';
import type { CompanyContacts } from '../companies/company-contacts.models';
import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { vacancyClosed, vacancyScheduled } from '../recruitment/vacancy-deadline';
import type { PayrollData, PayrollAction } from '../payroll/payroll.models';
import type { RotaData, RotaAction } from '../rota/rota.models';
import type { QualityData } from '../quality/quality.models';
import { ROLES } from '../../../core/auth/models/role';
import { PAYROLL_ACTIONS } from '../payroll/payroll.models';
import { ROTA_ACTIONS } from '../rota/rota.models';

import type { StaffRecord, StaffDraft } from '../people/hr.models';

export interface Company {
  id: string;
  name: string;
  code: string;
  sector: string;
  size: string;
  registration: string;
  country?: string;
  region?: string;
  postcode: string;
  color: string;
  accent: string;
  tagline: string;
  logo: string;
  modules: string[];
  lifecycle?: 'pending_setup' | 'active' | 'suspended' | 'archived';
  apiSummaryOnly?: boolean;
  profileCompletion?: number | null;
  setupProgress?: import('../companies/companies-api.models').SetupProgress;
  tradingName?: string;
  description?: string;
  establishedDate?: string;
  headOfficeName?: string;
  headOfficeAddress?: string;
  registeredPlaces?: number | null;
  primaryLanguage?: string;
  active?: boolean;
  modifiedAt?: string;
  modifiedBy?: string;
  subscription?: CompanySubscription;
  contacts?: CompanyContacts;
  compliance?: CompanyCompliance;
  branding?: CompanyBranding;
  publishedBranding?: PublishedCompanyBranding;
}
export interface StaffDocument {
  id: string;
  name: string;
  type: string;
  content: string;
  requirement?: string;
  requirementId?: string;
  category?: string;
  uploadedAt?: string;
  expiry?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  status?: 'Pending review' | 'Verified';
  version?: number;
  replacesId?: string;
}
export interface Person {
  hr?: StaffRecord;
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
  version?: number;
  roleCode?: string;
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department?: string;
  lastLoginAt?: string;
  mfaEnabled?: boolean;
  mfaPolicy?: import('../../../core/auth/mfa-policy').MfaPolicy;
}
export interface Leave {
  personId?: string;
  status?: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  id: string;
  person: string;
  type: string;
  start: string;
  end: string;
}
export interface Review {
  competencies?: { title: string; score: number }[];
  score?: number;
  personId?: string;
  assessor?: string;
  discussion?: string;
  outcome?: string;
  completedAt?: string;
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
export interface WorkspaceData {
  systemDemoVersion?: number;
  hrDemoVersion?: number;
  careDemoVersion?: number;
  careDemoImagesVersion?: number;
  academy?: import('../learning/academy/academy.models').AcademyData;
  staffPortal?: import('../staff-portal/portal.models').PortalData;
  journal?: import('../journal/journal.models').JournalData;
  inspection?: import('../../inspector/inspector.models').InspectorData;
  staffDrafts?: StaffDraft[];
  accessHistory?: AccessChange[];
  roleMfa?: Record<string, boolean>;
  locations?: ServiceLocation[];
  permissionDefaultsVersion?: number;
  quality?: QualityData;
  rota?: RotaData;
  rotaPermissions?: Record<string, RotaAction[]>;
  payroll?: PayrollData;
  payrollPermissions?: Record<string, PayrollAction[]>;
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
function emptyWorkspace(): WorkspaceData {
  return {
    permissionDefaultsVersion: 2,
    people: [],
    vacancies: [],
    members: [],
    permissions: {},
    workflows: {},
    backup: false,
    leaves: [],
    reviews: [],
    cpd: [],
  };
}
@Injectable({ providedIn: 'root' })
export class ManagementStore {
  private readonly productAccess = inject(CompanyAccessService);
  private accessMigrationPending = false;
  private readonly auth = inject(AuthService);
  private readonly companyApi = inject(CompaniesApiService);
  readonly companyWriteError = signal('');
  readonly companies = computed<Company[]>(() =>
    this.companyApi
      .companies()
      .filter((company) => this.auth.canAccessCompany(company.id))
      .map((company) => ({
        id: company.id,
        name: company.name,
        code: company.code,
        lifecycle: company.lifecycle,
        active: company.lifecycle === 'active',
        apiSummaryOnly: true,
        profileCompletion: company.profile_completion_percent ?? null,
        setupProgress: company.setup_progress,
        modifiedAt: company.updated_at ?? undefined,
        sector: company.service_type ?? '',
        size: '',
        registration: '',
        postcode: company.postcode ?? '',
        color: '#087f76',
        accent: '#3b82f6',
        tagline: '',
        logo: '',
        modules: Object.keys(MODULE_CODES).filter(name => this.productAccess.context()?.company_id === company.id && this.productAccess.context()?.enabled_modules.includes(MODULE_CODES[name])),
        ...(this.companyApi.details()[company.id]
          ? companyProfileFields(this.companyApi.details()[company.id])
          : {}),
      })),
  );
  private readonly storedRecords = signal<Record<string, WorkspaceData>>(
    this.restore('cv_api_company_data_v1', {}),
  );
  readonly records = computed(() =>
    Object.fromEntries(
      Object.entries(this.storedRecords()).filter(([id]) => this.auth.canAccessCompany(id)),
    ),
  );
  readonly companyId = computed(() =>
    this.auth.isSuperAdmin()
      ? (this.auth.session()?.workspaceId ?? '')
      : this.auth.profile()?.company_entry_state === 'ready'
        ? (this.auth.profile()?.company_id ?? '')
        : '',
  );
  readonly company = computed(() =>
    this.companies().find((company) => company.id === this.companyId()),
  );
  readonly data = computed(() => this.records()[this.companyId()] ?? emptyWorkspace());
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
    if (!this.auth.canAccessCompany(this.companyId())) return;
    this.storedRecords.update((all) => ({ ...all, [this.companyId()]: change(this.data()) }));
    this.persist('cv_api_company_data_v1', this.storedRecords());
  }
  constructor() {
    effect(() => {
      if (this.companyApi.scope())
        untracked(() => {
          void this.companyApi.ensureLoaded();
        });
    });
    if (this.accessMigrationPending) {
      this.persist('cv_api_company_data_v1', this.storedRecords());
      this.accessMigrationPending = false;
    }
    const refresh = (event: StorageEvent) => {
      if (event.key === 'cv_api_company_data_v1') {
        this.storedRecords.set(this.restore('cv_api_company_data_v1', {}));
        if (this.accessMigrationPending) {
          this.persist('cv_api_company_data_v1', this.storedRecords());
          this.accessMigrationPending = false;
        }
      }
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
    return this.storedRecords()[companyId]?.vacancies.find(
      (v) => v.id === vacancyId && v.published,
    );
  }
  saveVacancy(vacancy: Vacancy): boolean {
    const all = this.restore<Record<string, WorkspaceData>>(
      'cv_api_company_data_v1',
      this.records(),
    );
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
    if (!this.persist('cv_api_company_details_v1', this.companies())) return false;
    if (!this.persist('cv_api_company_data_v1', next)) return false;
    this.storedRecords.set(next);
    return true;
  }
  submitApplication(companyId: string, vacancyId: string, person: Person): string | null {
    const all = this.restore<Record<string, WorkspaceData>>(
      'cv_api_company_data_v1',
      this.records(),
    );
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
    if (!this.persist('cv_api_company_data_v1', next))
      return 'Your application could not be saved. Free some browser storage and try again.';
    this.storedRecords.set(next);
    return null;
  }
  saveWorkspace(change: (data: WorkspaceData) => WorkspaceData): boolean {
    if (!this.auth.canAccessCompany(this.companyId())) return false;
    const all = this.restore<Record<string, WorkspaceData>>(
      'cv_api_company_data_v1',
      this.records(),
    );
    const data = all[this.companyId()] ?? this.data();
    const next = { ...all, [this.companyId()]: structuredClone(change(data)) };
    if (!this.persist('cv_api_company_data_v1', next)) return false;
    this.storedRecords.set(next);
    return true;
  }
  savePayroll(payroll: PayrollData): boolean {
    return this.saveWorkspace((data) => ({ ...data, payroll }));
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
  saveCompany(_company: Company, _setup?: WorkspaceSetup): boolean {
    this.companyWriteError.set(
      'Company updates are not supported by the backend yet. Your edits have not been saved.',
    );
    return false;
  }
  setCompaniesActive(_ids: string[], _active: boolean, _actor: string): boolean {
    this.companyWriteError.set('Company status changes are not supported by the backend yet.');
    return false;
  }
  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
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
    const escape = (s: string) => {
      const safe = /^\s*[=+@-]|^[\t\r\n]/.test(s) ? "'" + s : s;
      return '"' + safe.replaceAll('"', '""') + '"';
    };
    const rows = [
      ['Name', 'Email', 'Role', 'Location', 'Stage'],
      ...this.data().people.map((p) => [p.name, p.email, p.role, p.location, p.stage]),
    ];
    this.download('people.csv', rows.map((r) => r.map(escape).join(',')).join('\r\n'), 'text/csv');
  }
  private restore<T>(key: string, fallback: T): T {
    try {
      const restored = JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
      if (key !== 'cv_api_company_data_v1') return restored;
      return Object.fromEntries(
        Object.entries(restored as Record<string, WorkspaceData>).map(([id, data]) => {
          if (data.permissionDefaultsVersion === 2) return [id, data];
          this.accessMigrationPending = true;
          const roles = new Set([
            ...Object.values(ROLES).map((role) => role.label),
            ...data.members.map((member) => member.role),
            ...Object.keys(data.permissions).map((permission) => permission.split(':')[0]),
            ...Object.keys(data.rotaPermissions ?? {}),
            ...Object.keys(data.payrollPermissions ?? {}),
          ]);
          const fullPermissions = () => [true, true, true, true, true];
          return [
            id,
            {
              ...data,
              permissionDefaultsVersion: 2,
              permissions: {
                ...Object.fromEntries(
                  Object.keys(data.permissions).map((permission) => [
                    permission,
                    fullPermissions(),
                  ]),
                ),
                ...Object.fromEntries(
                  [...roles].flatMap((role) =>
                    MODULES.map((module) => [role + ':' + module, fullPermissions()]),
                  ),
                ),
              },
              rotaPermissions: Object.fromEntries(
                [...roles].map((role) => [role, ROTA_ACTIONS.map((action) => action.key)]),
              ),
              payrollPermissions: Object.fromEntries(
                [...roles].map((role) => [role, PAYROLL_ACTIONS.map((action) => action.key)]),
              ),
            },
          ];
        }),
      ) as T;
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
