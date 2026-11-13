// Generated from backend OpenAPI.

export type AcademyMyCoursesCourse = {
  code: string;
  title: string;
  description: string;
  category: string;
  mandatory: boolean;
  cpdHours: number;
  passMark: number | null;
  validityMonths: number | null;
  outcomes?: string;
  active?: boolean;
  estimatedMinutes?: number;
  assessmentMinutes?: number;
  tags?: string[];
  targetRoles?: string[];
  targetBranches?: string[];
  prerequisiteCourseIds?: string[];
  owner?: string;
  issuer?: string;
  rights?: string;
  approver?: string;
  effectiveDate?: string | null;
  practicalRequired?: boolean;
  policy?: {
    maxAttempts: number;
    retakeWaitHours: number;
    timeLimitMinutes: number;
    showFeedback: boolean;
    feedbackMode?: 'Immediate' | 'After delay' | 'Manager release';
    feedbackDelayHours?: number;
    sequentialLessons?: boolean;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
  };
  thumbnailId?: string;
  publicationNote?: string;
  evidenceType?:
    | 'Internal knowledge completion'
    | 'Practical observation record'
    | 'Portable qualification evidence';
  renewalPolicyRef?: string;
  cpdJustification?: string;
  modules?: {
    id: string;
    title: string;
    watchThreshold?: number;
    requireResourceAck?: boolean;
    prerequisiteModuleIds?: string[];
  }[];
  lessons: {
    id: string;
    moduleId?: string;
    moduleTitle?: string;
    title: string;
    minutes: number;
    type?: 'Video' | 'Reading' | 'Policy acknowledgement' | 'Interactive check';
    mandatory?: boolean;
    content?: string;
    transcript?: string;
    videoId?: string;
    thumbnailId?: string;
    captionId?: string;
    handoutIds?: string[];
    optionalHandoutIds?: string[];
    prerequisiteIds?: string[];
    watchThreshold?: number;
    requireResourceAck?: boolean;
  }[];
  questionGroups?: {
    id: string;
    title: string;
    kind?: 'Quiz' | 'Survey';
    countsTowardGrade?: boolean;
    placement:
      | 'Course completion'
      | 'Before module'
      | 'After module'
      | 'Within module'
      | 'After lesson'
      | 'Scheduled';
    moduleId?: string;
    lessonId?: string;
    availableAfterDays: number;
    dueAfterDays: number | null;
    required: boolean;
  }[];
  id: string;
  company_id: string;
  version: number;
  updatedAt: string;
  etag: string;
  status: 'Draft' | 'Published' | 'Archived';
  sample: boolean;
  publishedAt?: string;
  publishedBy?: string;
};

export type AcademyMyCoursesEmpty = Record<string, unknown>;

export type AcademyMyCoursesEnrolled = {
  assignment_id: string;
};

export type AcademyMyCoursesRead = {
  allow_self_enrolment: boolean;
  company_id: string;
  actor_id: string;
  person_id: string;
  results: {
    course: {
      code: string;
      title: string;
      description: string;
      category: string;
      mandatory: boolean;
      cpdHours: number;
      passMark: number | null;
      validityMonths: number | null;
      outcomes?: string;
      active?: boolean;
      estimatedMinutes?: number;
      assessmentMinutes?: number;
      tags?: string[];
      targetRoles?: string[];
      targetBranches?: string[];
      prerequisiteCourseIds?: string[];
      owner?: string;
      issuer?: string;
      rights?: string;
      approver?: string;
      effectiveDate?: string | null;
      practicalRequired?: boolean;
      policy?: {
        maxAttempts: number;
        retakeWaitHours: number;
        timeLimitMinutes: number;
        showFeedback: boolean;
        feedbackMode?: 'Immediate' | 'After delay' | 'Manager release';
        feedbackDelayHours?: number;
        sequentialLessons?: boolean;
        shuffleQuestions?: boolean;
        shuffleOptions?: boolean;
      };
      thumbnailId?: string;
      publicationNote?: string;
      evidenceType?:
        | 'Internal knowledge completion'
        | 'Practical observation record'
        | 'Portable qualification evidence';
      renewalPolicyRef?: string;
      cpdJustification?: string;
      modules?: {
        id: string;
        title: string;
        watchThreshold?: number;
        requireResourceAck?: boolean;
        prerequisiteModuleIds?: string[];
      }[];
      lessons: {
        id: string;
        moduleId?: string;
        moduleTitle?: string;
        title: string;
        minutes: number;
        type?: 'Video' | 'Reading' | 'Policy acknowledgement' | 'Interactive check';
        mandatory?: boolean;
        content?: string;
        transcript?: string;
        videoId?: string;
        thumbnailId?: string;
        captionId?: string;
        handoutIds?: string[];
        optionalHandoutIds?: string[];
        prerequisiteIds?: string[];
        watchThreshold?: number;
        requireResourceAck?: boolean;
      }[];
      questionGroups?: {
        id: string;
        title: string;
        kind?: 'Quiz' | 'Survey';
        countsTowardGrade?: boolean;
        placement:
          | 'Course completion'
          | 'Before module'
          | 'After module'
          | 'Within module'
          | 'After lesson'
          | 'Scheduled';
        moduleId?: string;
        lessonId?: string;
        availableAfterDays: number;
        dueAfterDays: number | null;
        required: boolean;
      }[];
      id: string;
      company_id: string;
      version: number;
      updatedAt: string;
      etag: string;
      status: 'Draft' | 'Published' | 'Archived';
      sample: boolean;
      publishedAt?: string;
      publishedBy?: string;
    };
    assignment_id: string | null;
    can_enrol: boolean;
    assets: {
      rights?: string;
      language?: string;
      replacesId?: string;
      durationSeconds?: number;
      width?: number;
      height?: number;
      id: string;
      company_id: string;
      name: string;
      mime: string;
      kind: 'Video' | 'Image' | 'Document' | 'Captions';
      size: number;
      checksum: string;
      status: 'SCAN_PENDING' | 'CAPTIONS_REVIEW' | 'READY' | 'REJECTED';
      version: number;
      etag: string;
      at: string;
      by: string;
      scanner?: string;
      scannedAt?: string;
      reviewedAt?: string;
      reviewedBy?: string;
      request_id?: string;
    }[];
  }[];
};

