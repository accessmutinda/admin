export interface JournalAttachment {
  id: string;
  name: string;
  size: number;
  content: string;
}
export interface JournalEntry {
  id: string;
  author: string;
  authorEmail: string;
  to: string[];
  cc: string[];
  subject: string;
  clientId: string;
  category: string;
  priority: string;
  body: string;
  attachments: JournalAttachment[];
  state: 'Draft' | 'Sent';
  createdAt: string;
  readBy: string[];
  archivedBy: string[];
  starredBy: string[];
  followUpBy: string[];
}
export interface JournalTask {
  shared?: boolean;
  assignedBy?: string;
  notes?: string;
  actions?: string;
  followUp?: string;
  attachments?: JournalAttachment[];
  id: string;
  owner: string;
  title: string;
  clientId: string;
  due: string;
  priority: string;
  status: 'Open' | 'In progress' | 'Awaiting response' | 'Escalated' | 'Resolved';
}
export interface JournalEvent {
  id: string;
  actor: string;
  audience: string[];
  action: string;
  subject: string;
  at: string;
}
export interface JournalData {
  entries: JournalEntry[];
  tasks: JournalTask[];
  events: JournalEvent[];
}
