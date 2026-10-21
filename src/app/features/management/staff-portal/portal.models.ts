import { JournalAttachment } from '../journal/journal.models';
export const CONCERN_STATUSES = [
  'Raised',
  'Acknowledged',
  'Assigned',
  'Under investigation',
  'Action taken',
  'Escalated',
  'Resolved',
  'Closed',
] as const;
export interface PortalConcern {
  id: string;
  reference: string;
  title: string;
  description: string;
  type: string;
  priority: 'Normal' | 'High';
  clientId: string;
  staffEmail: string;
  assignedTo: string;
  followers: string[];
  visitDate: string;
  raisedBy: string;
  raisedAt: string;
  status: (typeof CONCERN_STATUSES)[number];
  checklist: { id: string; title: string; done: boolean }[];
  notes: { id: string; author: string; text: string; at: string }[];
  evidence: JournalAttachment[];
  outcome: string;
}
export interface ProfessionalRecord {
  direction?: 'Sent' | 'Received' | 'Internal';
  id: string;
  clientId: string;
  contactId: string;
  type: string;
  subject: string;
  details: string;
  at: string;
  loggedBy: string;
  loggedByEmail?: string;
  followUp: string;
  status: 'Open' | 'In progress' | 'Resolved';
  attachments: JournalAttachment[];
}
export interface PortalEvent {
  direction?: string;
  recipient?: string;
  audience?: string[];
  id: string;
  clientId: string;
  entityId: string;
  actor: string;
  action: string;
  detail: string;
  at: string;
  category: string;
  status: string;
}
export interface PortalData {
  concerns: PortalConcern[];
  communications: ProfessionalRecord[];
  events: PortalEvent[];
}
export const emptyPortal = (): PortalData => ({ concerns: [], communications: [], events: [] });
