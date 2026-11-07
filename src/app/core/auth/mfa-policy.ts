export type MfaPolicy = 'inherit' | 'required' | 'not-required';

export interface MfaMember {
  email: string;
  id?: string;
  name?: string;
  status?: string;
  role: string;
  mfaEnabled?: boolean;
  mfaPolicy?: MfaPolicy;
}
export interface MfaWorkspace {
  members: MfaMember[];
  roleMfa?: Record<string, boolean>;
}

export function effectiveMfa(member: MfaMember, roleMfa: Record<string, boolean> = {}): boolean {
  if (member.mfaPolicy === 'required') return true;
  if (member.mfaPolicy === 'not-required') return false;
  return roleMfa[member.role] ?? true;
}
