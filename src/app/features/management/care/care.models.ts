import { addDays, londonDate, validTime } from '../rota/rota.models';

export const SUPPORT_LEVELS = ['Prompt', 'Support', 'Administer', 'Self-administers'] as const;
export const MEDICATION_ROUTES = [
  'Oral',
  'Topical',
  'Inhaler',
  'Eye drops',
  'Injection',
  'Patch',
  'Other',
] as const;
export interface Prescription {
  id: string;
  name: string;
  strength: string;
  form: string;
  route: string;
  dose: string;
  frequency: 'Daily' | 'Selected days' | 'PRN';
  weekdays: number[];
  times: string[];
  start: string;
  end: string;
  prescriber: string;
  pharmacy: string;
  indication: string;
  support: (typeof SUPPORT_LEVELS)[number];
  controlled: boolean;
  requiresMar: boolean;
  stock: number | null;
  lowStock: number;
  stockLocation: string;
  dispensing: string;
  covert: boolean;
  covertAuthority: string;
  monitoring: string;
  notes: string;
  prnIndication: string;
  prnMax: number | null;
  prnInterval: number | null;
  discontinuedAt: string;
  discontinuedReason: string;
}
export interface Administration {
  id: string;
  medicationId: string;
  date: string;
  time: string;
  outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent';
  doseUnits: number;
  reason: string;
  response: string;
  at: string;
  by: string;
  userId: string;
  witness: string;
  correctionOf?: string;
}
export interface CareContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  type: 'Family' | 'Emergency' | 'GP' | 'Pharmacy' | 'Professional';
  nextOfKin: boolean;
}
export interface CareDocument {
  visibility?: Record<import('./visit-notes.models').VisitNoteAudience, boolean>;
  status?: import('./care-documents.models').CareDocumentStatus;
  issueDate?: string;
  reviewDate?: string;
  description?: string;
  revision?: number;
  updatedAt?: string;
  updatedBy?: string;
  revisions?: import('./care-documents.models').DocumentRevision[];
  deletedAt?: string;
  deletedBy?: string;
  familyShared?: boolean;
  id: string;
  name: string;
  category: string;
  version: string;
  data: string;
  mime: string;
  size: number;
  at: string;
  by: string;
}
export const FAMILY_SCOPES = [
  'Care plan',
  'Medication',
  'Visits',
  'Notes',
  'Invoices',
  'Messages',
  'Documents',
  'Photos',
] as const;
export type FamilyScope = (typeof FAMILY_SCOPES)[number];
export interface FamilyAccess {
  id: string;
  name: string;
  email: string;
  relationship: string;
  status: 'Pending' | 'Active' | 'Revoked';
  scopes: FamilyScope[];
  at: string;
}
export const FAMILY_UPDATE_CATEGORIES = [
  'Wellbeing',
  'Medication',
  'Personal care',
  'Meals & fluids',
  'General',
] as const;
export interface FamilyUpdate {
  id: string;
  date: string;
  category: (typeof FAMILY_UPDATE_CATEGORIES)[number];
  text: string;
  by: string;
  at: string;
}
export interface FamilyMessage {
  id: string;
  accessId: string;
  text: string;
  at: string;
  by: string;
  fromFamily: boolean;
}
export interface CareAudit {
  id: string;
  at: string;
  by: string;
  action: string;
  detail: string;
}
export const validDate = (date: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date + 'T12:00:00Z')) &&
  new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date;
export const csv = (rows: unknown[][]): string =>
  rows
    .map((row) =>
      row
        .map((value) => {
          const s = String(value ?? '');
          return '"' + (/^\s*[=+@-]|^[\t\r\n]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"';
        })
        .join(','),
    )
    .join('\r\n');
export function age(dob: string, today = londonDate()): number | null {
  if (!validDate(dob) || dob > today) return null;
  return (
    Number(today.slice(0, 4)) - Number(dob.slice(0, 4)) - (today.slice(5) < dob.slice(5) ? 1 : 0)
  );
}
export function medicationActive(m: Prescription, date: string): boolean {
  return (
    m.start <= date &&
    (!m.end || m.end >= date) &&
    (!m.discontinuedAt || m.discontinuedAt.slice(0, 10) >= date)
  );
}
export function medicationDue(m: Prescription, date: string): boolean {
  return (
    medicationActive(m, date) &&
    m.requiresMar &&
    m.frequency !== 'PRN' &&
    (m.frequency !== 'Selected days' ||
      m.weekdays.includes(new Date(date + 'T12:00:00Z').getUTCDay()))
  );
}
export function prescriptionError(m: Prescription): string | null {
  if (
    ![m.name, m.strength, m.form, m.route, m.dose, m.prescriber, m.pharmacy, m.indication].every(
      (v) => v.trim(),
    )
  )
    return 'Complete medication, strength, form, route, dose, prescriber, pharmacy and indication.';
  if (
    !SUPPORT_LEVELS.includes(m.support) ||
    !MEDICATION_ROUTES.includes(m.route as (typeof MEDICATION_ROUTES)[number]) ||
    !['Daily', 'Selected days', 'PRN'].includes(m.frequency)
  )
    return 'Choose a recognised support level, route and frequency.';
  if (!validDate(m.start) || (m.end && (!validDate(m.end) || m.end < m.start)))
    return 'Enter valid start and end dates in order.';
  if (
    m.frequency !== 'PRN' &&
    (!m.times.length ||
      m.times.some((t) => !validTime(t)) ||
      new Set(m.times).size !== m.times.length)
  )
    return 'Enter distinct administration times in HH:mm format.';
  if (
    m.frequency === 'Selected days' &&
    (!m.weekdays.length || m.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
  )
    return 'Select valid administration days.';
  if (
    m.frequency === 'PRN' &&
    (!m.prnIndication.trim() ||
      !Number.isFinite(m.prnMax) ||
      m.prnMax! <= 0 ||
      !Number.isFinite(m.prnInterval) ||
      m.prnInterval! < 0)
  )
    return 'Record the PRN indication, maximum dose units per 24 hours and minimum interval in hours.';
  if (
    (m.stock !== null && (!Number.isFinite(m.stock) || m.stock < 0)) ||
    !Number.isFinite(m.lowStock) ||
    m.lowStock < 0
  )
    return 'Stock and low-stock threshold must be non-negative numbers.';
  if (m.covert && !m.covertAuthority.trim())
    return 'Record the authority and plan for covert medication.';
  return null;
}
export function blankPrescription(): Prescription {
  return {
    id: crypto.randomUUID(),
    name: '',
    strength: '',
    form: 'Tablet',
    route: 'Oral',
    dose: '',
    frequency: 'Daily',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    times: ['08:00'],
    start: londonDate(),
    end: '',
    prescriber: '',
    pharmacy: '',
    indication: '',
    support: 'Prompt',
    controlled: false,
    requiresMar: true,
    stock: null,
    lowStock: 5,
    stockLocation: '',
    dispensing: '',
    covert: false,
    covertAuthority: '',
    monitoring: '',
    notes: '',
    prnIndication: '',
    prnMax: null,
    prnInterval: null,
    discontinuedAt: '',
    discontinuedReason: '',
  };
}
export const weekDates = (start: string): string[] =>
  Array.from({ length: 7 }, (_, i) => addDays(start, i));

export function ukStamp(value: string): string {
  return value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Not recorded';
}
