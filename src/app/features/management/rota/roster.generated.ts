// Generated from backend OpenAPI.

export type RosterAllocationPlan = {
  id: string;
  etag: string;
  staffIds: string[];
};

export type RosterAttendanceRead = {
  personId: string;
  start: string;
  end: string | null;
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

export type RosterHistoryAuditPage = {
  company_id: string;
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    clientId: string | null;
    userId: string;
    at: string;
    user: string;
    action: string;
    detail: string;
    source_version: number;
    visit_id: string | null;
    package_id: string | null;
    request_id: string;
  }[];
  context: {
    ecm?: {
      lateMinutes: number;
      riskMinutes: number;
      missedMinutes: number;
      styles: Record<
        string,
        {
          background: string;
          color: string;
          label: string;
          duration?: number;
          priority?: 'Standard' | 'High';
          skills?: string[];
          active?: boolean;
        }
      >;
    } | null;
    attendance_available: boolean;
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
        end: string | null;
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
  } | null;
  meta: {
    revision: string;
    as_of: string;
    metrics: {
      visits: number;
      completed: number | null;
      cancelled: number;
      audit: number;
    };
    training_options: {
      id: string;
      name: string;
    }[];
  };
};

export type RosterHistoryEvent = {
  id: string;
  clientId: string | null;
  userId: string;
  at: string;
  user: string;
  action: string;
  detail: string;
  source_version: number;
  visit_id: string | null;
  package_id: string | null;
  request_id: string;
};

export type RosterHistoryMeta = {
  revision: string;
  as_of: string;
  metrics: {
    visits: number;
    completed: number | null;
    cancelled: number;
    audit: number;
  };
  training_options: {
    id: string;
    name: string;
  }[];
};

export type RosterHistoryMetrics = {
  visits: number;
  completed: number | null;
  cancelled: number;
  audit: number;
};

export type RosterHistoryPage = {
  company_id: string;
  count: number;
  next: string | null;
  previous: string | null;
  results: {
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
      end: string | null;
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
  context: {
    ecm?: {
      lateMinutes: number;
      riskMinutes: number;
      missedMinutes: number;
      styles: Record<
        string,
        {
          background: string;
          color: string;
          label: string;
          duration?: number;
          priority?: 'Standard' | 'High';
          skills?: string[];
          active?: boolean;
        }
      >;
    } | null;
    attendance_available: boolean;
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
        end: string | null;
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
  } | null;
  meta: {
    revision: string;
    as_of: string;
    metrics: {
      visits: number;
      completed: number | null;
      cancelled: number;
      audit: number;
    };
    training_options: {
      id: string;
      name: string;
    }[];
  };
};

export type RosterHistoryQuery = {
  start?: string;
  end?: string;
  client?: string;
  staff?: string;
  search?: string;
  page?: number;
  page_size?: number;
  revision?: string;
  as_of?: string;
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

export type RosterOverviewAlert = {
  kind: string;
  count: number | null;
  visit_id: string | null;
};

export type RosterOverviewMetric = {
  key: string;
  value: number | null;
  percentage: number | null;
};

export type RosterOverviewQuery = {
  start?: string;
  end?: string;
  client?: string;
  staff?: string;
  search?: string;
  state?: 'All' | 'Draft' | 'Published' | 'Cancelled' | 'Planned';
  location?: string;
  skill?: string;
  gender?: string;
  driver?: '' | 'Yes' | 'No';
  availability?: boolean;
  show_unallocated?: boolean;
  allocation?: 'All' | 'Allocated' | 'Unallocated';
  medication?: '' | 'Yes' | 'No';
  handling?: '' | 'Yes' | 'No';
  dementia?: '' | 'Yes' | 'No';
  challenging?: '' | 'Yes' | 'No';
};

export type RosterOverviewRead = {
  ecm?: {
    lateMinutes: number;
    riskMinutes: number;
    missedMinutes: number;
    styles: Record<
      string,
      {
        background: string;
        color: string;
        label: string;
        duration?: number;
        priority?: 'Standard' | 'High';
        skills?: string[];
        active?: boolean;
      }
    >;
  } | null;
  attendance_available: boolean;
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
      end: string | null;
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
  visit_statuses: Record<string, string>;
  matching_visit_ids: string[];
  training_options: {
    id: string;
    name: string;
  }[];
  metrics: {
    key: string;
    value: number | null;
    percentage: number | null;
  }[];
  alerts: {
    kind: string;
    count: number | null;
    visit_id: string | null;
  }[];
  previous_count: number;
  change_percentage: number | null;
  staff_on_leave: number | null;
  as_of: string;
};

export type RosterPackageMeta = {
  revision: string;
  metrics: {
    active_clients: number;
    active_packages: number;
    regular_carers: number;
    priority_packages: number;
  };
  training_options: {
    id: string;
    name: string;
  }[];
};

export type RosterPackageMetrics = {
  active_clients: number;
  active_packages: number;
  regular_carers: number;
  priority_packages: number;
};

export type RosterPackagePage = {
  company_id: string;
  count: number;
  next: string | null;
  previous: string | null;
  results: {
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
  context: {
    ecm?: {
      lateMinutes: number;
      riskMinutes: number;
      missedMinutes: number;
      styles: Record<
        string,
        {
          background: string;
          color: string;
          label: string;
          duration?: number;
          priority?: 'Standard' | 'High';
          skills?: string[];
          active?: boolean;
        }
      >;
    } | null;
    attendance_available: boolean;
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
        end: string | null;
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
  } | null;
  meta: {
    revision: string;
    metrics: {
      active_clients: number;
      active_packages: number;
      regular_carers: number;
      priority_packages: number;
    };
    training_options: {
      id: string;
      name: string;
    }[];
  };
};

export type RosterPackageQuery = {
  client?: string;
  page?: number;
  page_size?: number;
  revision?: string;
};

export type RosterPublishingMetrics = {
  drafts: number;
  unallocated: number;
  conflicts: number | null;
  published: number;
};

export type RosterPublishingQuery = {
  start?: string;
  end?: string;
};

export type RosterPublishingRead = {
  ecm?: {
    lateMinutes: number;
    riskMinutes: number;
    missedMinutes: number;
    styles: Record<
      string,
      {
        background: string;
        color: string;
        label: string;
        duration?: number;
        priority?: 'Standard' | 'High';
        skills?: string[];
        active?: boolean;
      }
    >;
  } | null;
  attendance_available: boolean;
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
      end: string | null;
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
  training_options: {
    id: string;
    name: string;
  }[];
  metrics: {
    drafts: number;
    unallocated: number;
    conflicts: number | null;
    published: number;
  };
  reviews: Record<
    string,
    {
      etag: string;
      ready: boolean | null;
      issues: string[];
    }
  >;
};

export type RosterPublishingReview = {
  etag: string;
  ready: boolean | null;
  issues: string[];
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

export type RosterTrainingOption = {
  id: string;
  name: string;
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
    end: string | null;
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
  ecm?: {
    lateMinutes: number;
    riskMinutes: number;
    missedMinutes: number;
    styles: Record<
      string,
      {
        background: string;
        color: string;
        label: string;
        duration?: number;
        priority?: 'Standard' | 'High';
        skills?: string[];
        active?: boolean;
      }
    >;
  } | null;
  attendance_available: boolean;
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
      end: string | null;
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
