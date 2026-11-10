// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type WorkforceCompliancePage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    key: string;
    person: {
      id: string;
      name: string;
      location: string;
      role: string;
      hr: {
        reference: string;
      };
    };
    check: {
      id: string;
      title: string;
      status: string;
      effectiveState: string;
      completed: string;
      expiry: string;
      reviewer: string;
      documentId: string;
      note: string;
    };
    evidence: {
      id: string;
      name: string;
    } | null;
    state: string;
    review_section: 'compliance' | 'employment';
  }[];
  meta: {
    company_id: string;
    page: number;
    page_size: number;
    as_of: string;
    local_date: string;
    request_id: string;
    filters: {};
    counts: {
      not_started: number;
      awaiting_review: number;
      due_soon: number;
      expired: number;
    };
    branches: string[];
    types: string[];
    unavailable_staff: number;
  };
};
