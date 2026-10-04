import { RoleCode } from './role';

export interface Invite {
  token: string;
  inviterName: string;
  inviterRoleLabel: string;
  inviteeEmail: string;
  roleCode: RoleCode;
  workspaceName: string;
  message: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined';
}
