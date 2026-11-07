export type CompanyLifecycle = 'pending_setup' | 'active' | 'suspended' | 'archived';

export interface CompanySummary {
  id: string;
  code: string;
  name: string;
  lifecycle: CompanyLifecycle;
}

export interface CompanyPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: CompanySummary[];
  meta: Record<string, unknown>;
}

export interface CreateCompanyRequest {
  company: {
    name: string;
    code: string;
    legal_name?: string;
    trading_name?: string;
    sector?: string;
    country?: string;
    timezone?: string;
  };
  addresses: { line1: string; town: string; postcode: string }[];
  initial_admin: { email: string; mfa_override: 'inherit' };
}

export interface CreatedCompany {
  id: string;
  code: string;
  lifecycle: 'pending_setup';
  initial_admin_invitation: { id: string; state: string; delivery_state: string };
  request_id: string;
}

export const COMPANY_LIFECYCLE_LABELS: Record<CompanyLifecycle, string> = {
  pending_setup: 'Pending setup',
  active: 'Active',
  suspended: 'Suspended',
  archived: 'Archived',
};