export type AcademyMyCoursesRecord = {
  course: {
    code: string;
    title: string;
    description: string;
    category: string;
    mandatory: boolean;
    cpdHours: number;
    passMark: number | null;
    validityMonths: number | null;
    outcomes?: string;
    active?: boolean;
    estimatedMinutes?: number;
    assessmentMinutes?: number;
    tags?: string[];
    targetRoles?: string[];
    targetBranches?: string[];
    prerequisiteCourseIds?: string[];
    owner?: string;
    issuer?: string;
    rights?: string;
    approver?: string;
    effectiveDate?: string | null;
    practicalRequired?: boolean;
    policy?: {
      maxAttempts: number;
      retakeWaitHours: number;
      timeLimitMinutes: number;
      showFeedback: boolean;
      feedbackMode?: 'Immediate' | 'After delay' | 'Manager release';
      feedbackDelayHours?: number;
      sequentialLessons?: boolean;
      shuffleQuestions?: boolean;
      shuffleOptions?: boolean;
    };
    thumbnailId?: string;
    publicationNote?: string;
    evidenceType?:
      | 'Internal knowledge completion'
      | 'Practical observation record'
      | 'Portable qualification evidence';
    renewalPolicyRef?: string;
    cpdJustification?: string;
    modules?: {
      id: string;
      title: string;
      watchThreshold?: number;
      requireResourceAck?: boolean;
      prerequisiteModuleIds?: string[];
    }[];
    lessons: {
      id: string;
      moduleId?: string;
      moduleTitle?: string;
      title: string;
      minutes: number;
      type?: 'Video' | 'Reading' | 'Policy acknowledgement' | 'Interactive check';
      mandatory?: boolean;
      content?: string;
      transcript?: string;
      videoId?: string;
      thumbnailId?: string;
      captionId?: string;
      handoutIds?: string[];
      optionalHandoutIds?: string[];
      prerequisiteIds?: string[];
      watchThreshold?: number;
      requireResourceAck?: boolean;
    }[];
    questionGroups?: {
      id: string;
      title: string;
      kind?: 'Quiz' | 'Survey';
      countsTowardGrade?: boolean;
      placement:
        | 'Course completion'
        | 'Before module'
        | 'After module'
        | 'Within module'
        | 'After lesson'
        | 'Scheduled';
      moduleId?: string;
      lessonId?: string;
      availableAfterDays: number;
      dueAfterDays: number | null;
      required: boolean;
    }[];
    id: string;
    company_id: string;
    version: number;
    updatedAt: string;
    etag: string;
    status: 'Draft' | 'Published' | 'Archived';
    sample: boolean;
    publishedAt?: string;
    publishedBy?: string;
  };
  assignment_id: string | null;
  can_enrol: boolean;
  assets: {
    rights?: string;
    language?: string;
    replacesId?: string;
    durationSeconds?: number;
    width?: number;
    height?: number;
    id: string;
    company_id: string;
    name: string;
    mime: string;
    kind: 'Video' | 'Image' | 'Document' | 'Captions';
    size: number;
    checksum: string;
    status: 'SCAN_PENDING' | 'CAPTIONS_REVIEW' | 'READY' | 'REJECTED';
    version: number;
    etag: string;
    at: string;
    by: string;
    scanner?: string;
    scannedAt?: string;
    reviewedAt?: string;
    reviewedBy?: string;
    request_id?: string;
  }[];
};
