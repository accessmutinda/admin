import type { ApiWorkspace } from '../auth-api';

export interface Workspace {
  id: string;
  name: string;
  shortCode?: string;
  logoUrl?: string;
  careType?: string;
  lifecycle?: ApiWorkspace['lifecycle'];
  entryState?: ApiWorkspace['entryState'];
  serviceUserCount?: number;
  colorClass: string;
}
