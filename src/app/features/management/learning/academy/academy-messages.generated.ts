// Generated from backend OpenAPI.

export type AcademyTrainingMessageMeta = {
  company_id: string;
  actor_id: string;
  person_id: string;
  can_acknowledge: boolean;
  as_of: string;
  request_id: string;
};

export type AcademyTrainingMessagePage = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    assignmentId: string;
    personId: string;
    channel: 'In-platform';
    title: string;
    text: string;
    status: 'Queued' | 'Delivered';
    attempts: number;
    nextAttemptAt: string;
    at: string;
    updatedAt: string;
    providerId: string;
    error: string;
    history: {
      at: string;
      status: 'Queued' | 'Delivered';
      detail: string;
    }[];
    course_id: string | null;
    course_reason: string;
  }[];
  meta: {
    company_id: string;
    actor_id: string;
    person_id: string;
    can_acknowledge: boolean;
    as_of: string;
    request_id: string;
  };
};

export type AcademyTrainingMessageRead = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  assignmentId: string;
  personId: string;
  channel: 'In-platform';
  title: string;
  text: string;
  status: 'Queued' | 'Delivered';
  attempts: number;
  nextAttemptAt: string;
  at: string;
  updatedAt: string;
  providerId: string;
  error: string;
  history: {
    at: string;
    status: 'Queued' | 'Delivered';
    detail: string;
  }[];
  course_id: string | null;
  course_reason: string;
};
