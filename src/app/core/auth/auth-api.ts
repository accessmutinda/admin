export const API_BASE = '/api/v1';

export type AuthState =
  | 'signed_out'
  | 'authenticated'
  | 'mfa_required'
  | 'mfa_enrolment_required'
  | 'password_change_required';

export interface MeProfile {
  id: string;
  version?: number;
  email: string;
  display_name: string;
  platform_roles: string[];
  platform_permissions: string[];
  available_contexts: string[];
  company_id: string | null;
  company_entry_state:
    'platform' | 'ready' | 'pending_setup' | 'suspended' | 'archived' | 'unavailable' | 'no_access';
  can_select_workspace: boolean;
  authentication?: {
    mfa_verified_at?: string | null;
    primary_method?: string;
    trusted_device_used?: boolean;
  };
}

export interface AuthResponse {
  state: AuthState;
  access?: string;
  expires_in?: number;
  user?: MeProfile;
  reason?: 'initial_password' | 'password_expired';
  password_policy?: { min_length: number; max_age_days: number };
  server_time?: string;
  idle_expires_at?: string;
  absolute_expires_at?: string;
}

export interface MfaEnrolment {
  device_id: string;
  secret: string;
  otpauth_url: string;
}

export interface ApiWorkspace {
  id: string;
  code?: string;
  name: string;
  lifecycle?: 'pending_setup' | 'active' | 'suspended' | 'archived';
  entryState?: MeProfile['company_entry_state'];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fieldErrors: Record<string, string[]> = {},
    readonly response?: AuthResponse,
  ) {
    super(message);
  }
}
