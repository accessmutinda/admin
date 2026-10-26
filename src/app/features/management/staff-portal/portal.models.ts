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
  visitId?: string;
  visitTime?: string;
  location?: string;
  history?: { status: string; at: string; actor: string }[];
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
  checklist: {
    id: string;
    title: string;
    done: boolean;
    assignedTo?: string;
    due?: string;
    completedAt?: string;
  }[];
  notes: {
    id: string;
    author: string;
    text: string;
    at: string;
    kind?: 'Note' | 'Update';
    attachments?: JournalAttachment[];
  }[];
  evidence: JournalAttachment[];
  outcome: string;
}
export interface ProfessionalRecord {
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  responseRequired?: boolean;
  responseStatus?: 'Awaiting response' | 'Responded';
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
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
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
