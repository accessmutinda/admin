// Generated from backend OpenAPI.

export type RosterAllocationPlan = {
  id: string;
  etag: string;
  staffIds: string[];
};

export type RosterAttendanceRead = {
  personId: string;
  start: string;
  end: string;
};

export type RosterAttendanceWrite = {
  personId: string;
  start: string;
  end: string;
  note: string;
};

export type RosterAuditRead = {
  id: string;
  clientId: string | null;
  userId: string;
  at: string;
  user: string;
  action: string;
  detail: string;
};

export type RosterBulk = {
  plans: {
    id: string;
    etag: string;
    staffIds: string[];
  }[];
  reason: string;
};

export type RosterCallRead = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  clientId: string;
  start: string;
  end: string;
  carers: number | null;
  backupStaffId: string | null;
  skills: string[];
  tasks: string;
  priority: string;
  timeSensitive: boolean;
  toleranceMinutes: number | null;
  flexible: boolean;
  location: string;
  taskType: string;
  mileage: string | null;
  driverRequired: boolean;
  travelMinutes: number | null;
  name: string;
  active: boolean;
  scheduleRecorded: boolean;
  weekdays: number[];
  regularStaffIds: string[];
};

export type RosterCallWrite = {
  carers: number;
  skills: string[];
  tasks: string;
  priority: 'Standard' | 'High';
  timeSensitive: boolean;
  toleranceMinutes: number;
  flexible: boolean;
  location: 'Home' | 'Community';
  taskType: string;
  mileage: string | null;
  driverRequired: boolean;
  travelMinutes: number | null;
  clientId: string;
  name: string;
  start: string;
  end: string;
  weekdays: number[];
  regularStaffIds: string[];
  backupStaffId: string | null;
  active: boolean;
  reason: string;
};

export type RosterCallsRead = {
  company_id: string;
  calls: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    clientId: string;
    start: string;
    end: string;
    carers: number | null;
    backupStaffId: string | null;
    skills: string[];
    tasks: string;
    priority: string;
    timeSensitive: boolean;
    toleranceMinutes: number | null;
    flexible: boolean;
    location: string;
    taskType: string;
    mileage: string | null;
    driverRequired: boolean;
    travelMinutes: number | null;
    name: string;
    active: boolean;
    scheduleRecorded: boolean;
    weekdays: number[];
    regularStaffIds: string[];
  }[];
};

export type RosterCandidate = {
  id: string;
  name: string;
  hours: number;
  preferred: boolean;
  issues: string[];
};

export type RosterCandidates = {
  company_id: string;
  visit_id: string;
  candidates: {
    id: string;
    name: string;
    hours: number;
    preferred: boolean;
    issues: string[];
  }[];
};

export type RosterClientRead = {
  id: string;
  name: string;
  reference: string;
  address: string;
  postcode: string;
  funding: string;
  priority: string;
  active: boolean;
};

export type RosterCommand = {
  visits: {
    id: string;
    etag: string;
  }[];
  reason: string;
};

export type RosterCopy = {
  source: string;
  target: string;
  reason: string;
};

export type RosterGenerate = {
  clientId: string;
  callIds: string[];
  start: string;
  end: string;
  staffIds: string[] | null;
  allocation: 'Regular' | 'Temporary';
  weekdays?: number[] | null;
  options?: Record<string, string>;
  reason: string;
};

export type RosterInputs = {
  carers: number;
  skills: string[];
  tasks: string;
  priority: 'Standard' | 'High';
  timeSensitive: boolean;
  toleranceMinutes: number;
  flexible: boolean;
  location: 'Home' | 'Community';
  taskType: string;
  mileage: string | null;
  driverRequired: boolean;
  travelMinutes: number | null;
};

export type RosterLeaveRead = {
  personId: string;
  start: string;
  end: string;
  type: string;
  status: string;
};

export type RosterMutation = {
  company_id: string;
  ids: string[];
};

export type RosterQuery = {
  start?: string;
  end?: string;
  client?: string;
  staff?: string;
  search?: string;
  state?: 'All' | 'Draft' | 'Published' | 'Cancelled' | 'Planned';
};

export type RosterReason = {
  reason: string;
};

export type RosterRecurringOptions = {
  weekdays: number[];
  start?: string;
  durationMinutes: number;
  carers: number;
  backupStaffId: string | null;
  medicationSupport: boolean;
  notes: string;
  travelMinutes: number;
};

