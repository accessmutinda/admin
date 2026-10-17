import { CHECKS, COURSES, ONBOARDING, Person } from '../shared/management.store';

export type StaffStatus = 'Onboarding' | 'Active' | 'Inactive' | 'Left';
export type CheckStatus = 'Not started' | 'Pending' | 'Recorded' | 'Verified' | 'Not required';
export interface StaffCheck {
  id: string;
  title: string;
  status: CheckStatus;
  completed: string;
  expiry: string;
  reviewer: string;
  documentId: string;
  note: string;
}
export interface StaffTraining {
  score?: number | null;
  reassessmentDue?: string;
  courseId: string;
  completed: string;
  expiry: string;
  assessor: string;
  competency: 'Not assessed' | 'Competent' | 'Needs development';
  certificateId: string;
}
export interface StaffAction {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: 'Open' | 'In progress' | 'Completed';
  evidence: string;
}
export interface StaffAudit {
  id: string;
  at: string;
  actor: string;
  action: string;
}
export interface StaffNote {
  id: string;
  at: string;
  author: string;
  text: string;
  reflective: boolean;
}
export interface StaffReference {
  id: string;
  name: string;
  organisation: string;
  email: string;
  status: 'Requested' | 'Received' | 'Verified';
}
export interface StaffRecord {
  version: 1;
  reference: string;
  status: StaffStatus;
  personal: {
    title?: string;
    ethnicity?: string;
    religion?: string;
    maritalStatus?: string;
    addressLine2?: string;
    town?: string;
    county?: string;
    emergencyRelationship?: string;
    emergencyAlternative?: string;
    kinName?: string;
    kinRelationship?: string;
    kinPhone?: string;
    kinAlternative?: string;
    additionalNotes?: string;
    photo?: string;
    middleName?: string;
    gender?: string;
    nationality?: string;
    nextOfKin?: string;
    firstName: string;
    surname: string;
    birthDate: string;
    phone: string;
    address: string;
    postcode: string;
    emergencyName: string;
    emergencyPhone: string;
    languages: string;
    driver: boolean;
    vehicle: string;
  };
  employment: {
    recruitment?: {
      source?: string;
      applicationDate?: string;
      interviewDate?: string;
      offerDate?: string;
      nextReview?: string;
      interviewNotes?: string;
    };
    type: string;
    department: string;
    manager: string;
    hours: number | null;
    rate: number | null;
    payrollNumber: string;
    probationMonths: number | null;
    contractEnd: string;
    noticeWeeks: number | null;
    history: string;
    gaps: string;
  };
  checks: StaffCheck[];
  availabilityMode?: 'Weekly slots' | 'Custom times';
  weeklySlots?: {
    title: string;
    start: string;
    end: string;
    days: ('Available' | 'Preferred' | 'Unavailable')[];
  }[];
  availability: {
    day: string;
    start: string;
    end: string;
    preference: 'Available' | 'Preferred' | 'Unavailable';
  }[];
  preferences: {
    areas: string;
    travel: string;
    shifts: string;
    notes: string;
    clientGroups?: string[];
    liveIn?: string;
  };
  training: StaffTraining[];
  induction: { id: string; title: string; complete: boolean }[];
  bookings?: {
    id: string;
    courseId: string;
    date: string;
    provider: string;
    type: 'Training' | 'Reassessment';
    status: 'Scheduled' | 'Cancelled' | 'Completed';
  }[];
  references: StaffReference[];
  actions: StaffAction[];
  notes: StaffNote[];
  audit: StaffAudit[];
  requests: { id: string; title: string; at: string; status: 'Open' | 'Fulfilled' }[];
}
export interface StaffDraft {
  id: string;
  companyId: string;
  ownerId: string;
  savedAt: string;
  step: number;
  person: Person;
  sourceId?: string;
}
export const STAFF_STEPS = [
  'Personal Details',
  'Employment & Compliance',
  'Availability',
  'Training & Induction',
  'Documents',
  'Review & Create',
];
export const STAFF_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'personal', label: 'Personal Details' },
  { key: 'employment', label: 'Employment & Recruitment' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'availability', label: 'Availability & Leave' },
  { key: 'training', label: 'Training & Competency' },
  { key: 'documents', label: 'Documents' },
  { key: 'reviews', label: 'Supervision & Appraisal' },
  { key: 'performance', label: 'Performance' },
  { key: 'notes', label: 'Notes' },
  { key: 'audit', label: 'Audit Trail' },
];
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function dateValid(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function checkId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
export function staffRecord(p: Person): StaffRecord {
  if (p.hr?.version === 1) {
    const h = structuredClone(p.hr);
    h.bookings ??= [];
    for (const courseId of p.learning)
      if (!h.training.some((t) => t.courseId === courseId))
        h.training.push({
          courseId,
          completed: '',
          expiry: '',
          assessor: '',
          competency: 'Not assessed',
          certificateId: '',
        });
    return h;
  }
  const words = p.name.trim().split(/\s+/);
  return {
    version: 1,
    reference: 'CV-STF-' + p.id.toUpperCase(),
    status: 'Onboarding',
    personal: {
      firstName: words.slice(0, -1).join(' ') || words[0] || '',
      surname: words.length > 1 ? words.at(-1)! : '',
      birthDate: '',
      phone: p.application?.phone ?? '',
      address: '',
      postcode: '',
      emergencyName: '',
      emergencyPhone: '',
      languages: '',
      driver: false,
      vehicle: '',
    },
    employment: {
      type: '',
      department: '',
      manager: '',
      hours: null,
      rate: null,
      payrollNumber: '',
      probationMonths: null,
      contractEnd: '',
      noticeWeeks: null,
      history: '',
      gaps: '',
    },
    checks: CHECKS.map((title, i) => ({
      id: checkId(title),
      title,
      status: p.checks[i] ? 'Recorded' : 'Not started',
      completed: '',
      expiry: p.checkExpiry?.[title] ?? '',
      reviewer: '',
      documentId: '',
      note: p.checks[i]
        ? 'Legacy completion recorded; verification evidence has not been recorded.'
        : '',
    })),
    availability: DAYS.map((day) => ({ day, start: '', end: '', preference: 'Unavailable' })),
    preferences: { areas: p.location, travel: '', shifts: '', notes: '' },
    training: p.learning.map((courseId) => ({
      courseId,
      completed: '',
      expiry: '',
      assessor: '',
      competency: 'Not assessed',
      certificateId: '',
    })),
    induction: ONBOARDING.map((title, i) => ({
      id: checkId(title),
      title,
      complete: !!p.onboarding[i],
    })),
    bookings: [],
    references: [],
    actions: [],
    notes: p.notes.map((text, i) => ({
      id: 'legacy-' + i,
      at: '',
      author: 'Not recorded',
      text,
      reflective: false,
    })),
    audit: [],
    requests: [],
  };
}
export function newStaff(): Person {
  const p: Person = {
    id: crypto.randomUUID(),
    name: '',
    email: '',
    role: '',
    location: '',
    stage: 'Hired',
    vacancy: '',
    start: '',
    checks: CHECKS.map(() => false),
    onboarding: ONBOARDING.map(() => false),
    learning: [],
    progress: {},
    notes: [],
    documents: [],
  };
  p.hr = staffRecord(p);
  return p;
}
export function checkState(check: StaffCheck, day = today()): string {
  if (check.status === 'Not required') return 'Not required';
  if (check.expiry && check.expiry < day) return 'Expired';
  const soon = new Date(day + 'T12:00:00Z');
  soon.setUTCDate(soon.getUTCDate() + 60);
  if (check.expiry && check.expiry <= soon.toISOString().slice(0, 10)) return 'Due soon';
  return check.status;
}
export function readiness(p: Person, day = today()): { ready: boolean; missing: string[] } {
  const h = staffRecord(p);
  const missing = h.checks
    .filter(
      (c) =>
        c.status !== 'Not required' &&
        (c.status !== 'Verified' || checkState(c, day) === 'Expired'),
    )
    .map((c) => c.title);
  if (!p.role || !p.location || !p.start) missing.push('Employment details');
  if (h.induction.some((t) => !t.complete)) missing.push('Induction');
  const mandatory = COURSES.filter((c) => c.category === 'Mandatory');
  if (
    mandatory.some(
      (c) =>
        !h.training.some(
          (t) =>
            t.courseId === c.id &&
            dateValid(t.completed) &&
            t.completed <= day &&
            (!t.expiry || t.expiry >= day),
        ),
    )
  )
    missing.push('Mandatory training');
  return { ready: !missing.length, missing };
}
export function staffErrors(p: Person): string[][] {
  const h = staffRecord(p);
  const personal: string[] = [];
  if (!h.personal.firstName.trim() || !h.personal.surname.trim())
    personal.push('Enter first name and surname.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()))
    personal.push('Enter a valid email address.');
  if (h.personal.birthDate && (!dateValid(h.personal.birthDate) || h.personal.birthDate >= today()))
    personal.push('Enter a valid date of birth in the past.');
  const employment: string[] = [];
  if (!p.role.trim() || !p.location.trim() || !h.employment.type.trim())
    employment.push('Enter role, branch and employment type.');
  if (!dateValid(p.start)) employment.push('Enter a valid start date.');
  if (!h.reference.trim()) employment.push('Enter a staff reference.');
  if (
    h.employment.hours !== null &&
    (!Number.isFinite(h.employment.hours) || h.employment.hours < 0 || h.employment.hours > 168)
  )
    employment.push('Weekly hours must be between 0 and 168.');
  if (h.employment.rate !== null && (!Number.isFinite(h.employment.rate) || h.employment.rate < 0))
    employment.push('Pay rate must be zero or greater.');
  if (
    h.employment.contractEnd &&
    (!dateValid(h.employment.contractEnd) || h.employment.contractEnd < p.start)
  )
    employment.push('Contract end must be on or after the start date.');
  const availability =
    !(h.weeklySlots && h.availabilityMode !== 'Custom times') &&
    h.availability.some(
      (a) =>
        a.preference !== 'Unavailable' &&
        (!/^([01]\d|2[0-3]):[0-5]\d$/.test(a.start) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.end) ||
          a.start === a.end),
    )
      ? [
          'Enter distinct start and end times for each available day. End times before start times run overnight.',
        ]
      : [];
  const training = h.training.some(
    (t) =>
      (t.completed && (!dateValid(t.completed) || t.completed > today())) ||
      (t.expiry && (!dateValid(t.expiry) || !t.completed || t.expiry < t.completed)),
  )
    ? [
        'Training dates must be valid; completion cannot be in the future and renewal cannot precede completion.',
      ]
    : [];
  return [personal, employment, availability, training, [], []];
}

export function availabilityCovers(p: Person, date: string, start: string, end: string): boolean {
  if (!p.hr) return true;
  const minute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const begin = minute(start),
    finish = minute(end) + (end <= start ? 1440 : 0);
  const weekday = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const windows: [number, number][] = [];
  for (const delta of [-1, 0, 1]) {
    const day = DAYS[(weekday + delta + 7) % 7];
    const rows =
      p.hr.weeklySlots && p.hr.availabilityMode !== 'Custom times'
        ? p.hr.weeklySlots.map((slot) => ({
            start: slot.start,
            end: slot.end,
            preference: slot.days[(weekday + delta + 7) % 7],
          }))
        : p.hr.availability.filter((slot) => slot.day === day);
    for (const slot of rows) {
      if (slot && slot.preference !== 'Unavailable' && slot.start && slot.end) {
        const a = delta * 1440 + minute(slot.start),
          b = delta * 1440 + minute(slot.end) + (slot.end <= slot.start ? 1440 : 0);
        windows.push([a, b]);
      }
    }
  }
  let covered = begin;
  for (const [a, b] of windows.sort((a, b) => a[0] - b[0])) {
    if (a <= covered && b > covered) covered = b;
  }
  return covered >= finish;
}

export function weeklySlots(p: Person): NonNullable<StaffRecord['weeklySlots']> {
  if (p.hr?.weeklySlots) return p.hr.weeklySlots;
  return [
    { title: 'Morning', start: '06:00', end: '12:00' },
    { title: 'Lunch', start: '12:00', end: '14:00' },
    { title: 'Afternoon', start: '14:00', end: '18:00' },
    { title: 'Evening', start: '18:00', end: '22:00' },
    { title: 'Bed', start: '22:00', end: '00:00' },
    { title: 'Night', start: '00:00', end: '06:00' },
  ].map((slot) => ({
    ...slot,
    days: DAYS.map((day) => {
      const value = p.hr?.availability.find((a) => a.day === day);
      return value &&
        value.preference !== 'Unavailable' &&
        value.start <= slot.start &&
        (value.end >= slot.end || value.end < value.start)
        ? value.preference
        : 'Unavailable';
    }),
  }));
}
