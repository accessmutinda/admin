// Generated from the backend staff concern OpenAPI contract.
export type StaffConcernCheckRead = {
  id: string;
  done: boolean;
  assignedTo?: string;
  due?: string | null;
  title: string;
  completedAt: string | null;
};

export type StaffConcernCheckWrite = {
  id: string;
  done: boolean;
  assignedTo?: string;
  due?: string | null;
};

export type StaffConcernContext = {
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
  checklist: string[];
  contacts: Record<string, string>[];
  clients: Record<string, string>[];
  capabilities: Record<string, boolean>;
};

export type StaffConcernHistory = {
  status: string;
  at: string;
  actor: string;
};

export type StaffConcernNoteRead = {
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
};

export type StaffConcernNoteWrite = {
  text: string;
  attachment_ids?: string[];
};

export type StaffConcernPage = {
  company_id: string;
  count: number;
  next: number | null;
  previous: number | null;
  results: {
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
  meta: Record<string, string>;
};

export type StaffConcernQuery = {
  page?: number;
  page_size?: number;
  search?: string;
  status?:
    | 'All'
    | 'Raised'
    | 'Acknowledged'
    | 'Assigned'
    | 'Under investigation'
    | 'Action taken'
    | 'Escalated'
    | 'Resolved'
    | 'Closed';
};

export type StaffConcernRead = {
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
};

export type StaffConcernTransition = {
  title: string;
  description: string;
  type: 'Safeguarding' | 'Medication' | 'Conduct' | 'Care delivery' | 'Other';
  priority?: 'Normal' | 'High';
  clientId?: string | null;
  visitId?: string | null;
  careEventId?: string | null;
  staffEmail?: string;
  assignedTo: string;
  followers?: string[];
  visitDate: string;
  visitTime?: string;
  location?: string;
  outcome?: string;
  checklist?: {
    id: string;
    done: boolean;
    assignedTo?: string;
    due?: string | null;
  }[];
  attachment_ids?: string[];
  status:
    | 'Raised'
    | 'Acknowledged'
    | 'Assigned'
    | 'Under investigation'
    | 'Action taken'
    | 'Escalated'
    | 'Resolved'
    | 'Closed';
};

export type StaffConcernWrite = {
  title: string;
  description: string;
  type: 'Safeguarding' | 'Medication' | 'Conduct' | 'Care delivery' | 'Other';
  priority?: 'Normal' | 'High';
  clientId?: string | null;
  visitId?: string | null;
  careEventId?: string | null;
  staffEmail?: string;
  assignedTo: string;
  followers?: string[];
  visitDate: string;
  visitTime?: string;
  location?: string;
  outcome?: string;
  checklist?: {
    id: string;
    done: boolean;
    assignedTo?: string;
    due?: string | null;
  }[];
  attachment_ids?: string[];
};