export type RosterSettingsWrite = {
  travelMinutes: number;
  reason: string;
};

export type RosterStaffRead = {
  id: string;
  name: string;
  gender: string | null;
  driver: boolean | null;
  hours: string | null;
  training: {
    courseId: string;
    completed: string;
    expiry: string;
    competency: string;
    practicalReviewDue: string;
  }[];
  availabilityRecorded: boolean | null;
  availableDays: string[] | null;
};

export type RosterSuggest = {
  visits: {
    id: string;
    etag: string;
  }[];
  staffIds?: string[] | null;
};

export type RosterSuggestedPlan = {
  id: string;
  etag: string;
  staffIds: string[];
};

export type RosterSuggestionRead = {
  company_id: string;
  plans: {
    id: string;
    etag: string;
    staffIds: string[];
  }[];
  unfilled: string[];
};

export type RosterTrainingRead = {
  courseId: string;
  completed: string;
  expiry: string;
  competency: string;
  practicalReviewDue: string;
};

export type RosterVersion = {
  id: string;
  etag: string;
};

export type RosterVisitRead = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  callId: string;
  clientId: string;
  clientName: string;
  address: string;
  callName: string;
  date: string;
  start: string;
  end: string;
  carers: number | null;
  requirementsRecorded: boolean;
  backupStaffId: string | null;
  skills: string[];
  tasks: string;
  staffIds: string[];
  allocation: string;
  state: string;
  priority: string;
  attendance: {
    personId: string;
    start: string;
    end: string;
  }[];
  exception: string;
  timeSensitive: boolean;
  toleranceMinutes: number | null;
  flexible: boolean;
  location: string;
  taskType: string;
  mileage: string | null;
  driverRequired: boolean;
  travelMinutes: number | null;
};

export type RosterVisitWrite = {
  carers: number;
  skills: string[];
  tasks: string;
  priority: 'Standard' | 'High';
  timeSensitive: boolean;
  toleranceMinutes: number;
  flexible: boolean;
  location: 'Home' | 'Community';
  taskType: string;
  mileage: string | null;
  driverRequired: boolean;
  travelMinutes: number | null;
  date: string;
  start: string;
  end: string;
  staffIds: string[];
  allocation: 'Regular' | 'Temporary';
  reason: string;
};

export type RosterWorkspace = {
  leaves: {
    personId: string;
    start: string;
    end: string;
    type: string;
    status: string;
  }[];
  company_id: string;
  timezone: string;
  local_date: string;
  start: string;
  end: string;
  clients: {
    id: string;
    name: string;
    reference: string;
    address: string;
    postcode: string;
    funding: string;
    priority: string;
    active: boolean;
  }[];
  calls: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    clientId: string;
    start: string;
    end: string;
    carers: number | null;
    backupStaffId: string | null;
    skills: string[];
    tasks: string;
    priority: string;
    timeSensitive: boolean;
    toleranceMinutes: number | null;
    flexible: boolean;
    location: string;
    taskType: string;
    mileage: string | null;
    driverRequired: boolean;
    travelMinutes: number | null;
    name: string;
    active: boolean;
    scheduleRecorded: boolean;
    weekdays: number[];
    regularStaffIds: string[];
  }[];
  visits: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    callId: string;
    clientId: string;
    clientName: string;
    address: string;
    callName: string;
    date: string;
    start: string;
    end: string;
    carers: number | null;
    requirementsRecorded: boolean;
    backupStaffId: string | null;
    skills: string[];
    tasks: string;
    staffIds: string[];
    allocation: string;
    state: string;
    priority: string;
    attendance: {
      personId: string;
      start: string;
      end: string;
    }[];
    exception: string;
    timeSensitive: boolean;
    toleranceMinutes: number | null;
    flexible: boolean;
    location: string;
    taskType: string;
    mileage: string | null;
    driverRequired: boolean;
    travelMinutes: number | null;
  }[];
  staff: {
    id: string;
    name: string;
    gender: string | null;
    driver: boolean | null;
    hours: string | null;
    training: {
      courseId: string;
      completed: string;
      expiry: string;
      competency: string;
      practicalReviewDue: string;
    }[];
    availabilityRecorded: boolean | null;
    availableDays: string[] | null;
  }[];
  audit: {
    id: string;
    clientId: string | null;
    userId: string;
    at: string;
    user: string;
    action: string;
    detail: string;
  }[];
  travelMinutes: number | null;
  settings_etag: string;
  unavailable_sources: string[];
};
