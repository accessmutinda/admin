import { AppUser } from './models/user';
import { Workspace } from './models/workspace';
import { Invite } from './models/invite';
import { LoginEvent, TrustedDevice } from './models/security';

// Frontend-only fixtures. There is no backend yet — sign-in, MFA, invites
// and password reset all check against this seed data. Swap AuthService's
// internals for real HTTP calls later without touching any component.

export const DEMO_EMAIL = 'jane.doe@lqcs.co.uk';
export const DEMO_PASSWORD = 'CareVerity123!';
export const DEMO_MFA_CODE = '123456';

export const DEMO_USER: AppUser = {
  id: 'user-1',
  name: 'Jane Doe',
  initials: 'JD',
  email: DEMO_EMAIL,
  roleCode: 'CW',
  mfaEnabled: true,
  mfaMethod: 'authenticator',
  workspaceIds: ['lqcs', 'riverside', 'sunrise', 'meadowview', 'oakwood'],
};

export const WORKSPACES: Workspace[] = [
  {
    id: 'lqcs',
    name: 'London Quality Care Services',
    shortCode: 'LQ',
    careType: 'Domiciliary care',
    serviceUserCount: 320,
    colorClass: 'bg-teal-600',
  },
  {
    id: 'riverside',
    name: 'Riverside Care Home',
    shortCode: 'RC',
    careType: 'Residential care',
    serviceUserCount: 64,
    colorClass: 'bg-emerald-600',
  },
  {
    id: 'sunrise',
    name: 'Sunrise Support Services',
    shortCode: 'SS',
    careType: 'Supported living',
    serviceUserCount: 128,
    colorClass: 'bg-amber-500',
  },
  {
    id: 'meadowview',
    name: 'Meadow View Care',
    shortCode: 'MV',
    careType: 'Dementia care',
    serviceUserCount: 76,
    colorClass: 'bg-lime-600',
  },
  {
    id: 'oakwood',
    name: 'Oakwood Community Care',
    shortCode: 'OC',
    careType: 'Community care',
    serviceUserCount: 210,
    colorClass: 'bg-green-600',
  },
];

export const INVITES: Record<string, Invite> = {
  'demo-invite': {
    token: 'demo-invite',
    inviterName: 'Sarah Mitchell',
    inviterRoleLabel: 'Company Admin',
    inviteeEmail: 'alex.carter@lqcs.co.uk',
    roleCode: 'CW',
    workspaceName: 'Brighter Lives Care Ltd',
    message: "Welcome to the team! We're excited to have you on board.",
    expiresAt: daysFromNow(14),
    status: 'pending',
  },
  'expired-invite': {
    token: 'expired-invite',
    inviterName: 'Sarah Mitchell',
    inviterRoleLabel: 'Company Admin',
    inviteeEmail: 'alex.carter@lqcs.co.uk',
    roleCode: 'CW',
    workspaceName: 'Brighter Lives Care Ltd',
    message: "Welcome to the team! We're excited to have you on board.",
    expiresAt: daysFromNow(-1),
    status: 'pending',
  },
};

export const LOGIN_HISTORY: LoginEvent[] = [
  {
    id: 'le-1',
    dateTime: '24 Apr 2025, 09:14',
    location: 'London, UK',
    device: 'Chrome / Windows',
    method: 'Password + MFA',
    status: 'Success',
  },
  {
    id: 'le-2',
    dateTime: '23 Apr 2025, 18:27',
    location: 'Manchester, UK',
    device: 'Edge / Windows',
    method: 'SSO (Authenticator)',
    status: 'Success',
  },
  {
    id: 'le-3',
    dateTime: '22 Apr 2025, 07:22',
    location: 'London, UK',
    device: 'iPhone / iOS',
    method: 'SSO',
    status: 'Success',
  },
  {
    id: 'le-4',
    dateTime: '20 Apr 2025, 21:11',
    location: 'Birmingham, UK',
    device: 'Chrome / Mac',
    method: 'Password',
    status: 'Success',
  },
  {
    id: 'le-5',
    dateTime: '18 Apr 2025, 16:03',
    location: 'London, UK',
    device: 'Chrome / Windows',
    method: 'Password + MFA',
    status: 'Success',
  },
  {
    id: 'le-6',
    dateTime: '17 Apr 2025, 08:45',
    location: 'Unknown',
    device: 'Edge / Windows',
    method: 'Password',
    status: 'Blocked',
  },
  {
    id: 'le-7',
    dateTime: '16 Apr 2025, 14:09',
    location: 'London, UK',
    device: 'Chrome / Mac',
    method: 'Password',
    status: 'Success',
  },
  {
    id: 'le-8',
    dateTime: '15 Apr 2025, 08:46',
    location: 'London, UK',
    device: 'Edge / Windows',
    method: 'Password + MFA',
    status: 'Success',
  },
];

export const TRUSTED_DEVICES: TrustedDevice[] = [
  {
    id: 'td-1',
    name: 'Windows Laptop',
    detail: 'Chrome · London, UK',
    addedOn: '12 Mar 2025',
  },
  {
    id: 'td-2',
    name: 'iPhone 14',
    detail: 'iOS · Manchester, UK',
    addedOn: '8 Feb 2025',
  },
];

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
