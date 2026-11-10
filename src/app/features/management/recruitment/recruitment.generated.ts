// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type RecruitmentVacancy = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  title: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  published: boolean;
  goLiveDate: string;
  closingDate: string;
  status: string;
  timezone: string;
  fields: {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'email' | 'number' | 'date';
    required: boolean;
  }[];
  documents: {
    id: string;
    label: string;
    required: boolean;
  }[];
  applicant_count: number;
};

export type RecruitmentVacancyWrite = {
  title: string;
  location: string;
  type: 'Full time' | 'Part time' | 'Bank / flexible';
  salary?: string;
  description?: string;
  published?: boolean;
  goLiveDate?: string | null;
  closingDate?: string | null;
  fields?: {
    id?: string;
    label: string;
    type: 'text' | 'textarea' | 'email' | 'number' | 'date';
    required?: boolean;
  }[];
  documents?: {
    id?: string;
    label: string;
    required?: boolean;
  }[];
};

export type RecruitmentApplication = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  name: string;
  email: string;
  role: string;
  vacancy: string;
  vacancyId: string;
  location: string;
  stage: string;
  start: string;
  staff_id: string | null;
  application?: {
    submitted: string;
    phone: string;
    answers: {
      fieldId: string;
      label: string;
      value: string;
    }[];
  };
  notes?: {
    id: string;
    text: string;
    at: string;
    author: string;
  }[];
  documents?: {
    staff_etag?: string;
    id: string;
    name: string;
    type: string;
    size: number;
    state: string;
    version: number;
    etag: string;
    requirementId: string | null;
    upload_token?: string;
    expires_at?: string;
  }[];
  history?: {
    id: string;
    previous: string;
    next: string;
    reason: string;
    at: string;
  }[];
  interviews?: {
    id: string;
    version: number;
    etag: string;
    scheduled_at: string;
    panel: string;
    location: string;
    outcome: string;
    notes: string;
  }[];
  offers?: {
    id: string;
    version: number;
    etag: string;
    terms: string;
    start_date: string;
    decision: string;
    reason: string;
    decision_at: string | null;
  }[];
};

export type RecruitmentApplicationWrite = {
  upload_tokens?: {};
  vacancy_id: string;
  vacancy_version: number;
  name: string;
  email: string;
  phone?: string;
  location: string;
  answers?: {
    field_id: string;
    value: string;
  }[];
  file_ids?: string[];
  consent?: boolean;
};

export type RecruitmentApplicationPatch = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
};

export type RecruitmentInterview = {
  id: string;
  version: number;
  etag: string;
  scheduled_at: string;
  panel: string;
  location: string;
  outcome: string;
  notes: string;
};

export type RecruitmentInterviewWrite = {
  scheduled_at: string;
  panel: string;
  location?: string;
  outcome?: 'Scheduled' | 'Passed' | 'Failed' | 'Cancelled';
  notes?: string;
};

export type RecruitmentOffer = {
  id: string;
  version: number;
  etag: string;
  terms: string;
  start_date: string;
  decision: string;
  reason: string;
  decision_at: string | null;
};

export type RecruitmentOfferWrite = {
  terms: string;
  start_date: string;
};

export type RecruitmentOfferDecision = {
  decision: 'Accepted' | 'Declined' | 'Withdrawn';
  reason: string;
};

export type RecruitmentSummary = {
  company_id: string;
  as_of: string;
  timezone: string;
  open_vacancies: number;
  active_applicants: number;
  offers_made: number;
  stages: {};
  total_applicants: number;
};

export type RecruitmentUpload = {
  staff_etag?: string;
  id: string;
  name: string;
  type: string;
  size: number;
  state: string;
  version: number;
  etag: string;
  requirementId: string | null;
  upload_token?: string;
  expires_at?: string;
};

export type RecruitmentUploadSession = {
  company_id?: string;
  vacancy_id: string;
  vacancy_version: number;
  requirement_id?: string | null;
  application_id?: string;
  name: string;
  content_type:
    | 'application/pdf'
    | 'application/msword'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    | 'image/jpeg'
    | 'image/png';
  size: number;
  sha256: string;
};

export type RecruitmentCompliance = {
  application_id: string;
  version: number;
  etag: string;
  visa_type: string;
  visa_expiry: string | null;
  checks: {
    code: string;
    recorded: boolean;
    expiry: string | null;
  }[];
};

export type RecruitmentCompliancePatch = {
  visa_type?: string;
  visa_expiry?: string | null;
  check?: {
    code:
      | 'Right to work'
      | 'DBS check'
      | 'References'
      | 'Qualifications'
      | 'Professional registration'
      | 'Health declaration'
      | 'Driving licence'
      | 'Adult barred list'
      | 'Child barred list'
      | 'Code of conduct';
    recorded?: boolean;
    expiry?: string | null;
  };
};

export type RecruitmentPublicVacancy = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  title: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  published: boolean;
  goLiveDate: string;
  closingDate: string;
  status: string;
  timezone: string;
  fields: {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'email' | 'number' | 'date';
    required: boolean;
  }[];
  documents: {
    id: string;
    label: string;
    required: boolean;
  }[];
  company: {
    id: string;
    name: string;
    code: string;
  };
  consent_version: string;
};

