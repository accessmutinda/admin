// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type JournalEntryRead = {
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
};

export type JournalBulkWrite = {
  field: 'readBy' | 'archivedBy' | 'starredBy' | 'followUpBy' | 'deletedBy';
  enabled: boolean;
  entries: {
    id: string;
    etag: string;
  }[];
};

export type JournalBulkRead = {
  company_id: string;
  results: {
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
};

export type JournalEntryWrite = {
  clientId?: string | null;
  visitId?: string | null;
  replyToId?: string | null;
  kind?: 'Message' | 'Internal note';
  to?: string[];
  cc?: string[];
  subject: string;
  body?: string;
  bodyHtml?: string;
  category?: 'Care update' | 'Safeguarding' | 'Training' | 'General' | 'Meetings';
  priority?: 'Normal' | 'High';
  responseRequired?: boolean;
  attachment_ids?: string[];
};

export type JournalMarkWrite = {
  field: 'readBy' | 'archivedBy' | 'starredBy' | 'followUpBy' | 'deletedBy';
  enabled: boolean;
};

export type JournalPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
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
  meta: {
    company_id: string;
    local_date: string;
    request_id: string;
    folders: {};
    unread: number;
    awaiting: number;
    mentions: number;
    as_of: string;
  };
};

export type JournalTaskWrite = {
  owner: string;
  title: string;
  clientId?: string | null;
  visitId?: string | null;
  journalId?: string | null;
  due: string;
  dueTime?: string | null;
  followUp?: string | null;
  followUpTime?: string | null;
  priority?: 'Normal' | 'High' | 'Low' | 'Medium';
  status?: 'Open' | 'In progress' | 'Awaiting response' | 'Escalated' | 'Resolved';
  shared?: boolean;
  notes?: string;
  actions?: string;
  attachment_ids?: string[];
};

export type JournalTaskRead = {
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
};

export type JournalFileRead = {
  id: string;
  company_id: string;
  name: string;
  size: number;
  state: 'quarantined' | 'clean' | 'rejected';
  content_type: string;
  etag: string;
};

export type JournalOptions = {
  company_id: string;
  contacts: {
    name: string;
    email: string;
    role: string;
  }[];
  clients: {
    id: string;
    name: string;
  }[];
  visits: {
    id: string;
    date: string;
    start: string;
    callName: string;
  }[];
  next_page: number | null;
  can_create: boolean;
  can_edit: boolean;
  can_export: boolean;
  external_delivery: boolean;
};

export type JournalActivityPage = {
  company_id: string;
  count: number;
  next_page: number | null;
  results: {
    id: string;
    actor: string;
    audience: string[];
    action: string;
    entityId: string;
    clientId: string;
    subject: string;
    at: string;
  }[];
};

export type JournalTaskPage = {
  company_id: string;
  count: number;
  next_page: number | null;
  results: {
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
};

export type JournalClientRead = {
  id: string;
  name: string;
};
