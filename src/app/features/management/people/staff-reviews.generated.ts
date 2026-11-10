// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type StaffReview = {
  id: string;
  version: number;
  etag: string;
  personId: string;
  person: string;
  type_id: string;
  type: string;
  date: string;
  assessor: string;
  assessor_id: string | null;
  status: string;
  discussion: string;
  outcome: string;
  score?: number;
  competencies: {
    title: string;
    score: number;
    observation: string;
  }[];
  completedAt: string | null;
  completed_by: string | null;
  correction_of: string | null;
  can_complete: boolean;
  overdue: boolean;
};

export type StaffReviewPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    version: number;
    etag: string;
    personId: string;
    person: string;
    type_id: string;
    type: string;
    date: string;
    assessor: string;
    assessor_id: string | null;
    status: string;
    discussion: string;
    outcome: string;
    score?: number;
    competencies: {
      title: string;
      score: number;
      observation: string;
    }[];
    completedAt: string | null;
    completed_by: string | null;
    correction_of: string | null;
    can_complete: boolean;
    overdue: boolean;
  }[];
  meta: {
    company_id: string;
    page: number;
    page_size: number;
    as_of: string;
    request_id: string;
    filters: {};
    local_date: string;
  };
};

export type StaffReviewWrite = {
  staff_id: string;
  type_id: string;
  date: string;
  assessor: string;
  correction_of?: string;
  reason?: string;
};

export type StaffReviewComplete = {
  discussion: string;
  outcome: string;
  score?: string | null;
  competencies?: {
    title: string;
    score: string;
    observation?: string;
  }[];
  reason: string;
};

export type StaffReviewType = {
  id: string;
  title: string;
  requires_rating: boolean;
};

export type StaffReviewDimension = {
  id: string;
  title: string;
};

export type StaffReviewOptions = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    name: string;
    branch: string;
    reference: string;
  }[];
  meta: {
    company_id: string;
    page: number;
    page_size: number;
    as_of: string;
    request_id: string;
    filters: {};
    types: {
      id: string;
      title: string;
      requires_rating: boolean;
    }[];
    dimensions: {
      id: string;
      title: string;
    }[];
    local_date: string;
    can_complete: boolean;
  };
};

export type StaffReviewProfile = {
  company_id: string;
  version: number;
  etag: string;
  person: {};
  readiness: {};
  courses: unknown[];
  local_date: string;
  capabilities: {};
  review_types: {
    id: string;
    title: string;
    requires_rating: boolean;
  }[];
  review_dimensions: {
    id: string;
    title: string;
  }[];
};

export type StaffReviewReason = {
  reason: string;
};
