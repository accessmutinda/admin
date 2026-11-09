// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type WorkforceStaff = {
  id: string;
  company_id: string;
  employment_id: string;
  version: number;
  reference: string | null;
  name: string;
  role_id: string | null;
  role: string | null;
  branch_id: string | null;
  branch: string | null;
  status: 'Onboarding' | 'Active' | 'Inactive' | 'Left';
  email: string | null;
  phone: string | null;
  driver: boolean | null;
  availability: string | null;
};

export type WorkforceSummary = {
  company_id: string;
  company: {
    id: string;
    name: string;
    code: string;
    sector: string | null;
    head_office_address: string | null;
  };
  as_of: string;
  local_date: string;
  timezone: string;
  totals: {
    staff: number;
    active: number;
    onboarding: number;
    inactive: number;
    left: number;
    branches: number;
    drafts: number | null;
    compliance_actions: number | null;
    compliance_percent: string | null;
  };
  unavailable: {};
  capabilities: {
    staff_create: boolean;
    staff_profile: boolean;
    staff_edit: boolean;
  };
};

export type WorkforcePage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    company_id: string;
    employment_id: string;
    version: number;
    reference: string | null;
    name: string;
    role_id: string | null;
    role: string | null;
    branch_id: string | null;
    branch: string | null;
    status: 'Onboarding' | 'Active' | 'Inactive' | 'Left';
    email: string | null;
    phone: string | null;
    driver: boolean | null;
    availability: string | null;
  }[];
  meta: {
    company_id: string;
    as_of: string;
    page: number;
    page_size: number;
    filters: {};
    branches: {
      id: string;
      label: string;
    }[];
    roles: {
      id: string;
      label: string;
    }[];
    unavailable: {};
  };
};
