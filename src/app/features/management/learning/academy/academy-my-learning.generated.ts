// Generated from backend OpenAPI.

export type AcademyMyLearningMeta = {
  local_date: string;
  timezone: string;
  as_of: string;
};

export type AcademyMyLearningRead = {
  company_id: string;
  actor_id: string;
  company: {
    id: string;
    name: string;
    code: string;
  };
  staff: {
    id: string;
    employment_id: string;
    name: string;
    email: string;
  };
  meta: {
    local_date: string;
    timezone: string;
    as_of: string;
  };
  stats: {
    assigned: number;
    completed: number;
    due_soon: number;
    overdue: number;
    average_score: number | null;
  };
  statuses: Record<string, string>;
  deadline_ids: string[];
  recent_attempt_ids: string[];
  latest_certificate_id: string | null;
};

export type AcademyMyLearningStats = {
  assigned: number;
  completed: number;
  due_soon: number;
  overdue: number;
  average_score: number | null;
};
