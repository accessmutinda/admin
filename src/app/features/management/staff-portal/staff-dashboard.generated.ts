// Generated from backend OpenAPI.

export type StaffDashboardActivity = {
  id: string;
  entityId: string;
  clientId: string;
  actor: string;
  action: string;
  detail: string;
  at: string;
  category: string;
  status: string;
};

export type StaffDashboardCompany = {
  id: string;
  name: string;
  code: string;
};

export type StaffDashboardIdentity = {
  id: string;
  employment_id: string;
  name: string;
  email: string;
};

export type StaffDashboardLearning = {
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
};

export type StaffDashboardLearningItem = {
  id: string;
  courseId: string;
  title: string;
  due: string;
  status: 'Overdue' | 'Due soon' | 'Expired' | 'Expiring soon';
};

export type StaffDashboardMeta = {
  local_date: string;
  timezone: string;
  as_of: string;
  available: Record<string, boolean>;
  unavailable: string[];
};

export type StaffDashboardRead = {
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
};

export type StaffDashboardVisit = {
  id: string;
  date: string;
  clientId: string;
  staffIds: string[];
  state: 'Published' | 'Completed';
};
