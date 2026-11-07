import { AppUser } from '../core/auth/models/user';
import { Workspace } from '../core/auth/models/workspace';

export const DEMO_EMAIL = 'jane.doe@lqcs.co.uk';

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
