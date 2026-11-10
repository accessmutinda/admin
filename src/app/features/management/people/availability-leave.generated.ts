// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type WorkforceAvailability = {
  company_id: string;
  version: number;
  etag: string;
  person: {};
  readiness: {};
  local_date: string;
  courses: unknown[];
  capabilities: {};
  leave_types: {
    id: string;
    name: string;
    requires_entitlement: boolean;
  }[];
};

export type WorkforceAvailabilityWrite = {
  mode: 'Weekly slots' | 'Custom times';
  availability: {
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    start: string;
    end: string;
    preference: 'Available' | 'Preferred' | 'Unavailable';
  }[];
  weeklySlots: {
    title: string;
    start: string;
    end: string;
    days: ('Available' | 'Preferred' | 'Unavailable')[];
  }[];
  preferences: {
    areas: string;
    travel: string;
    shifts: string;
    notes: string;
    clientGroups?: string[];
    liveIn?: '' | 'Interested' | 'Consider' | 'Not interested';
  };
  driver?: boolean | null;
  vehicle?: string;
};

export type WorkforceLeave = {
  id: string;
  version: number;
  etag: string;
  personId: string;
  person: string;
  type: string;
  type_id: string;
  start: string;
  end: string;
  status: string;
  reason: string;
  days: string;
  can_approve: boolean;
  can_cancel: boolean;
  balance: {} | null;
  balance_unavailable: string | null;
};

export type WorkforceLeavePage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    version: number;
    etag: string;
    personId: string;
    person: string;
    type: string;
    type_id: string;
    start: string;
    end: string;
    status: string;
    reason: string;
    days: string;
    can_approve: boolean;
    can_cancel: boolean;
    balance: {} | null;
    balance_unavailable: string | null;
  }[];
  meta: {};
};

export type WorkforceLeaveWrite = {
  staff_id: string;
  type_id: string;
  start: string;
  end: string;
  reason?: string;
};

export type WorkforceLeaveKind = {
  id: string;
  name: string;
  requires_entitlement: boolean;
};

export type WorkforceCalendar = {
  company_id: string;
  staff_id: string;
  month: string;
  timezone: string;
  days: {
    date: string;
    state: string;
  }[];
  as_of: string;
};

export type WorkforceLeaveDecisionWrite = {
  reason: string;
};

export type WorkforceLeaveRuleWrite = {
  staff_id: string;
  type_id: string;
  effective_from: string;
  effective_until: string;
  allowance: string;
  accrual?: 'upfront' | 'daily';
  weekdays: number[];
  excluded_dates?: string[];
  carryover_grant?: string;
  carryover_expiry?: string | null;
  reason: string;
};

export type WorkforceAvailabilityExceptionWrite = {
  start: string;
  end: string;
  state: 'Available' | 'Preferred' | 'Unavailable';
  reason: string;
};

export type WorkforceLeaveOptions = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    name: string;
    branch: string;
    reference: string;
  }[];
  meta: {
    company_id: string;
    page: number;
    page_size: number;
    as_of: string;
    request_id: string;
    filters: {};
    leave_types: {
      id: string;
      name: string;
      requires_entitlement: boolean;
    }[];
    local_date: string;
  };
};

export type WorkforceLeaveRule = {
  staff_id: string;
  type_id: string;
  effective_from: string;
  effective_until: string;
  allowance: string;
  accrual?: 'upfront' | 'daily';
  weekdays: number[];
  excluded_dates?: string[];
  carryover_grant?: string;
  carryover_expiry?: string | null;
  reason: string;
  id: string;
  version: number;
  etag: string;
};

export type WorkforceLeaveRulePage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    staff_id: string;
    type_id: string;
    effective_from: string;
    effective_until: string;
    allowance: string;
    accrual?: 'upfront' | 'daily';
    weekdays: number[];
    excluded_dates?: string[];
    carryover_grant?: string;
    carryover_expiry?: string | null;
    reason: string;
    id: string;
    version: number;
    etag: string;
  }[];
  meta: {
    company_id: string;
    page: number;
    page_size: number;
    as_of: string;
    request_id: string;
    filters: {};
  };
};

export type WorkforceAvailabilityException = {
  start: string;
  end: string;
  state: 'Available' | 'Preferred' | 'Unavailable';
  reason: string;
  id: string;
  version: number;
  etag: string;
  archived?: boolean;
};

export type WorkforceAvailabilityExceptionPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    start: string;
    end: string;
    state: 'Available' | 'Preferred' | 'Unavailable';
    reason: string;
    id: string;
    version: number;
    etag: string;
    archived?: boolean;
  }[];
  meta: {
    company_id: string;
    page: number;
    page_size: number;
    as_of: string;
    request_id: string;
    filters: {};
  };
};
