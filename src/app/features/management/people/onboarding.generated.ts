// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type StaffOnboarding = {
  company_id: string;
  version: number;
  etag: string;
  person: {};
  readiness: {
    ready: boolean;
    missing: string[];
    completed: number;
    total: number;
    next_task: string | null;
    next_section: string;
    tasks: {
      title: string;
      section: string;
      done: boolean;
    }[];
  };
  courses: {
    id: string;
    title: string;
    category: string;
    icon: string;
  }[];
  local_date: string;
  capabilities: {
    edit: boolean;
    approve: boolean;
    personal: boolean;
  };
};

export type OnboardingPersonalWrite = {
  firstName: string;
  surname: string;
  middleName?: string;
  birthDate: string | null;
  phone: string;
  driver: boolean | null;
  email: string;
  photo_file_id?: string | null;
  title?: string;
  address?: string;
  addressLine2?: string;
  town?: string;
  county?: string;
  postcode?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  emergencyAlternative?: string;
  kinName?: string;
  kinRelationship?: string;
  kinPhone?: string;
  kinAlternative?: string;
  languages?: string;
  vehicle?: string;
  additionalNotes?: string;
  gender?: string;
  nationality?: string;
  nextOfKin?: string;
  ethnicity?: string;
  religion?: string;
  maritalStatus?: string;
};

export type OnboardingEmploymentWrite = {
  recruitmentSource?: string;
  nextReview?: string | null;
  reference: string;
  role: string;
  location: string;
  start: string;
  type:
    | 'Permanent'
    | 'Full time'
    | 'Full-time'
    | 'Part time'
    | 'Part-time'
    | 'Bank'
    | 'Agency'
    | 'Fixed term'
    | 'Contract'
    | 'Bank / flexible';
  manager: string;
  department: string;
  hours: string | null;
  rate?: string | null;
  payrollNumber?: string;
  probationMonths: number | null;
  contractEnd: string | null;
  noticeWeeks: number | null;
  history: string;
  gaps: string;
  references: {
    id?: string;
    name: string;
    organisation: string;
    email: string;
    status: 'Requested' | 'Received' | 'Verified';
  }[];
};

export type OnboardingChecksWrite = {
  checks: {
    id: string;
    status: 'Not started' | 'Pending' | 'Recorded' | 'Verified' | 'Not required';
    completed: string | null;
    expiry: string | null;
    documentId: string | null;
    note: string;
  }[];
};

export type OnboardingLearningWrite = {
  training: {
    courseId: string;
    completed: string | null;
    expiry: string | null;
    certificateId: string | null;
    assessor: string;
    competency: 'Not assessed' | 'Competent' | 'Needs development';
    score: string | null;
    reassessmentDue: string | null;
  }[];
  induction: {
    id: string;
    evidence_id?: string | null;
    complete: boolean;
  }[];
};

export type OnboardingDocumentsWrite = {
  documents: {
    id: string;
    expiry: string | null;
    category: string;
  }[];
};

export type OnboardingUploadWrite = {
  name: string;
  content_type:
    | 'application/pdf'
    | 'image/jpeg'
    | 'image/png'
    | 'application/msword'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  size: number;
  sha256: string;
  category: string;
  replaces_id?: string | null;
};

export type OnboardingEntryWrite = {
  id?: string;
  kind: 'request' | 'action' | 'booking' | 'note';
  title?: string;
  state?: string;
  owner?: string;
  due?: string | null;
  evidence?: string;
  course_id?: string;
  provider?: string;
  booking_type?: 'Training' | 'Reassessment';
  reflective?: boolean;
};

export type OnboardingActivationWrite = {
  reason: string;
  effective_date: string;
};

export type OnboardingRequirementWrite = {
  code: string;
  title: string;
  kind: 'check' | 'induction' | 'training';
  mandatory: boolean;
  evidence_required: boolean;
  position: number;
};

export type OnboardingRequirement = {
  code: string;
  title: string;
  kind: 'check' | 'induction' | 'training';
  mandatory: boolean;
  evidence_required: boolean;
  position: number;
  id: string;
  version: number;
  etag: string;
};

export type OnboardingRequirementPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    code: string;
    title: string;
    kind: 'check' | 'induction' | 'training';
    mandatory: boolean;
    evidence_required: boolean;
    position: number;
    id: string;
    version: number;
    etag: string;
  }[];
  meta: {};
};

export type OnboardingCommand = Record<string, unknown>;

export type OnboardingChunkWrite = {
  content: string;
};