export type RecruitmentReceipt = {
  status: 'received';
  reference: string;
};

export type RecruitmentHire = {
  status?: 'Onboarding';
  first_name: string;
  surname: string;
  middle_name?: string;
  email: string;
  phone?: string;
  birth_date?: string | null;
  reference: string;
  branch_name: string;
  job_title: string;
  start_date: string;
  employment_type:
    | 'Full time'
    | 'Part time'
    | 'Bank / flexible'
    | 'Full-time'
    | 'Part-time'
    | 'Bank'
    | 'Agency'
    | 'Contract'
    | 'Permanent'
    | 'Fixed term';
  is_driver?: boolean | null;
  contract_end?: string | null;
  facts?: {
    personal?: {};
    employment?: {};
    preferences?: {};
    availability?: {}[];
    checks?: {}[];
    training?: {}[];
    induction?: {}[];
    references?: {}[];
  };
  file_ids?: string[];
};

export type RecruitmentSetupDraft = {
  step: number;
  facts: {
    status?: 'Onboarding';
    first_name?: string;
    surname?: string;
    middle_name?: string;
    email?: string;
    phone?: string;
    birth_date?: string | null;
    reference?: string;
    branch_name?: string;
    job_title?: string;
    start_date?: string | null;
    employment_type?:
      | 'Full time'
      | 'Part time'
      | 'Bank / flexible'
      | 'Full-time'
      | 'Part-time'
      | 'Bank'
      | 'Agency'
      | 'Contract'
      | 'Permanent'
      | 'Fixed term';
    is_driver?: boolean | null;
    contract_end?: string | null;
    facts?: {
      personal?: {};
      employment?: {};
      preferences?: {};
      availability?: {}[];
      checks?: {}[];
      training?: {}[];
      induction?: {}[];
      references?: {}[];
    };
    file_ids?: string[];
  };
};

export type RecruitmentTransition = {
  stage: 'Interview' | 'Offer' | 'Rejected' | 'Withdrawn';
  reason: string;
};

export type RecruitmentNote = {
  text: string;
};

export type RecruitmentReason = {
  reason: string;
};

export type RecruitmentVacancyPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    title: string;
    location: string;
    type: string;
    salary: string;
    description: string;
    published: boolean;
    goLiveDate: string;
    closingDate: string;
    status: string;
    timezone: string;
    fields: {
      id: string;
      label: string;
      type: 'text' | 'textarea' | 'email' | 'number' | 'date';
      required: boolean;
    }[];
    documents: {
      id: string;
      label: string;
      required: boolean;
    }[];
    applicant_count: number;
  }[];
  meta: {
    company_id: string;
    page: number;
    page_size: number;
    as_of: string;
    request_id: string;
    filters: {};
  };
};

export type RecruitmentApplicationPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    name: string;
    email: string;
    role: string;
    vacancy: string;
    vacancyId: string;
    location: string;
    stage: string;
    start: string;
    staff_id: string | null;
    application?: {
      submitted: string;
      phone: string;
      answers: {
        fieldId: string;
        label: string;
        value: string;
      }[];
    };
    notes?: {
      id: string;
      text: string;
      at: string;
      author: string;
    }[];
    documents?: {
      staff_etag?: string;
      id: string;
      name: string;
      type: string;
      size: number;
      state: string;
      version: number;
      etag: string;
      requirementId: string | null;
      upload_token?: string;
      expires_at?: string;
    }[];
    history?: {
      id: string;
      previous: string;
      next: string;
      reason: string;
      at: string;
    }[];
    interviews?: {
      id: string;
      version: number;
      etag: string;
      scheduled_at: string;
      panel: string;
      location: string;
      outcome: string;
      notes: string;
    }[];
    offers?: {
      id: string;
      version: number;
      etag: string;
      terms: string;
      start_date: string;
      decision: string;
      reason: string;
      decision_at: string | null;
    }[];
  }[];
  meta: {
    company_id: string;
    page: number;
    page_size: number;
    as_of: string;
    request_id: string;
    filters: {};
  };
};

export type RecruitmentOnboardingItem = {
  id: string;
  kind: 'draft' | 'starter';
  source_id: string;
  name: string;
  email: string;
  reference: string;
  branch: string;
  start_date: string | null;
  step: number | null;
  saved_at: string | null;
  manager: string | null;
  completed: number | null;
  total: number | null;
  ready: boolean | null;
  next_task: string | null;
  next_section?: string;
  etag?: string | null;
};

export type RecruitmentOnboardingPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    kind: 'draft' | 'starter';
    source_id: string;
    name: string;
    email: string;
    reference: string;
    branch: string;
    start_date: string | null;
    step: number | null;
    saved_at: string | null;
    manager: string | null;
    completed: number | null;
    total: number | null;
    ready: boolean | null;
    next_task: string | null;
    next_section?: string;
    etag?: string | null;
  }[];
  meta: {
    company_id: string;
    page: number;
    page_size: number;
    as_of: string;
    request_id: string;
    filters: {};
    counts: {
      drafts: number | null;
      in_progress: number;
      ready: number | null;
    };
    branches: string[];
    unavailable: {
      readiness: string | null;
      drafts: string | null;
    };
  };
};
