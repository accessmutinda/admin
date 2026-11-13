// Generated from backend OpenAPI.

export type AcademyTrainingRecordRead = {
  company_id: string;
  actor_id: string;
  person_id: string;
  can_request_records: boolean;
  rows: {
    id: string;
    course_id: string;
    course_version: number;
    course_title: string;
    cycle: 'Initial' | 'Refresher';
    archived: boolean;
    due: string;
    completed_at: string | null;
    attempt_id: string | null;
    result_label: string;
    result_action: 'none' | 'result' | 'resume' | 'unavailable';
    result_reason: string;
    evidence_status: string;
    certificate_id: string | null;
    certificate_state: string | null;
  }[];
  certificate_ids: string[];
  requests: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    tenantId: string;
    personId: string;
    createdAt: string;
    status: 'Requested' | 'Acknowledged' | 'Approved' | 'Declined' | 'Provided';
    acknowledgedAt: string;
    acknowledgedBy: string;
    decision: string;
    deliveryReference: string;
    completedAt: string;
  }[];
};

export type AcademyTrainingRecordRow = {
  id: string;
  course_id: string;
  course_version: number;
  course_title: string;
  cycle: 'Initial' | 'Refresher';
  archived: boolean;
  due: string;
  completed_at: string | null;
  attempt_id: string | null;
  result_label: string;
  result_action: 'none' | 'result' | 'resume' | 'unavailable';
  result_reason: string;
  evidence_status: string;
  certificate_id: string | null;
  certificate_state: string | null;
};
