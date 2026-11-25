// Generated from backend OpenAPI. Regenerate with scripts/generate-company-access-types.py.

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
  outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Not available' | 'Not required';
  actualAt?: string | null;
  doseUnits?: string | null;
  reason?: string;
  response?: string;
  witness?: string;
  witnessApprovalId?: string;
  covertAuthorityId?: string;
  covertAcknowledged?: boolean;
};

export type MarRead = {
  id: string;
  company_id: string;
  medicationId: string;
  date: string;
  time: string;
  outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Not available' | 'Not required' | 'Void';
  actualAt?: string | null;
  doseUnits: string | null;
  reason: string;
  response: string;
  witness: string;
  witnessEvidence?: {
    status: 'verified' | 'unverified';
    name: string;
    userId: string | null;
    attestedAt: string | null;
  } | null;
  covertAuthorityRecord?: {
    id: string;
    revision: number;
    decisionReference: string;
  } | null;
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
  outcomes: {
    outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Not available' | 'Not required';
    code: string;
    label: string;
    description: string;
  }[];
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
    outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Not available' | 'Not required' | 'Void';
    actualAt?: string | null;
    doseUnits: string | null;
    reason: string;
    response: string;
    witness: string;
    witnessEvidence?: {
      status: 'verified' | 'unverified';
      name: string;
      userId: string | null;
      attestedAt: string | null;
    } | null;
    covertAuthorityRecord?: {
      id: string;
      revision: number;
      decisionReference: string;
    } | null;
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

export type MedicationMarReport = {
  company_id: string;
  service_user_id: string;
  timezone: string;
  month: string;
  sheet: 'standard' | 'controlled' | 'all';
  dates: string[];
  prescriptions: {
    id: string;
    name: string;
    dose: string;
    strength: string;
    form: string;
    route: string;
    frequency: 'Daily' | 'Selected days' | 'PRN';
    start: string;
    end: string | null;
    discontinuedAt: string | null;
    controlled: boolean;
    notes: string;
    prnIndication: string;
    prnMax: string | null;
    prnInterval: string | null;
    slots: {
      scheduledTime: string;
      cells: {
        date: string;
        state: 'recorded' | 'not_applicable' | 'pending' | 'unrecorded';
        administration: {
          outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Not available' | 'Not required';
          code: string;
          id: string;
          actualAt: string | null;
          actualTime: string | null;
          staffId: string;
          staffInitials: string;
          staffName: string;
          staffRole: string | null;
          doseUnits: string | null;
          reason: string;
          response: string;
          witnessEvidence?: {
            status: 'verified' | 'unverified';
            name: string;
            userId: string | null;
            attestedAt: string | null;
          } | null;
          covert?: boolean;
          covertAuthorityRecord?: {
            id: string;
            revision: number;
            decisionReference: string;
          } | null;
        } | null;
      }[];
    }[];
    prnAdministrations: {
      outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Not available' | 'Not required';
      code: string;
      id: string;
      actualAt: string | null;
      actualTime: string | null;
      staffId: string;
      staffInitials: string;
      staffName: string;
      staffRole: string | null;
      doseUnits: string | null;
      reason: string;
      response: string;
      witnessEvidence?: {
        status: 'verified' | 'unverified';
        name: string;
        userId: string | null;
        attestedAt: string | null;
      } | null;
      covert?: boolean;
      covertAuthorityRecord?: {
        id: string;
        revision: number;
        decisionReference: string;
      } | null;
      date: string;
      time: string;
    }[];
  }[];
  staff: {
    id: string;
    initials: string;
    name: string;
    role: string | null;
  }[];
  summary: {
    scheduled: number;
    due: number;
    requiredDue: number;
    pending: number;
    unrecorded: number;
    outcomes: {
      outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Not available' | 'Not required';
      count: number;
    }[];
    complianceRate: string | null;
  };
  codes: {
    outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Not available' | 'Not required' | null;
    code: string;
    label: string;
    description: string;
  }[];
  notes: {
    id: string;
    medicationName: string;
    date: string | null;
    kind: 'prescription' | 'reason' | 'response';
    text: string;
  }[];
  as_of: string;
  request_id: string;
};

export type MedicationWitnessRequest = {
  draft: {
    date: string;
    time: string;
    outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Not available' | 'Not required';
    actualAt?: string | null;
    doseUnits?: string | null;
    reason?: string;
    response?: string;
    witness?: string;
    witnessApprovalId?: string;
    covertAuthorityId?: string;
    covertAcknowledged?: boolean;
  };
  correctionOf?: string | null;
};

export type MedicationWitnessRead = {
  id: string;
  company_id: string;
  medicationId: string;
  medicationName: string;
  requester: string;
  draft: {
    date: string;
    time: string;
    outcome: 'Given' | 'Refused' | 'Omitted' | 'Absent' | 'Not available' | 'Not required';
    actualAt?: string | null;
    doseUnits?: string | null;
    reason?: string;
    response?: string;
    witness?: string;
    witnessApprovalId?: string;
    covertAuthorityId?: string;
    covertAcknowledged?: boolean;
  };
  correctionOf: string | null;
  expiresAt: string;
  status: 'pending' | 'approved' | 'stale' | 'used';
  canAttest: boolean;
  witnessEvidence: {
    status: 'verified' | 'unverified';
    name: string;
    userId: string | null;
    attestedAt: string | null;
  } | null;
};

export type MedicationWitnessAttest = {
  attested: boolean;
};

export type CovertAuthorityWrite = {
  decisionReference: string;
  prescriber: string;
  careLead: string;
  representative: string;
  instructions: string;
  effectiveFrom: string;
  effectiveTo: string;
  reviewDue: string;
};

export type CovertAuthorityTransition = {
  action: 'approve' | 'revoke';
  confirmed?: boolean;
  reason?: string;
};

export type CovertAuthorityRead = {
  decisionReference: string;
  prescriber: string;
  careLead: string;
  representative: string;
  instructions: string;
  effectiveFrom: string;
  effectiveTo: string;
  reviewDue: string;
  id: string;
  revision: number;
  etag: string;
  status:
    'pending' | 'approved' | 'scheduled' | 'superseded' | 'expired' | 'revoked' | 'review_due';
  approvedAt: string | null;
  approvedBy: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string;
};

export type CovertAuthorityRegister = {
  company_id: string;
  medicationId: string;
  records: {
    decisionReference: string;
    prescriber: string;
    careLead: string;
    representative: string;
    instructions: string;
    effectiveFrom: string;
    effectiveTo: string;
    reviewDue: string;
    id: string;
    revision: number;
    etag: string;
    status:
      'pending' | 'approved' | 'scheduled' | 'superseded' | 'expired' | 'revoked' | 'review_due';
    approvedAt: string | null;
    approvedBy: string | null;
    revokedAt: string | null;
    revokedBy: string | null;
    revocationReason: string;
  }[];
};
