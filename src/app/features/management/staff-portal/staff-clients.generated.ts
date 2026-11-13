// Generated from the backend staff service-user OpenAPI contract.
export type StaffClientAcknowledgement = {
  company_id: string;
};

export type StaffClientAuditEvent = {
  id: string;
  entityId: string;
  clientId: string;
  actor: string;
  action: string;
  detail: string;
  at: string;
  category: string;
  status: string;
  direction: string;
  recipient?: string;
};

export type StaffClientAuditQuery = {
  category?: string;
  type?: string;
  direction?: string;
  user?: string;
  status?: string;
  search?: string;
  start?: string;
  end?: string;
};

export type StaffClientAuditRead = {
  company_id: string;
  clientId: string;
  results: {
    id: string;
    entityId: string;
    clientId: string;
    actor: string;
    action: string;
    detail: string;
    at: string;
    category: string;
    status: string;
    direction: string;
    recipient?: string;
  }[];
};

export type StaffClientCancel = {
  reason: string;
};

export type StaffClientCancelBatch = {
  reason: string;
  visits: {
    id: string;
    etag: string;
  }[];
};

export type StaffClientCancelItem = {
  id: string;
  etag: string;
};

export type StaffClientContext = {
  company_id: string;
  actor_id: string;
  person_id: string;
  employment_id: string;
  name: string;
  email: string;
  company: {
    id: string;
    name: string;
    code: string;
  };
  local_date: string;
  timezone: string;
  available: Record<string, boolean>;
  capabilities: Record<string, boolean>;
};

export type StaffClientDetail = {
  company_id: string;
  clientId: string;
  record: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    name: string;
    reference: string;
    address: string;
    postcode: string;
    funding: string;
    priority: string;
    active: boolean;
    phone: string;
    email: string;
    details: {
      dob?: string | null;
      gender?: string;
      preferredName?: string;
      language?: string;
      nhs?: string;
      religion?: string;
      ethnicity?: string;
      gp?: string;
      living?: string;
      sexuality?: string;
      likes?: string;
      dislikes?: string;
      about?: string;
    };
    representative: {
      name?: string;
      relationship?: string;
      phone?: string;
      email?: string;
    };
    riskFlags: string[];
    photo_id: string | null;
    primary_needs: string[];
    packages: {
      id: string;
      name: string;
    }[];
    next_visit: {
      id: string;
      date: string;
      start: string;
    } | null;
    file: Record<string, unknown>;
  };
  available: Record<string, boolean>;
  tasks: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    owner: string;
    assignedBy: string;
    title: string;
    clientId: string;
    visitId: string;
    journalId: string;
    due: string;
    dueTime: string;
    followUp: string;
    followUpTime: string;
    priority: string;
    status: 'Open' | 'In progress' | 'Awaiting response' | 'Escalated' | 'Resolved';
    shared: boolean;
    notes: string;
    actions: string;
    resolvedAt: string | null;
    createdAt: string;
    attachments: {
      id: string;
      company_id: string;
      name: string;
      size: number;
      state: 'quarantined' | 'clean' | 'rejected';
      content_type: string;
      etag: string;
    }[];
  }[];
  journal: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    state_etag: string;
    author: string;
    is_author: boolean;
    authorEmail: string;
    to: string[];
    cc: string[];
    subject: string;
    clientId: string;
    visitId: string;
    replyToId: string;
    kind: 'Message' | 'Internal note';
    category: string;
    priority: string;
    body: string;
    bodyHtml: string;
    state: 'Draft' | 'Sent';
    createdAt: string;
    responseRequired: boolean;
    responseStatus: '' | 'Awaiting response' | 'Responded';
    attachments: {
      id: string;
      company_id: string;
      name: string;
      size: number;
      state: 'quarantined' | 'clean' | 'rejected';
      content_type: string;
      etag: string;
    }[];
    readBy: string[];
    archivedBy: string[];
    starredBy: string[];
    followUpBy: string[];
    deletedBy: string[];
  }[];
  communications: {
    id: string;
    company_id: string;
    clientId: string;
    version: number;
    etag: string;
    contactId: string;
    contactSource: 'contact' | 'representative';
    type: string;
    subject: string;
    details: string;
    at: string;
    loggedBy: string;
    loggedByEmail: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    followUp: string | null;
    status: string;
    direction: string;
    responseRequired: boolean;
    responseStatus: string;
    attachments: {
      id: string;
      company_id: string;
      name: string;
      size: number;
      state: 'quarantined' | 'clean' | 'rejected';
      content_type: string;
      etag: string;
    }[];
  }[];
  concerns: {
    title: string;
    description: string;
    type: 'Safeguarding' | 'Medication' | 'Conduct' | 'Care delivery' | 'Other';
    priority: 'Normal' | 'High';
    clientId: string;
    visitId: string;
    careEventId: string;
    staffEmail: string;
    assignedTo: string;
    followers: string[];
    visitDate: string;
    visitTime: string;
    location: string;
    outcome: string;
    checklist: {
      id: string;
      done: boolean;
      assignedTo?: string;
      due?: string | null;
      title: string;
      completedAt: string | null;
    }[];
    attachment_ids: string[];
    status:
      | 'Raised'
      | 'Acknowledged'
      | 'Assigned'
      | 'Under investigation'
      | 'Action taken'
      | 'Escalated'
      | 'Resolved'
      | 'Closed';
    id: string;
    company_id: string;
    version: number;
    etag: string;
    reference: string;
    raisedBy: string;
    raisedAt: string;
    history: {
      status: string;
      at: string;
      actor: string;
    }[];
    notes: {
      id: string;
      author: string;
      text: string;
      at: string;
      kind: string;
      attachments: {
        id: string;
        company_id: string;
        name: string;
        size: number;
        state: 'quarantined' | 'clean' | 'rejected';
        content_type: string;
        etag: string;
      }[];
    }[];
    evidence: {
      id: string;
      company_id: string;
      name: string;
      size: number;
      state: 'quarantined' | 'clean' | 'rejected';
      content_type: string;
      etag: string;
    }[];
    can_edit: boolean;
    can_note: boolean;
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
  activity: Record<string, string>[];
  local_date: string;
  timezone: string;
};

