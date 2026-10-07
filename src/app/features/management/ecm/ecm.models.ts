import { RotaVisit, addDays, completedVisit, londonInstant } from '../rota/rota.models';

export const ECM_ACTIONS = [
  'Contact carer',
  'Contact family / representative',
  'Record delay notification',
  'Request changed time',
  'Manager note',
  'Mark reviewed',
  'Escalate missed visit risk',
] as const;
export type EcmAction = (typeof ECM_ACTIONS)[number];
export interface EcmRecord {
  queueMessage?: boolean;
  channel?: 'SMS' | 'Email' | 'In-app';
  recipient?: string;
  ownerId?: string;
  id: string;
  visitId: string;
  at: string;
  user: string;
  action: string;
  note: string;
  contact: string;
  contactAt?: string;
  outcome: string;
  eta: string;
  accepted: boolean;
  concern: boolean;
  followUp: string;
}
export interface EcmEvidence {
  audio?: string;
  audioName?: string;
  transcript?: string;
  id: string;
  visitId: string;
  at: string;
  user: string;
  type: 'Care note' | 'Safeguarding' | 'Wound / skin' | 'Other concern';
  note: string;
  photo: string;
  photoName: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
export interface CallStyle {
  duration?: number;
  priority?: 'Standard' | 'High';
  skills?: string[];
  active?: boolean;
  background: string;
  color: string;
  label: string;
}
export interface EcmData {
  notifications: DemoNotification[];
  escalations: EcmEscalation[];
  invoices: ClientInvoice[];
  packs: EvidencePack[];
  feed: DemoFeedEvent[];
  lateMinutes: number;
  riskMinutes: number;
  missedMinutes: number;
  styles: Record<string, CallStyle>;
  records: EcmRecord[];
  evidence: EcmEvidence[];
}
export interface DemoNotification {
  id: string;
  visitId: string;
  at: string;
  user: string;
  recipient: string;
  channel: 'SMS' | 'Email' | 'In-app';
  subject: string;
  body: string;
  state: 'Queued' | 'Delivered' | 'Failed';
  attempts: number;
  updatedAt: string;
  error: string;
}
export interface EcmEscalation {
  id: string;
  visitId: string;
  at: string;
  ownerId: string;
  severity: 'Priority' | 'Critical';
  state: 'Open' | 'In review' | 'Resolved';
  note: string;
  dueAt: string;
  resolution: string;
  history: { at: string; user: string; note: string }[];
}
export interface ClientInvoice {
  id: string;
  clientId: string;
  number: string;
  date: string;
  state: 'Draft' | 'Approved' | 'Exported';
  lines: {
    visitId: string;
    date: string;
    call: string;
    hours: number;
    rate: number;
    amount: number;
    basis: string;
  }[];
  audit: { at: string; user: string; note: string }[];
}
export interface EvidencePack {
  id: string;
  date: string;
  at: string;
  user: string;
  visitIds: string[];
  snapshot: string;
}
export interface DemoFeedEvent {
  id: string;
  visitId: string;
  personId: string;
  kind: 'Check in' | 'Check out';
  state: 'Waiting' | 'Applied';
  at: string;
}
export const emptyEcm = (): EcmData => ({
  notifications: [],
  escalations: [],
  invoices: [],
  packs: [],
  feed: [],
  lateMinutes: 5,
  riskMinutes: 15,
  missedMinutes: 30,
  styles: {
    'Morning call': {
      background: '#eff6ff',
      color: '#1e40af',
      label: 'Morning',
      duration: 45,
      priority: 'High',
      skills: ['medication'],
      active: true,
    },
    'Lunch call': {
      background: '#fffbeb',
      color: '#92400e',
      label: 'Lunch',
      duration: 30,
      priority: 'Standard',
      skills: [],
      active: true,
    },
    'Tea call': {
      background: '#e6f7f5',
      color: '#076d65',
      label: 'Tea',
      duration: 30,
      priority: 'Standard',
      skills: [],
      active: true,
    },
    'Bed call': {
      background: '#f5f3ff',
      color: '#6d28d9',
      label: 'Bed',
      duration: 45,
      priority: 'High',
      skills: ['handling'],
      active: true,
    },
  },
  records: [],
  evidence: [],
});
export type LiveStatus =
  | 'Scheduled'
  | 'Early'
  | 'In progress'
  | 'Running late'
  | 'Missed visit risk'
  | 'Missed visit'
  | 'Completed'
  | 'Timing unavailable';
export function onBoardDate(v: RotaVisit, date: string): boolean {
  return v.date === date || (v.date === addDays(date, -1) && v.end <= v.start);
}
export function liveVisit(v: RotaVisit, now: number, rules = emptyEcm()) {
  const start = londonInstant(v.date, v.start);
  const end = londonInstant(v.end > v.start ? v.date : addDays(v.date, 1), v.end);
  const starts = v.attendance.filter((a) => v.staffIds.includes(a.personId) && a.start);
  const ends = starts.filter((a) => a.end);
  const arrived =
    v.staffIds.length === v.carers &&
    v.staffIds.every((id) => starts.some((a) => a.personId === id));
  const delay = start ? Math.max(0, Math.floor((now - Date.parse(start)) / 60000)) : 0;
  const first = starts.length ? Math.min(...starts.map((a) => Date.parse(a.start))) : null;
  const last = ends.length ? Math.max(...ends.map((a) => Date.parse(a.end))) : null;
  let status: LiveStatus = 'Scheduled';
  if (completedVisit(v)) status = 'Completed';
  else if (!start || !end) status = 'Timing unavailable';
  else if (arrived)
    status =
      first! < Date.parse(start) - 5 * 60000 && now < Date.parse(start) ? 'Early' : 'In progress';
  else if (delay >= rules.missedMinutes) status = 'Missed visit';
  else if (delay >= rules.riskMinutes) status = 'Missed visit risk';
  else if (delay >= rules.lateMinutes) status = 'Running late';
  const red = status === 'Missed visit' || status === 'Timing unavailable';
  const amber = status === 'Running late' || status === 'Missed visit risk';
  return {
    status,
    delay,
    arrived: starts.length,
    duration:
      first === null
        ? null
        : Math.max(0, Math.floor(((status === 'Completed' ? last! : now) - first) / 60000)),
    overrun:
      arrived && status !== 'Completed' && end
        ? Math.max(0, Math.floor((now - Date.parse(end)) / 60000))
        : 0,
    tone: red
      ? 'red'
      : amber
        ? 'amber'
        : status === 'Completed'
          ? 'green'
          : status === 'Scheduled'
            ? 'slate'
            : 'teal',
    rank: red
      ? 0
      : status === 'Missed visit risk'
        ? 1
        : amber
          ? 2
          : status === 'In progress' || status === 'Early'
            ? 3
            : status === 'Scheduled'
              ? 4
              : 5,
  };
}
