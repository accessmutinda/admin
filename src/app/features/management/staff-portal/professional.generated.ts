// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type ProfessionalUpload = {
  file: string;
};

export type ProfessionalWrite = {
  contactId: string;
  contactSource: 'contact' | 'representative';
  type:
    | 'GP note'
    | 'District nurse note'
    | 'OT request'
    | 'Social worker email'
    | 'Hospital communication'
    | 'Family update'
    | 'Phone call'
    | 'Email'
    | 'Management action';
  subject: string;
  details: string;
  at: string;
  followUp: string | null;
  status: 'Open' | 'In progress' | 'Resolved';
  direction: 'Received' | 'Sent' | 'Internal';
  responseRequired: boolean;
  responseStatus: '' | 'Awaiting response' | 'Responded';
  attachment_ids: string[];
};

export type ProfessionalRead = {
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
};

export type ProfessionalQuery = {
  search?: string;
  type?:
    | 'All'
    | 'GP note'
    | 'District nurse note'
    | 'OT request'
    | 'Social worker email'
    | 'Hospital communication'
    | 'Family update'
    | 'Phone call'
    | 'Email'
    | 'Management action';
  period?: 'All time' | 'Last 7 days' | 'Last 30 days';
};

export type ProfessionalWorkspace = {
  company_id: string;
  clientId: string;
  timezone: string;
  today: string;
  total: number;
  records: {
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
  contacts: {
    id: string;
    company_id: string;
    service_user_id: string;
    name: string;
    relationship: string;
    phone: string;
    email: string;
    type: string;
    nextOfKin: boolean;
    source: 'contact' | 'representative';
    version: number;
    etag: string;
    lastContact: string | null;
    nextFollowUp: string | null;
  }[];
};

export type ProfessionalContactRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  type: string;
  nextOfKin: boolean;
  source: 'contact' | 'representative';
  version: number;
  etag: string;
  lastContact: string | null;
  nextFollowUp: string | null;
};

export type ProfessionalContactWrite = {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  type: 'Professional' | 'GP' | 'Family' | 'Emergency' | 'Pharmacy';
  nextOfKin: boolean;
};

export type ProfessionalReason = {
  reason: string;
};

export type ProfessionalContacts = {
  company_id: string;
  service_user_id: string;
  contacts: ProfessionalContactRead[];
};
