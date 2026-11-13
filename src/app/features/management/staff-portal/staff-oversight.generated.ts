// Generated from the backend staff oversight OpenAPI contract.
export type StaffOversightConcern = {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  clientId: string;
  assignedTo: string;
  visitDate: string;
  due: string | null;
  status: string;
  history: {
    status: string;
    at: string;
    actor: string;
  }[];
};

export type StaffOversightRead = {
  company_id: string;
  actor_id: string;
  company: {
    id: string;
    name: string;
    code: string;
  };
  staff: {
    id: string;
    employment_id: string;
    name: string;
    email: string;
  };
  meta: {
    local_date: string;
    timezone: string;
    as_of: string;
    available: Record<string, boolean>;
    unavailable: string[];
  };
  metrics: Record<string, number>;
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
  inbox: {
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
  clients: {
    id: string;
    name: string;
  }[];
  visits: {
    id: string;
    date: string;
    clientId: string;
    staffIds: string[];
    state: 'Published' | 'Completed';
  }[];
  activity: {
    id: string;
    entityId: string;
    clientId: string;
    actor: string;
    action: string;
    detail: string;
    at: string;
    category: string;
    status: string;
  }[];
  training: {
    assigned: number;
    due: number;
    evidence_pending: number;
    attention: {
      id: string;
      courseId: string;
      title: string;
      due: string;
      status: 'Overdue' | 'Due soon' | 'Expired' | 'Expiring soon';
    }[];
  } | null;
  can_compose: boolean;
  concerns: {
    id: string;
    title: string;
    description: string;
    type: string;
    priority: string;
    clientId: string;
    assignedTo: string;
    visitDate: string;
    due: string | null;
    status: string;
    history: {
      status: string;
      at: string;
      actor: string;
    }[];
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
  mini_stats: Record<string, number>;
  summaries: Record<
    string,
    {
      name: string;
      count: number | null;
      color: string;
    }[]
  >;
  statuses: {
    name: string;
    count: number | null;
    color: string;
    percent: number | null;
  }[];
  can_create_task: boolean;
  task_total: number | null;
};

export type StaffOversightStatus = {
  name: string;
  count: number | null;
  color: string;
  percent: number | null;
};

export type StaffOversightSummary = {
  name: string;
  count: number | null;
  color: string;
};
