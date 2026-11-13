// Generated from backend OpenAPI.

export type AcademyMyAssessmentsAttempt = {
  id: string;
  assignment_id: string;
  status: string;
  action: 'resume' | 'result' | 'unavailable';
  reason: string;
};

export type AcademyMyAssessmentsRead = {
  company_id: string;
  actor_id: string;
  person_id: string;
  can_start: boolean;
  can_edit: boolean;
  assignment_ids: string[];
  attempts: {
    id: string;
    assignment_id: string;
    status: string;
    action: 'resume' | 'result' | 'unavailable';
    reason: string;
  }[];
};
