import type { WorkspaceData } from '../../shared/management.store';
import { qualityDefaults } from '../../quality/quality.models';

export interface AccessChange {
  id: string;
  at: string;
  actor: string;
  actorId: string;
  action: 'invited' | 'updated' | 'removed' | 'permissions';
  subject: string;
  detail: string;
}
export function accessChange(
  actor: { id: string; name: string } | null,
  action: AccessChange['action'],
  subject: string,
  detail: string,
): AccessChange {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: actor?.name ?? 'Company administrator',
    actorId: actor?.id ?? '',
    action,
    subject,
    detail,
  };
}
export function rolePermissions(data: WorkspaceData, role: string, module: string): boolean[] {
  const saved = data.permissions[role + ':' + module];
  return [
    ...(saved ??
      (module === 'Quality & compliance' ? qualityDefaults(role) : [true, true, true, true, true])),
  ];
}
export function permissionLevel(values: boolean[]): { label: string; icon: string; tone: string } {
  if (!values.length) return { label: 'No Access', icon: 'do_not_disturb_on', tone: 'none' };
  if (values.every(Boolean)) return { label: 'Full Access', icon: 'check_circle', tone: 'full' };
  if (!values[0]) return { label: 'No Access', icon: 'do_not_disturb_on', tone: 'none' };
  if (values.slice(1).every((value) => !value))
    return { label: 'View Only', icon: 'visibility', tone: 'view' };
  return { label: 'Limited Access', icon: 'contrast', tone: 'limited' };
}
export function accessCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);
          const safe = /^\s*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
          return '"' + safe.replaceAll('"', '""') + '"';
        })
        .join(','),
    )
    .join('\r\n');
}
