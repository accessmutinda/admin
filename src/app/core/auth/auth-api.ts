import { environment } from '../../../environments/environment';

export const API_BASE = environment.apiBase;
export const API_BASE_PATH = new URL(API_BASE, 'http://localhost').pathname;

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
  home_path?: string;
  authentication?: {
    mfa_required?: boolean;
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

export function apiFieldErrors(value: unknown): Record<string, string[]> {
  const fields: Record<string, string[]> = Object.create(null);
  const visit = (value: unknown, path: string): void => {
    if (typeof value === 'string' && path) {
      fields[path] = [...(fields[path] ?? []), value];
    } else if (Array.isArray(value)) {
      for (const item of value) visit(item, path);
    } else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) visit(item, path ? `${path}.${key}` : key);
    }
  };
  visit(value, '');
  return fields;
}
