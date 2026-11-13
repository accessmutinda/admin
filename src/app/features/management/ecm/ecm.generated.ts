// Generated from backend OpenAPI.

export type EcmAttendanceWrite = {
  personId: string;
  at: string;
  kind: 'Check in' | 'Check out';
  note: string;
};

export type EcmCaseWrite = {
  ownerId: string;
  state: 'Open' | 'In review' | 'Resolved';
  note: string;
};

export type EcmDeliveryWrite = {
  state: 'Queued';
};

export type EcmEvidenceWrite = {
  type: 'Care note' | 'Safeguarding' | 'Wound / skin' | 'Other concern';
  note: string;
  transcript?: string;
  photo?: string | null;
  audio?: string | null;
  consent?: boolean;
  taskResults?: {
    taskId: string;
    planVersionId: string;
    planVersion: string;
    section: string;
    instruction: string;
    outcome: 'Completed' | 'Not completed' | 'Concern';
    note: string;
  }[];
};

export type EcmExportQuery = {
  date?: string;
  client?: string;
  page?: number;
  page_size?: number;
  revision?: string;
  search?: string;
  staff?: string;
  call?: string;
  status?:
    | ''
    | 'Scheduled'
    | 'Early'
    | 'In progress'
    | 'Running late'
    | 'Missed visit risk'
    | 'Missed visit'
    | 'Completed'
    | 'Timing unavailable';
  risk?: string;
  double?: boolean;
  high?: boolean;
};

export type EcmFollowupWrite = {
  action: string;
  note: string;
  contact?: string;
  contactAt?: string | null;
  outcome?: string;
  eta?: string | null;
  accepted?: boolean;
  concern?: boolean;
  followUp?: string;
  ownerId?: string | null;
  queueMessage?: boolean;
  channel?: 'SMS' | 'Email' | 'In-app';
  recipient?: string;
};

export type EcmInboxRead = {
  company_id: string;
  count: number;
  next: string | null;
  previous: string | null;
  results: Record<string, string>[];
  meta: Record<string, string>;
};

export type EcmMediaRead = {
  company_id: string;
  id: string;
  version: number;
  etag: string;
  visitId: string;
  state: string;
  name: string;
  contentType: string;
};

export type EcmMediaWrite = {
  file: string;
  consent?: boolean;
};

export type EcmMutationRead = {
  company_id: string;
  id: string;
  version: number;
  etag: string;
};

export type EcmOverride = {
  reason: string;
  staffIds: string[];
  acknowledged: boolean;
};

export type EcmPackWrite = {
  date: string;
};

export type EcmQuery = {
  date?: string;
  client?: string;
  page?: number;
  page_size?: number;
  revision?: string;
};

export type EcmReason = {
  reason: string;
};

export type EcmReschedule = {
  reason: string;
  date: string;
  start: string;
  accepted: boolean;
};

export type EcmSettingsWrite = {
  lateMinutes: number;
  riskMinutes: number;
  missedMinutes: number;
  styles: Record<
    string,
    {
      background: string;
      color: string;
      label: string;
      duration?: number;
      priority?: 'Standard' | 'High';
      skills?: string[];
      active?: boolean;
    }
  >;
};

export type EcmStyleWrite = {
  background: string;
  color: string;
  label: string;
  duration?: number;
  priority?: 'Standard' | 'High';
  skills?: string[];
  active?: boolean;
};

export type EcmTaskWrite = {
  taskId: string;
  planVersionId: string;
  planVersion: string;
  section: string;
  instruction: string;
  outcome: 'Completed' | 'Not completed' | 'Concern';
  note: string;
};

export type EcmWorkspaceRead = {
  company_id: string;
  date: string;
  timezone: string;
  as_of: string;
  revision: string;
  count: number;
  next: string | null;
  previous: string | null;
  results: Record<string, string>[];
  context: Record<string, string> | null;
  data: Record<string, string> | null;
  meta: Record<string, string>;
};
