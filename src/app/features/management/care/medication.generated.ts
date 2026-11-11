// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type MedicationWrite = {
  name: string;
  strength: string;
  form:
    | 'Tablet'
    | 'Capsule'
    | 'Cream'
    | 'Ointment'
    | 'Liquid'
    | 'Inhaler'
    | 'Drops'
    | 'Patch'
    | 'Injection'
    | 'Other';
  route: 'Oral' | 'Topical' | 'Inhaler' | 'Eye drops' | 'Injection' | 'Patch' | 'Other';
  dose: string;
  frequency: 'Daily' | 'Selected days' | 'PRN';
  weekdays: number[];
  times: string[];
  start: string;
  end: string | null;
  prescriber: string;
  pharmacy: string;
  indication: string;
  support: 'Prompt' | 'Support' | 'Administer' | 'Self-administers';
  controlled: boolean;
  requiresMar: boolean;
  stock: string | null;
  lowStock: string;
  stockLocation?: string;
  dispensing?: string;
  covert: boolean;
  covertAuthority?: string;
  monitoring?: string;
  notes?: string;
  prnIndication?: string;
  prnMax: string | null;
  prnInterval: string | null;
};

export type MedicationRead = {
  name: string;
  strength: string;
  form:
    | 'Tablet'
    | 'Capsule'
    | 'Cream'
    | 'Ointment'
    | 'Liquid'
    | 'Inhaler'
    | 'Drops'
    | 'Patch'
    | 'Injection'
    | 'Other';
  route: 'Oral' | 'Topical' | 'Inhaler' | 'Eye drops' | 'Injection' | 'Patch' | 'Other';
  dose: string;
  frequency: 'Daily' | 'Selected days' | 'PRN';
  weekdays: number[];
  times: string[];
  start: string;
  end: string | null;
  prescriber: string;
  pharmacy: string;
  indication: string;
  support: 'Prompt' | 'Support' | 'Administer' | 'Self-administers';
  controlled: boolean;
  requiresMar: boolean;
  stock: string | null;
  lowStock: string;
  stockLocation?: string;
  dispensing?: string;
  covert: boolean;
  covertAuthority?: string;
  monitoring?: string;
  notes?: string;
  prnIndication?: string;
  prnMax: string | null;
  prnInterval: string | null;
  id: string;
  company_id: string;
  service_user_id: string;
  version: number;
  etag: string;
  discontinuedAt: string;
  discontinuedReason: string;
  deleted: boolean;
};

export type MarWrite = {
  date: string;
  time: string;
  outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent';
  doseUnits: string;
  reason?: string;
  response?: string;
  witness?: string;
};

export type MarRead = {
  id: string;
  company_id: string;
  medicationId: string;
  date: string;
  time: string;
  outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Void';
  doseUnits: string;
  reason: string;
  response: string;
  witness: string;
  correctionOf: string | null;
  at: string;
  by: string;
  userId: string;
  etag: string;
  version: number;
};

export type MedicationReason = {
  reason: string;
};

export type MedicationStock = {
  reason: string;
  amount: string;
};

export type MedicationWorkspace = {
  company_id: string;
  service_user_id: string;
  today: string;
  timezone: string;
  prescriptions: {
    name: string;
    strength: string;
    form:
      | 'Tablet'
      | 'Capsule'
      | 'Cream'
      | 'Ointment'
      | 'Liquid'
      | 'Inhaler'
      | 'Drops'
      | 'Patch'
      | 'Injection'
      | 'Other';
    route: 'Oral' | 'Topical' | 'Inhaler' | 'Eye drops' | 'Injection' | 'Patch' | 'Other';
    dose: string;
    frequency: 'Daily' | 'Selected days' | 'PRN';
    weekdays: number[];
    times: string[];
    start: string;
    end: string | null;
    prescriber: string;
    pharmacy: string;
    indication: string;
    support: 'Prompt' | 'Support' | 'Administer' | 'Self-administers';
    controlled: boolean;
    requiresMar: boolean;
    stock: string | null;
    lowStock: string;
    stockLocation?: string;
    dispensing?: string;
    covert: boolean;
    covertAuthority?: string;
    monitoring?: string;
    notes?: string;
    prnIndication?: string;
    prnMax: string | null;
    prnInterval: string | null;
    id: string;
    company_id: string;
    service_user_id: string;
    version: number;
    etag: string;
    discontinuedAt: string;
    discontinuedReason: string;
    deleted: boolean;
  }[];
  administrations: {
    id: string;
    company_id: string;
    medicationId: string;
    date: string;
    time: string;
    outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Void';
    doseUnits: string;
    reason: string;
    response: string;
    witness: string;
    correctionOf: string | null;
    at: string;
    by: string;
    userId: string;
    etag: string;
    version: number;
  }[];
  audit: {
    id: string;
    at: string;
    by: string;
    action: string;
    detail: string;
  }[];
};

export type MedicationAudit = {
  id: string;
  at: string;
  by: string;
  action: string;
  detail: string;
};