export type StaffClientGeneration = {
  company_id: string;
  ids: string[];
};

export type StaffClientPage = {
  company_id: string;
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    name: string;
    reference: string;
    address: string;
    postcode: string;
    funding: string;
    priority: string;
    active: boolean;
    phone: string;
    email: string;
    details: {
      dob?: string | null;
      gender?: string;
      preferredName?: string;
      language?: string;
      nhs?: string;
      religion?: string;
      ethnicity?: string;
      gp?: string;
      living?: string;
      sexuality?: string;
      likes?: string;
      dislikes?: string;
      about?: string;
    };
    representative: {
      name?: string;
      relationship?: string;
      phone?: string;
      email?: string;
    };
    riskFlags: string[];
    photo_id: string | null;
    primary_needs: string[];
    packages: {
      id: string;
      name: string;
    }[];
    next_visit: {
      id: string;
      date: string;
      start: string;
    } | null;
  }[];
  meta: Record<string, string>;
};

export type StaffClientQuery = {
  page?: number;
  page_size?: number;
  q?: string;
};

export type StaffClientRecord = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  name: string;
  reference: string;
  address: string;
  postcode: string;
  funding: string;
  priority: string;
  active: boolean;
  phone: string;
  email: string;
  details: {
    dob?: string | null;
    gender?: string;
    preferredName?: string;
    language?: string;
    nhs?: string;
    religion?: string;
    ethnicity?: string;
    gp?: string;
    living?: string;
    sexuality?: string;
    likes?: string;
    dislikes?: string;
    about?: string;
  };
  representative: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };
  riskFlags: string[];
  photo_id: string | null;
  primary_needs: string[];
  packages: {
    id: string;
    name: string;
  }[];
  next_visit: {
    id: string;
    date: string;
    start: string;
  } | null;
  file: Record<string, unknown>;
};
