import { AppUser } from './user';

export interface AuthSession {
  user: AppUser;
  workspaceId: string | null;
  mfaVerified: boolean;
  signedInAt: string;
}
