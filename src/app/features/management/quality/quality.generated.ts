// Generated from backend OpenAPI.

export type QualityActionWrite = {
  assessmentId?: string | null;
  title: string;
  ownerId: string;
  due: string;
  priority: 'Standard' | 'High';
  status: 'Open' | 'In progress' | 'Completed';
  resolution?: string;
};

export type QualityAssessmentWrite = {
  templateId: string;
  subjectId?: string | null;
  assessorId?: string | null;
  date: string;
  reviewDate?: string | null;
  context?: string;
  answers: Record<string, string>;
  outcome?: string;
  recommendations?: string;
  evidence?: {
    id: string;
    caption?: string;
  }[];
  mode: 'draft' | 'schedule' | 'submit';
};

export type QualityAttachmentWrite = {
  id: string;
  caption?: string;
};

export type QualityDetailRead = {
  company_id: string;
  record: Record<string, string>;
};

export type QualityFileRead = {
  company_id: string;
  id: string;
  version: number;
  etag: string;
  assessmentId: string;
  name: string;
  contentType: string;
  size: number;
  state: string;
};

export type QualityFileWrite = {
  file: string;
};

export type QualityMutationRead = {
  company_id: string;
  id: string;
  version: number;
  etag: string;
};

export type QualityQuery = {
  page?: number;
  page_size?: number;
  revision?: string;
  view?:
    | 'Overview'
    | 'Assessment library'
    | 'Assessments'
    | 'Corrective actions'
    | 'Review schedule'
    | 'Reports';
};

export type QualityReopenWrite = {
  reason: string;
};

export type QualitySignWrite = {
  name: string;
  declaration: boolean;
};

export type QualityWorkspaceRead = {
  company_id: string;
  count: number;
  next: string | null;
  previous: string | null;
  results: Record<string, string>[];
  context: Record<string, string> | null;
  meta: Record<string, string>;
};
