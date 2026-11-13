// Generated from backend OpenAPI.

export type AcademyRefresherAssignment = {
  id: string;
  course_id: string;
  course_title: string;
  course_version: number;
  cycle: 'Initial' | 'Refresher';
  due: string;
  status: 'Overdue' | 'Due soon' | 'In progress' | 'Assigned';
  can_continue: boolean;
  reason: string;
};

export type AcademyRefresherReview = {
  certificate_id: string;
  course_id: string;
  course_title: string;
  course_version: number;
  due: string | null;
  state: 'Current' | 'Expired' | 'Revoked';
  reason: string;
};

export type AcademyRefreshersRead = {
  company_id: string;
  actor_id: string;
  person_id: string;
  meta: {
    local_date: string;
    timezone: string;
    as_of: string;
  };
  assignment_ids: string[];
  certificate_ids: string[];
  assignments: {
    id: string;
    course_id: string;
    course_title: string;
    course_version: number;
    cycle: 'Initial' | 'Refresher';
    due: string;
    status: 'Overdue' | 'Due soon' | 'In progress' | 'Assigned';
    can_continue: boolean;
    reason: string;
  }[];
  reviews: {
    certificate_id: string;
    course_id: string;
    course_title: string;
    course_version: number;
    due: string | null;
    state: 'Current' | 'Expired' | 'Revoked';
    reason: string;
  }[];
};
