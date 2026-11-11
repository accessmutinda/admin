// Generated from backend OpenAPI.

export type CareEventHistory = {
  company_id: string;
  service_user_id: string;
  revisions: {
    id: string;
    company_id: string;
    service_user_id: string;
    kind: 'incidents' | 'complaints' | 'feedback';
    version: number;
    etag: string;
    name: string;
    detail: string;
    date: string;
    level: 'Low' | 'Medium' | 'High';
    status: 'Active' | 'Completed' | 'Inactive';
    feedbackType?: '' | 'Feedback' | 'Review' | 'Compliment' | 'Suggestion' | 'Concern';
    rating?: number | null;
    receivedFrom?: string;
    changeReason: string;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  }[];
};

export type CareEventPage = {
  company_id: string;
  service_user_id: string;
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    company_id: string;
    service_user_id: string;
    kind: 'incidents' | 'complaints' | 'feedback';
    version: number;
    etag: string;
    name: string;
    detail: string;
    date: string;
    level: 'Low' | 'Medium' | 'High';
    status: 'Active' | 'Completed' | 'Inactive';
    feedbackType?: '' | 'Feedback' | 'Review' | 'Compliment' | 'Suggestion' | 'Concern';
    rating?: number | null;
    receivedFrom?: string;
    changeReason: string;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  }[];
  meta: Record<string, string>;
};

export type CareEventQuery = {
  kind?: 'incidents' | 'complaints' | 'feedback';
  page?: number;
  page_size?: number;
};

export type CareEventRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  kind: 'incidents' | 'complaints' | 'feedback';
  version: number;
  etag: string;
  name: string;
  detail: string;
  date: string;
  level: 'Low' | 'Medium' | 'High';
  status: 'Active' | 'Completed' | 'Inactive';
  feedbackType?: '' | 'Feedback' | 'Review' | 'Compliment' | 'Suggestion' | 'Concern';
  rating?: number | null;
  receivedFrom?: string;
  changeReason: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type CareEventReason = {
  reason: string;
};

export type CareEventWrite = {
  kind: 'incidents' | 'complaints' | 'feedback';
  name: string;
  detail: string;
  date: string;
  level: 'Low' | 'Medium' | 'High';
  status: 'Active' | 'Completed' | 'Inactive';
  reason: string;
  feedbackType?: '' | 'Feedback' | 'Review' | 'Compliment' | 'Suggestion' | 'Concern';
  rating?: number | null;
  receivedFrom?: string;
};
