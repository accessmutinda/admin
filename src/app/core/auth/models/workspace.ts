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

export function companyInitials(name: string | null | undefined): string {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
