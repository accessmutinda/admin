export const ROTA_ACTIONS = [
  {
    key: 'view',
    label: 'View rota',
    description: 'Read visits, call packages and allocation history',
  },
  {
    key: 'manage',
    label: 'Manage calls and allocations',
    description: 'Maintain service users, plan visits and arrange cover',
  },
  {
    key: 'publish',
    label: 'Publish rota',
    description: 'Release fully allocated visits to the published rota',
  },
  {
    key: 'attendance',
    label: 'Record attendance',
    description: 'Record verified actual start and end times',
  },
  { key: 'export', label: 'Export rota data', description: 'Download filtered visit schedules' },
] as const;
export type RotaAction = (typeof ROTA_ACTIONS)[number]['key'];
export function rotaDefaults(role: string): RotaAction[] {
  return [
    'Company Admin',
    'Platform Owner',
    'Registered Manager',
    'Care Coordinator',
    'Field Supervisor',
  ].includes(role)
    ? ROTA_ACTIONS.map((a) => a.key)
    : [];
}
export interface RotaClient {
  file?: import('../clients/client-file.models').ClientFile;
  riskFlags?: RiskFlag[];
  representative?: { name: string; relationship: string; phone: string; email: string };
  phone?: string;
  email?: string;
  billingRate?: number;
  billingBasis?: 'Visit hour' | 'Carer hour';
  id: string;
  name: string;
  reference: string;
  address: string;
  postcode: string;
  funding: 'Local authority' | 'Private' | 'NHS';
  priority: 'Standard' | 'High';
  active: boolean;
}
export interface RotaCall {
  priority?: 'Standard' | 'High';
  id: string;
  clientId: string;
  name: string;
  start: string;
  end: string;
  weekdays: number[];
  carers: number;
  skills: string[];
  regularStaffIds: string[];
  tasks: string;
  active: boolean;
}
export interface VisitAttendance {
  personId: string;
  start: string;
  end: string;
}
export interface RotaVisit {
  riskFlags?: RiskFlag[];
  demo?: boolean;
  manualOverride?: { at: string; by: string; reason: string; conflicts: string[] };
  id: string;
  callId: string;
  clientId: string;
  clientName: string;
  address: string;
  callName: string;
  date: string;
  start: string;
  end: string;
  carers: number;
  skills: string[];
  tasks: string;
  staffIds: string[];
  allocation: 'Regular' | 'Temporary';
  state: 'Draft' | 'Published' | 'Cancelled';
  priority: 'Standard' | 'High';
  attendance: VisitAttendance[];
  exception: string;
}
export const RISK_FLAGS = [
  'Medication support',
  'Living alone',
  'Dementia',
  'Critical / welfare-sensitive',
] as const;
export type RiskFlag = (typeof RISK_FLAGS)[number];
export interface RotaAudit {
  id: string;
  userId: string;
  at: string;
  user: string;
  action: string;
  detail: string;
}
export interface RotaData {
  ecm?: import('../ecm/ecm.models').EcmData;
  clients: RotaClient[];
  calls: RotaCall[];
  visits: RotaVisit[];
  audit: RotaAudit[];
  travelMinutes: number;
}
export const emptyRota = (): RotaData => ({
  clients: [],
  calls: [],
  visits: [],
  audit: [],
  travelMinutes: 15,
});
export const londonDate = (now = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}
export const minutes = (time: string): number =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const validTime = (time: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
export function visitWindow(visit: Pick<RotaVisit, 'date' | 'start' | 'end'>): [number, number] {
  const start = Date.parse(visit.date + 'T00:00:00Z') / 60000 + minutes(visit.start);
  return [start, start + ((minutes(visit.end) - minutes(visit.start) + 1440) % 1440)];
}
export function londonInstant(date: string, time: string): string | null {
  if (!validTime(time)) return null;
  const naive = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(naive)) return null;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const matches = [naive - 3600000, naive].filter((value) => {
    const parts = formatter.formatToParts(value);
    const p = (key: string) => parts.find((part) => part.type === key)!.value;
    return (
      `${p('year')}-${p('month')}-${p('day')}` === date && `${p('hour')}:${p('minute')}` === time
    );
  });
  return matches.length === 1 ? new Date(matches[0]).toISOString() : null;
}
export const completedVisit = (v: RotaVisit): boolean =>
  v.state === 'Published' &&
  v.staffIds.length === v.carers &&
  v.staffIds.every((id) => v.attendance.some((a) => a.personId === id && a.end));
