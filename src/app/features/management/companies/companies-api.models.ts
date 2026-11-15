export type SetupAreaKey =
  | 'general'
  | 'registration'
  | 'contacts'
  | 'locations'
  | 'branding'
  | 'modules'
  | 'access'
  | 'integrations';
export interface SetupArea {
  complete: boolean | null;
  available?: boolean;
  state?: 'pending' | 'in_progress' | 'complete' | 'unavailable';
  missing?: string[];
}
export type SetupProgress = Partial<Record<SetupAreaKey, SetupArea>> & { complete?: boolean };
export interface CompanyOverviewStats {
  authorised_total: number;
  active_total: number;
  pending_setup_total: number;
  profile_completion_percent: number;
  open_admin_tasks: number;
}

export type CompanyLifecycle = 'pending_setup' | 'active' | 'suspended' | 'archived';

export interface CompanySummary {
  id: string;
  code: string;
  name: string;
  lifecycle: CompanyLifecycle;
  registration_number?: string | null;
  profile_completion_percent?: number;
  setup_progress?: SetupProgress;
  service_type?: string | null;
  region?: string | null;
  plan?: string | null;
  primary_administrator?: {
    name?: string | null;
    email?: string | null;
    state?: string | null;
  } | null;
  postcode?: string | null;
  enabled_modules?: string[];
  enabled_product_modules?: string[];
  updated_at?: string | null;
}

export interface CompanyDetail extends CompanySummary {
  version: number;
  etag: string;
  trading_name?: string | null;
  description?: string | null;
  staff_size_band?: string | null;
  registration_number?: string | null;
  registration_country?: string | null;
  region?: string | null;
  country?: string | null;
  head_office_name?: string | null;
  head_office_address?: {
    line1: string;
    line2: string;
    city: string;
    county: string;
    postcode: string;
    country: string;
  } | null;
  registered_places?: number | null;
  primary_language?: string | null;
  date_established?: string | null;
  tagline?: string | null;
  updated_by?: { id: string; name: string } | null;
}

export interface CompanyPage {
  count: number;
  next: string | number | null;
  previous: string | number | null;
  results: CompanySummary[];
  meta: Record<string, unknown>;
}

export interface CreateCompanyRequest {
  company: {
    name: string;
    code: string;
    legal_name?: string;
    trading_name?: string;
    registration_number?: string;
    tax_number?: string;
    service_type?: string;
    staff_size_band?: string;
    region?: string;
    email?: string;
    phone?: string;
    website?: string;
    lifecycle?: 'pending_setup' | 'active';
    sector?: string;
    country?: string;
    timezone?: string;
  };
  addresses: {
    line1: string;
    town?: string;
    city?: string;
    line2?: string;
    county?: string;
    country?: string;
    kind?: string;
    postcode: string;
  }[];
  product_modules?: string[];
  branding?: { primary_colour: string; accent_colour: string };
  plan?: string;
  initial_admin: { email: string; mfa_override: 'inherit' };
}

export interface CreatedCompany {
  id: string;
  code: string;
  lifecycle: 'pending_setup' | 'active';
  initial_admin_invitation: { id: string; state: string; delivery_state: string };
  request_id: string;
}

export const COMPANY_LIFECYCLE_LABELS: Record<CompanyLifecycle, string> = {
  pending_setup: 'Pending setup',
  active: 'Active',
  suspended: 'Suspended',
  archived: 'Archived',
};
