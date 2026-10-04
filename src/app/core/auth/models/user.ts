import { RoleCode } from './role';

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  roleCode: RoleCode;
  mfaEnabled: boolean;
  mfaMethod: 'authenticator' | 'sms';
  workspaceIds: string[];
}
