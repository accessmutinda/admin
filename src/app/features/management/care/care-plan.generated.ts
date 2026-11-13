// Generated from backend OpenAPI.

export type CarePlanAssessmentWrite = {
  id?: string | null;
  name: string;
  section: string;
  findings: string;
  action: string;
  review: string | null;
  status: 'Recommended' | 'In progress' | 'Completed';
  fields?: Record<string, string>;
};

export type CarePlanCommand = {
  reason: string;
  source_token?: string;
  signature_name?: string;
  signature_confirmed?: boolean;
};

export type CarePlanDraftWrite = {
  source_token: string;
  review: string | null;
  confirmed: boolean;
  details: Record<string, string>;
  participation: Record<string, string>;
  capacity: Record<string, string>;
  packageDecision: 'Not reviewed' | 'No change' | 'Change required';
  packageProposal: string;
  qualityReview: string;
  sections: {
    name: string;
    required: boolean;
    complete: boolean;
    fields: Record<string, string>;
    review: string | null;
    visibility: {
      staff: boolean;
      family: boolean;
      inspector: boolean;
    };
  }[];
  body: {
    id?: string | null;
    view: 'Front' | 'Back';
    x: string;
    y: string;
    date: string;
    status: 'Open' | 'Monitoring' | 'Resolved';
    photo?: string | null;
    location: string;
    type: string;
    description: string;
    size: string;
    pain: string;
    issue: string;
    action: string;
    professional: string;
    related: string;
  }[];
  assessments: {
    id?: string | null;
    name: string;
    section: string;
    findings: string;
    action: string;
    review: string | null;
    status: 'Recommended' | 'In progress' | 'Completed';
    fields?: Record<string, string>;
  }[];
  decisions?: {
    key: string;
    decision: 'Accepted' | 'Rejected';
    rationale: string;
  }[];
  reason: string;
};

export type CarePlanEventRead = {
  at: string;
  by: string;
  action: string;
  detail: string;
};

export type CarePlanObservationWrite = {
  id?: string | null;
  view: 'Front' | 'Back';
  x: string;
  y: string;
  date: string;
  status: 'Open' | 'Monitoring' | 'Resolved';
  photo?: string | null;
  location: string;
  type: string;
  description: string;
  size: string;
  pain: string;
  issue: string;
  action: string;
  professional: string;
  related: string;
};

export type CarePlanQuery = {
  search?: string;
  status?: 'All' | 'Draft' | 'In review' | 'Approved' | 'Not started' | 'Overdue';
  page?: number;
  page_size?: number;
  revision?: string;
};

export type CarePlanRecordRead = {
  revision: number;
  versions: {
    id: string;
    version: string;
    status: string;
    author: string;
    authorId: string;
    contributors: string[];
    reviewer: string;
    approver: string;
    approvedAt: string;
    createdAt: string;
    review: string;
    confirmed: boolean;
    details: Record<string, string>;
    participation: Record<string, string>;
    capacity: Record<string, string>;
    packageDecision: string;
    packageProposal: string;
    packageStatus: string;
    qualityReview: string;
    sections: Record<string, string>[];
    body: Record<string, string>[];
    assessments: Record<string, string>[];
    events: {
      at: string;
      by: string;
      action: string;
      detail: string;
    }[];
    packageSnapshot: Record<string, string>[];
    documentSnapshot: Record<string, string>[];
    reviewReport: Record<string, string>;
  }[];
  packageHandoffs: Record<string, string>[];
};

export type CarePlanRegisterRead = {
  company_id: string;
  count: number;
  next: string | null;
  previous: string | null;
  results: Record<string, string>[];
  meta: Record<string, string>;
};

export type CarePlanReviewDecisionWrite = {
  key: string;
  decision: 'Accepted' | 'Rejected';
  rationale: string;
};

export type CarePlanSectionWrite = {
  name: string;
  required: boolean;
  complete: boolean;
  fields: Record<string, string>;
  review: string | null;
  visibility: {
    staff: boolean;
    family: boolean;
    inspector: boolean;
  };
};

export type CarePlanVersionRead = {
  id: string;
  version: string;
  status: string;
  author: string;
  authorId: string;
  contributors: string[];
  reviewer: string;
  approver: string;
  approvedAt: string;
  createdAt: string;
  review: string;
  confirmed: boolean;
  details: Record<string, string>;
  participation: Record<string, string>;
  capacity: Record<string, string>;
  packageDecision: string;
  packageProposal: string;
  packageStatus: string;
  qualityReview: string;
  sections: Record<string, string>[];
  body: Record<string, string>[];
  assessments: Record<string, string>[];
  events: {
    at: string;
    by: string;
    action: string;
    detail: string;
  }[];
  packageSnapshot: Record<string, string>[];
  documentSnapshot: Record<string, string>[];
  reviewReport: Record<string, string>;
};

export type CarePlanVisibility = {
  staff: boolean;
  family: boolean;
  inspector: boolean;
};

export type CarePlanWorkspaceRead = {
  company_id: string;
  id: string;
  etag: string;
  source_token: string;
  record: {
    revision: number;
    versions: {
      id: string;
      version: string;
      status: string;
      author: string;
      authorId: string;
      contributors: string[];
      reviewer: string;
      approver: string;
      approvedAt: string;
      createdAt: string;
      review: string;
      confirmed: boolean;
      details: Record<string, string>;
      participation: Record<string, string>;
      capacity: Record<string, string>;
      packageDecision: string;
      packageProposal: string;
      packageStatus: string;
      qualityReview: string;
      sections: Record<string, string>[];
      body: Record<string, string>[];
      assessments: Record<string, string>[];
      events: {
        at: string;
        by: string;
        action: string;
        detail: string;
      }[];
      packageSnapshot: Record<string, string>[];
      documentSnapshot: Record<string, string>[];
      reviewReport: Record<string, string>;
    }[];
    packageHandoffs: Record<string, string>[];
  };
  source: Record<string, string>;
  calls: Record<string, string>[];
  unavailable: string[];
  as_of: string;
};
