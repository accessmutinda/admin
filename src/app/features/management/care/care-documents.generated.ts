// Generated from backend OpenAPI.

export type CareDocumentHistory = {
  company_id: string;
  service_user_id: string;
  revisions: {
    id: string;
    company_id: string;
    service_user_id: string;
    revision: number;
    etag: string;
    name: string;
    category: string;
    version: string;
    status: 'Current' | 'Under Review';
    issueDate: string;
    reviewDate: string;
    description: string;
    visibility: {
      staff: boolean;
      family: boolean;
      inspector: boolean;
    };
    size: number;
    mime: string;
    filename: string;
    state: string;
    at: string;
    by: string;
    updatedAt: string;
    updatedBy: string;
  }[];
};

export type CareDocumentPage = {
  company_id: string;
  service_user_id: string;
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    company_id: string;
    service_user_id: string;
    revision: number;
    etag: string;
    name: string;
    category: string;
    version: string;
    status: 'Current' | 'Under Review';
    issueDate: string;
    reviewDate: string;
    description: string;
    visibility: {
      staff: boolean;
      family: boolean;
      inspector: boolean;
    };
    size: number;
    mime: string;
    filename: string;
    state: string;
    at: string;
    by: string;
    updatedAt: string;
    updatedBy: string;
  }[];
  meta: Record<string, string>;
};

export type CareDocumentQuery = {
  page?: number;
  page_size?: number;
};

export type CareDocumentRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  revision: number;
  etag: string;
  name: string;
  category: string;
  version: string;
  status: 'Current' | 'Under Review';
  issueDate: string;
  reviewDate: string;
  description: string;
  visibility: {
    staff: boolean;
    family: boolean;
    inspector: boolean;
  };
  size: number;
  mime: string;
  filename: string;
  state: string;
  at: string;
  by: string;
  updatedAt: string;
  updatedBy: string;
};

export type CareDocumentReason = {
  reason: string;
};

export type CareDocumentSharing = {
  audience: 'staff' | 'family' | 'inspector';
  value: boolean;
  reason: string;
};

export type CareDocumentUpload = {
  file: string;
  metadata: string;
};

export type CareDocumentWrite = {
  name: string;
  category: string;
  version: string;
  status: 'Current' | 'Under Review';
  issueDate: string | null;
  reviewDate: string | null;
  description: string;
  visibility: {
    staff: boolean;
    family: boolean;
    inspector: boolean;
  };
  reason: string;
};
