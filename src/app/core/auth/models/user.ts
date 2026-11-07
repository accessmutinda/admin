import { RoleCode } from './role';

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  roleCode: RoleCode;
  mfaEnabled: boolean | null;
  mfaMethod: 'authenticator' | 'sms' | null;
  workspaceIds: string[];
}
