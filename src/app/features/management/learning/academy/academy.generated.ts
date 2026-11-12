// Generated from the backend academy OpenAPI contract.
export type AcademyAssignmentPlanWrite = {
  method: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
  roles?: string[];
  team?: string;
  personIds?: string[];
  priority: 'Normal' | 'High' | 'Urgent';
  due: string;
  refresher: boolean;
  channels: ('Email' | 'App' | 'In-platform')[];
  recurrenceMonths: number;
  message?: string;
};

export type AcademyBankWrite = {
  questions: {
    id: string;
    courseId: string;
    lessonId: string;
    groupId?: string;
    order?: number;
    critical?: boolean;
    type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
    text: string;
    scenario?: string;
    category?: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    weight: number;
    required: boolean;
    shuffle: boolean;
    imageId?: string;
    options: {
      id: string;
      text: string;
    }[];
    correctIds?: string[];
    explanation?: string;
    correctFeedback?: string;
    incorrectFeedback?: string;
    tags?: string[];
    status: 'Draft' | 'Published' | 'Archived';
  }[];
  groups: {
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
};

export type AcademyCoursePageRead = {
  count: number;
  next: number | null;
  previous: number | null;
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
      assignmentPlan?: {
        method: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
        roles?: string[];
        team?: string;
        personIds?: string[];
        priority: 'Normal' | 'High' | 'Urgent';
        due: string;
        refresher: boolean;
        channels: ('Email' | 'App' | 'In-platform')[];
        recurrenceMonths: number;
        message?: string;
      };
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
      pendingLessons?: {
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
      assessmentQuestions?: {
        id: string;
        courseId: string;
        lessonId: string;
        groupId?: string;
        order?: number;
        critical?: boolean;
        type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
        text: string;
        scenario?: string;
        category?: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        weight: number;
        required: boolean;
        shuffle: boolean;
        imageId?: string;
        options: {
          id: string;
          text: string;
        }[];
        correctIds?: string[];
        explanation?: string;
        correctFeedback?: string;
        incorrectFeedback?: string;
        tags?: string[];
        status: 'Draft' | 'Published' | 'Archived';
        version: number;
        updatedAt: string;
      }[];
    };
    published: {
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
      assignmentPlan?: {
        method: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
        roles?: string[];
        team?: string;
        personIds?: string[];
        priority: 'Normal' | 'High' | 'Urgent';
        due: string;
        refresher: boolean;
        channels: ('Email' | 'App' | 'In-platform')[];
        recurrenceMonths: number;
        message?: string;
      };
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
      pendingLessons?: {
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
      assessmentQuestions?: {
        id: string;
        courseId: string;
        lessonId: string;
        groupId?: string;
        order?: number;
        critical?: boolean;
        type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
        text: string;
        scenario?: string;
        category?: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        weight: number;
        required: boolean;
        shuffle: boolean;
        imageId?: string;
        options: {
          id: string;
          text: string;
        }[];
        correctIds?: string[];
        explanation?: string;
        correctFeedback?: string;
        incorrectFeedback?: string;
        tags?: string[];
        status: 'Draft' | 'Published' | 'Archived';
        version: number;
        updatedAt: string;
      }[];
    } | null;
    questions: {
      id: string;
      courseId: string;
      lessonId: string;
      groupId?: string;
      order?: number;
      critical?: boolean;
      type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
      text: string;
      scenario?: string;
      category?: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      weight: number;
      required: boolean;
      shuffle: boolean;
      imageId?: string;
      options: {
        id: string;
        text: string;
      }[];
      correctIds?: string[];
      explanation?: string;
      correctFeedback?: string;
      incorrectFeedback?: string;
      tags?: string[];
      status: 'Draft' | 'Published' | 'Archived';
      version: number;
      updatedAt: string;
    }[];
    versions: {
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
      assignmentPlan?: {
        method: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
        roles?: string[];
        team?: string;
        personIds?: string[];
        priority: 'Normal' | 'High' | 'Urgent';
        due: string;
        refresher: boolean;
        channels: ('Email' | 'App' | 'In-platform')[];
        recurrenceMonths: number;
        message?: string;
      };
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
      pendingLessons?: {
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
      assessmentQuestions?: {
        id: string;
        courseId: string;
        lessonId: string;
        groupId?: string;
        order?: number;
        critical?: boolean;
        type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
        text: string;
        scenario?: string;
        category?: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        weight: number;
        required: boolean;
        shuffle: boolean;
        imageId?: string;
        options: {
          id: string;
          text: string;
        }[];
        correctIds?: string[];
        explanation?: string;
        correctFeedback?: string;
        incorrectFeedback?: string;
        tags?: string[];
        status: 'Draft' | 'Published' | 'Archived';
        version: number;
        updatedAt: string;
      }[];
    }[];
    request_id?: string;
  }[];
  meta: Record<string, unknown>;
  request_id?: string;
};

export type AcademyCourseRead = {
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
  assignmentPlan?: {
    method: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
    roles?: string[];
    team?: string;
    personIds?: string[];
    priority: 'Normal' | 'High' | 'Urgent';
    due: string;
    refresher: boolean;
    channels: ('Email' | 'App' | 'In-platform')[];
    recurrenceMonths: number;
    message?: string;
  };
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
  pendingLessons?: {
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
  assessmentQuestions?: {
    id: string;
    courseId: string;
    lessonId: string;
    groupId?: string;
    order?: number;
    critical?: boolean;
    type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
    text: string;
    scenario?: string;
    category?: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    weight: number;
    required: boolean;
    shuffle: boolean;
    imageId?: string;
    options: {
      id: string;
      text: string;
    }[];
    correctIds?: string[];
    explanation?: string;
    correctFeedback?: string;
    incorrectFeedback?: string;
    tags?: string[];
    status: 'Draft' | 'Published' | 'Archived';
    version: number;
    updatedAt: string;
  }[];
};

export type AcademyCourseRecordRead = {
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
    assignmentPlan?: {
      method: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
      roles?: string[];
      team?: string;
      personIds?: string[];
      priority: 'Normal' | 'High' | 'Urgent';
      due: string;
      refresher: boolean;
      channels: ('Email' | 'App' | 'In-platform')[];
      recurrenceMonths: number;
      message?: string;
    };
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
    pendingLessons?: {
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
    assessmentQuestions?: {
      id: string;
      courseId: string;
      lessonId: string;
      groupId?: string;
      order?: number;
      critical?: boolean;
      type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
      text: string;
      scenario?: string;
      category?: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      weight: number;
      required: boolean;
      shuffle: boolean;
      imageId?: string;
      options: {
        id: string;
        text: string;
      }[];
      correctIds?: string[];
      explanation?: string;
      correctFeedback?: string;
      incorrectFeedback?: string;
      tags?: string[];
      status: 'Draft' | 'Published' | 'Archived';
      version: number;
      updatedAt: string;
    }[];
  };
  published: {
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
    assignmentPlan?: {
      method: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
      roles?: string[];
      team?: string;
      personIds?: string[];
      priority: 'Normal' | 'High' | 'Urgent';
      due: string;
      refresher: boolean;
      channels: ('Email' | 'App' | 'In-platform')[];
      recurrenceMonths: number;
      message?: string;
    };
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
    pendingLessons?: {
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
    assessmentQuestions?: {
      id: string;
      courseId: string;
      lessonId: string;
      groupId?: string;
      order?: number;
      critical?: boolean;
      type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
      text: string;
      scenario?: string;
      category?: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      weight: number;
      required: boolean;
      shuffle: boolean;
      imageId?: string;
      options: {
        id: string;
        text: string;
      }[];
      correctIds?: string[];
      explanation?: string;
      correctFeedback?: string;
      incorrectFeedback?: string;
      tags?: string[];
      status: 'Draft' | 'Published' | 'Archived';
      version: number;
      updatedAt: string;
    }[];
  } | null;
  questions: {
    id: string;
    courseId: string;
    lessonId: string;
    groupId?: string;
    order?: number;
    critical?: boolean;
    type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
    text: string;
    scenario?: string;
    category?: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    weight: number;
    required: boolean;
    shuffle: boolean;
    imageId?: string;
    options: {
      id: string;
      text: string;
    }[];
    correctIds?: string[];
    explanation?: string;
    correctFeedback?: string;
    incorrectFeedback?: string;
    tags?: string[];
    status: 'Draft' | 'Published' | 'Archived';
    version: number;
    updatedAt: string;
  }[];
  versions: {
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
    assignmentPlan?: {
      method: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
      roles?: string[];
      team?: string;
      personIds?: string[];
      priority: 'Normal' | 'High' | 'Urgent';
      due: string;
      refresher: boolean;
      channels: ('Email' | 'App' | 'In-platform')[];
      recurrenceMonths: number;
      message?: string;
    };
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
    pendingLessons?: {
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
    assessmentQuestions?: {
      id: string;
      courseId: string;
      lessonId: string;
      groupId?: string;
      order?: number;
      critical?: boolean;
      type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
      text: string;
      scenario?: string;
      category?: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      weight: number;
      required: boolean;
      shuffle: boolean;
      imageId?: string;
      options: {
        id: string;
        text: string;
      }[];
      correctIds?: string[];
      explanation?: string;
      correctFeedback?: string;
      incorrectFeedback?: string;
      tags?: string[];
      status: 'Draft' | 'Published' | 'Archived';
      version: number;
      updatedAt: string;
    }[];
  }[];
  request_id?: string;
};

export type AcademyCourseWrite = {
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
  assignmentPlan?: {
    method: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
    roles?: string[];
    team?: string;
    personIds?: string[];
    priority: 'Normal' | 'High' | 'Urgent';
    due: string;
    refresher: boolean;
    channels: ('Email' | 'App' | 'In-platform')[];
    recurrenceMonths: number;
    message?: string;
  };
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
  pendingLessons?: {
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
};

export type AcademyGroupWrite = {
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
};

export type AcademyLessonWrite = {
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
};

export type AcademyMediaMetadataWrite = {
  rights?: string;
  language?: string;
  replacesId?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
};

export type AcademyMediaPageRead = {
  count: number;
  next: number | null;
  previous: number | null;
  meta: Record<string, unknown>;
  company_id: string;
  results: {
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
  request_id?: string;
};

export type AcademyMediaRead = {
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
};

export type AcademyMediaUpload = {
  file: string;
};

export type AcademyModuleWrite = {
  id: string;
  title: string;
  watchThreshold?: number;
  requireResourceAck?: boolean;
  prerequisiteModuleIds?: string[];
};

export type AcademyOptionWrite = {
  id: string;
  text: string;
};

export type AcademyPolicyWrite = {
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

export type AcademyQuestionRead = {
  id: string;
  courseId: string;
  lessonId: string;
  groupId?: string;
  order?: number;
  critical?: boolean;
  type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
  text: string;
  scenario?: string;
  category?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  weight: number;
  required: boolean;
  shuffle: boolean;
  imageId?: string;
  options: {
    id: string;
    text: string;
  }[];
  correctIds?: string[];
  explanation?: string;
  correctFeedback?: string;
  incorrectFeedback?: string;
  tags?: string[];
  status: 'Draft' | 'Published' | 'Archived';
  version: number;
  updatedAt: string;
};

export type AcademyQuestionWrite = {
  id: string;
  courseId: string;
  lessonId: string;
  groupId?: string;
  order?: number;
  critical?: boolean;
  type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
  text: string;
  scenario?: string;
  category?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  weight: number;
  required: boolean;
  shuffle: boolean;
  imageId?: string;
  options: {
    id: string;
    text: string;
  }[];
  correctIds?: string[];
  explanation?: string;
  correctFeedback?: string;
  incorrectFeedback?: string;
  tags?: string[];
  status: 'Draft' | 'Published' | 'Archived';
};

export type AcademyAssignmentCommand = {
  assignments: {
    id: string;
    etag: string;
  }[];
  due?: string;
  message?: string;
  channels?: ('Email' | 'App' | 'In-platform')[];
};

export type AcademyAssignmentCourse = {
  cpdHours: number;
  sample: boolean;
  id: string;
  title: string;
  code: string;
  version: number;
  status: string;
  active: boolean;
  mandatory: boolean;
};

export type AcademyAssignmentCoursePage = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    cpdHours: number;
    sample: boolean;
    id: string;
    title: string;
    code: string;
    version: number;
    status: string;
    active: boolean;
    mandatory: boolean;
  }[];
  meta: {
    company_id: string;
    as_of: string;
    request_id: string;
    filters: Record<string, unknown>;
  };
};

export type AcademyAssignmentHistory = {
  id: string;
  action: string;
  at: string;
  actor: string;
  sourceVersion: number;
  due: string | null;
  message: string;
  channels: string[];
};

export type AcademyAssignmentHistoryPage = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    action: string;
    at: string;
    actor: string;
    sourceVersion: number;
    due: string | null;
    message: string;
    channels: string[];
  }[];
  meta: {
    company_id: string;
    as_of: string;
    request_id: string;
    filters: Record<string, unknown>;
  };
};

export type AcademyAssignmentMeta = {
  company_id: string;
  as_of: string;
  request_id: string;
  filters: Record<string, unknown>;
};

export type AcademyAssignmentPage = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    personId: string;
    courseId: string;
    courseVersion: number;
    due: string;
    assignedAt: string;
    assignedBy: string;
    recurrenceMonths: number;
    priority: string;
    source: string;
    type: string;
    notes: string;
    archived: boolean;
    previousId: string | null;
    supervisorId: string;
    notificationChannels: string[];
    courseSnapshot: Record<string, unknown>;
    completedLessonIds: string[];
    completedAt: string;
  }[];
  meta: {
    company_id: string;
    as_of: string;
    request_id: string;
    filters: Record<string, unknown>;
  };
};

export type AcademyAssignmentQuery = {
  page?: number;
  page_size?: number;
  person_id?: string;
  course_id?: string;
  archived?: boolean;
  q?: string;
};

export type AcademyAssignmentRead = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  personId: string;
  courseId: string;
  courseVersion: number;
  due: string;
  assignedAt: string;
  assignedBy: string;
  recurrenceMonths: number;
  priority: string;
  source: string;
  type: string;
  notes: string;
  archived: boolean;
  previousId: string | null;
  supervisorId: string;
  notificationChannels: string[];
  courseSnapshot: Record<string, unknown>;
  completedLessonIds: string[];
  completedAt: string;
};

export type AcademyAssignmentReceipt = {
  id: string;
  action: string;
  assignments: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    personId: string;
    courseId: string;
    courseVersion: number;
    due: string;
    assignedAt: string;
    assignedBy: string;
    recurrenceMonths: number;
    priority: string;
    source: string;
    type: string;
    notes: string;
    archived: boolean;
    previousId: string | null;
    supervisorId: string;
    notificationChannels: string[];
    courseSnapshot: Record<string, unknown>;
    completedLessonIds: string[];
    completedAt: string;
  }[];
};

export type AcademyAssignmentSelection = {
  id: string;
  etag: string;
};

export type AcademyAssignmentStaff = {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string;
  department: string;
  status: string;
};

export type AcademyAssignmentStaffPage = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    name: string;
    email: string;
    role: string;
    location: string;
    department: string;
    status: string;
  }[];
  meta: {
    company_id: string;
    as_of: string;
    request_id: string;
    filters: Record<string, unknown>;
  };
};

export type AcademyAssignmentWrite = {
  roles?: string[];
  team?: string;
  personIds: string[];
  courses: {
    id: string;
    version: number;
  }[];
  due: string;
  recurrenceMonths?: number;
  priority?: 'Normal' | 'High' | 'Urgent';
  method?: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
  message?: string;
  channels?: ('Email' | 'App' | 'In-platform')[];
  assignments?: {
    id: string;
    etag: string;
  }[];
  supervisorId?: string;
};

export type AcademyCourseSelection = {
  id: string;
  version: number;
};

export type AcademyPublishAssignment = {
  courseId: string;
  etag: string;
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
    assignmentPlan?: {
      method: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
      roles?: string[];
      team?: string;
      personIds?: string[];
      priority: 'Normal' | 'High' | 'Urgent';
      due: string;
      refresher: boolean;
      channels: ('Email' | 'App' | 'In-platform')[];
      recurrenceMonths: number;
      message?: string;
    };
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
    pendingLessons?: {
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
  };
  assignment: {
    roles?: string[];
    team?: string;
    personIds: string[];
    courses: {
      id: string;
      version: number;
    }[];
    due: string;
    recurrenceMonths?: number;
    priority?: 'Normal' | 'High' | 'Urgent';
    method?: 'By Role' | 'By Team' | 'Individual Worker' | 'From HR Staff Profile';
    message?: string;
    channels?: ('Email' | 'App' | 'In-platform')[];
    assignments?: {
      id: string;
      etag: string;
    }[];
    supervisorId?: string;
  };
  refresher?: boolean;
};

export type AcademyAttemptStart = {
  assignmentId: string;
  groupId?: string;
};

export type AcademyAvailabilityRead = {
  remaining: number;
  readyAt: string;
  runningId: string;
  availableAt: string;
  dueAt: string;
  overdue: boolean;
  reason: string;
};

export type AcademyEmptyResultCommand = Record<string, unknown>;

export type AcademyLearningMetaRead = {
  company_id: string;
  request_id: string;
  as_of: string;
  filters: Record<string, unknown>;
  person: {
    id: string;
    name: string;
    email: string;
    role: string;
    location: string;
    department: string;
    status: string;
  };
};

export type AcademyLearningPageRead = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
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
    assignment: {
      id: string;
      company_id: string;
      version: number;
      etag: string;
      personId: string;
      courseId: string;
      courseVersion: number;
      due: string;
      assignedAt: string;
      assignedBy: string;
      recurrenceMonths: number;
      priority: string;
      source: string;
      type: string;
      notes: Record<string, unknown>;
      archived: boolean;
      previousId: string | null;
      supervisorId: string;
      notificationChannels: string[];
      courseSnapshot: Record<string, unknown>;
      completedLessonIds: string[];
      completedAt: string;
      questionSnapshot: {
        id: string;
        courseId: string;
        lessonId: string;
        groupId?: string;
        order?: number;
        critical?: boolean;
        type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
        text: string;
        scenario?: string;
        category?: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        weight: number;
        required: boolean;
        shuffle: boolean;
        imageId?: string;
        options: {
          id: string;
          text: string;
        }[];
        correctIds?: string[];
        explanation?: string;
        correctFeedback?: string;
        incorrectFeedback?: string;
        tags?: string[];
        status: 'Draft' | 'Published' | 'Archived';
        version: number;
        updatedAt: string;
      }[];
      policySnapshot: {
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
      positions: Record<string, unknown>;
      openedResourceIds: string[];
      resourceAcknowledgements: string[];
      availability: Record<string, unknown>;
    };
    attempts: {
      id: string;
      company_id: string;
      version: number;
      etag: string;
      assignmentId: string;
      personId: string;
      courseId: string;
      courseTitle: string;
      courseVersion: number;
      groupId: string;
      groupTitle: string;
      groupKind: 'Quiz' | 'Survey';
      countsTowardGrade: boolean;
      policy: {
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
      questions: {
        id: string;
        courseId: string;
        lessonId: string;
        groupId?: string;
        order?: number;
        critical?: boolean;
        type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
        text: string;
        scenario?: string;
        category?: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        weight: number;
        required: boolean;
        shuffle: boolean;
        imageId?: string;
        options: {
          id: string;
          text: string;
        }[];
        correctIds?: string[];
        explanation?: string;
        correctFeedback?: string;
        incorrectFeedback?: string;
        tags?: string[];
        status: 'Draft' | 'Published' | 'Archived';
        version: number;
        updatedAt: string;
      }[];
      answers: Record<string, unknown>;
      flags: string[];
      startedAt: string;
      deadline: string;
      submittedAt: string;
      passMark: number;
      showFeedback: boolean;
      feedbackPermitted: boolean;
      feedbackAvailableAt: string;
      feedbackReleasedAt: string;
      score: number | null;
      sectionScore: number | null;
      passed: boolean;
      criticalFailed: boolean;
      scorerVersion: string;
      invalidatedAt: string;
      invalidationReason: string;
      contributingAttemptIds: string[];
      gradeBreakdown: Record<string, unknown>[];
      availability: {
        remaining: number;
        readyAt: string;
        runningId: string;
        availableAt: string;
        dueAt: string;
        overdue: boolean;
        reason: string;
      };
    }[];
    retakePlans: {
      id: string;
      assignmentId: string;
      personId: string;
      fromAttemptId: string;
      groupId: string;
      scheduledFor: string;
      createdAt: string;
      updatedAt: string;
      createdBy: string;
      notifiedAt: string;
      startedAttemptId: string;
    }[];
    person: {
      id: string;
      name: string;
      email: string;
      role: string;
      location: string;
      department: string;
      status: string;
    };
  }[];
  meta: {
    company_id: string;
    request_id: string;
    as_of: string;
    filters: Record<string, unknown>;
    person: {
      id: string;
      name: string;
      email: string;
      role: string;
      location: string;
      department: string;
      status: string;
    };
  };
};

export type AcademyLearningRecordRead = {
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
  assignment: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    personId: string;
    courseId: string;
    courseVersion: number;
    due: string;
    assignedAt: string;
    assignedBy: string;
    recurrenceMonths: number;
    priority: string;
    source: string;
    type: string;
    notes: Record<string, unknown>;
    archived: boolean;
    previousId: string | null;
    supervisorId: string;
    notificationChannels: string[];
    courseSnapshot: Record<string, unknown>;
    completedLessonIds: string[];
    completedAt: string;
    questionSnapshot: {
      id: string;
      courseId: string;
      lessonId: string;
      groupId?: string;
      order?: number;
      critical?: boolean;
      type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
      text: string;
      scenario?: string;
      category?: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      weight: number;
      required: boolean;
      shuffle: boolean;
      imageId?: string;
      options: {
        id: string;
        text: string;
      }[];
      correctIds?: string[];
      explanation?: string;
      correctFeedback?: string;
      incorrectFeedback?: string;
      tags?: string[];
      status: 'Draft' | 'Published' | 'Archived';
      version: number;
      updatedAt: string;
    }[];
    policySnapshot: {
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
    positions: Record<string, unknown>;
    openedResourceIds: string[];
    resourceAcknowledgements: string[];
    availability: Record<string, unknown>;
  };
  attempts: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    assignmentId: string;
    personId: string;
    courseId: string;
    courseTitle: string;
    courseVersion: number;
    groupId: string;
    groupTitle: string;
    groupKind: 'Quiz' | 'Survey';
    countsTowardGrade: boolean;
    policy: {
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
    questions: {
      id: string;
      courseId: string;
      lessonId: string;
      groupId?: string;
      order?: number;
      critical?: boolean;
      type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
      text: string;
      scenario?: string;
      category?: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      weight: number;
      required: boolean;
      shuffle: boolean;
      imageId?: string;
      options: {
        id: string;
        text: string;
      }[];
      correctIds?: string[];
      explanation?: string;
      correctFeedback?: string;
      incorrectFeedback?: string;
      tags?: string[];
      status: 'Draft' | 'Published' | 'Archived';
      version: number;
      updatedAt: string;
    }[];
    answers: Record<string, unknown>;
    flags: string[];
    startedAt: string;
    deadline: string;
    submittedAt: string;
    passMark: number;
    showFeedback: boolean;
    feedbackPermitted: boolean;
    feedbackAvailableAt: string;
    feedbackReleasedAt: string;
    score: number | null;
    sectionScore: number | null;
    passed: boolean;
    criticalFailed: boolean;
    scorerVersion: string;
    invalidatedAt: string;
    invalidationReason: string;
    contributingAttemptIds: string[];
    gradeBreakdown: Record<string, unknown>[];
    availability: {
      remaining: number;
      readyAt: string;
      runningId: string;
      availableAt: string;
      dueAt: string;
      overdue: boolean;
      reason: string;
    };
  }[];
  retakePlans: {
    id: string;
    assignmentId: string;
    personId: string;
    fromAttemptId: string;
    groupId: string;
    scheduledFor: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    notifiedAt: string;
    startedAttemptId: string;
  }[];
  person: {
    id: string;
    name: string;
    email: string;
    role: string;
    location: string;
    department: string;
    status: string;
  };
};

export type AcademyLearningWrite = {
  kind: 'completed' | 'note' | 'position' | 'opened' | 'acknowledged';
  lessonId?: string;
  assetId?: string;
  text?: string;
  position?: string;
};

export type AcademyResponseWrite = {
  questionId: string;
  answers: string[];
  flagged?: boolean;
};

export type AcademyResultAssignmentRead = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  personId: string;
  courseId: string;
  courseVersion: number;
  due: string;
  assignedAt: string;
  assignedBy: string;
  recurrenceMonths: number;
  priority: string;
  source: string;
  type: string;
  notes: Record<string, unknown>;
  archived: boolean;
  previousId: string | null;
  supervisorId: string;
  notificationChannels: string[];
  courseSnapshot: Record<string, unknown>;
  completedLessonIds: string[];
  completedAt: string;
  questionSnapshot: {
    id: string;
    courseId: string;
    lessonId: string;
    groupId?: string;
    order?: number;
    critical?: boolean;
    type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
    text: string;
    scenario?: string;
    category?: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    weight: number;
    required: boolean;
    shuffle: boolean;
    imageId?: string;
    options: {
      id: string;
      text: string;
    }[];
    correctIds?: string[];
    explanation?: string;
    correctFeedback?: string;
    incorrectFeedback?: string;
    tags?: string[];
    status: 'Draft' | 'Published' | 'Archived';
    version: number;
    updatedAt: string;
  }[];
  policySnapshot: {
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
  positions: Record<string, unknown>;
  openedResourceIds: string[];
  resourceAcknowledgements: string[];
  availability: Record<string, unknown>;
};

export type AcademyResultAttemptRead = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  assignmentId: string;
  personId: string;
  courseId: string;
  courseTitle: string;
  courseVersion: number;
  groupId: string;
  groupTitle: string;
  groupKind: 'Quiz' | 'Survey';
  countsTowardGrade: boolean;
  policy: {
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
  questions: {
    id: string;
    courseId: string;
    lessonId: string;
    groupId?: string;
    order?: number;
    critical?: boolean;
    type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
    text: string;
    scenario?: string;
    category?: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    weight: number;
    required: boolean;
    shuffle: boolean;
    imageId?: string;
    options: {
      id: string;
      text: string;
    }[];
    correctIds?: string[];
    explanation?: string;
    correctFeedback?: string;
    incorrectFeedback?: string;
    tags?: string[];
    status: 'Draft' | 'Published' | 'Archived';
    version: number;
    updatedAt: string;
  }[];
  answers: Record<string, unknown>;
  flags: string[];
  startedAt: string;
  deadline: string;
  submittedAt: string;
  passMark: number;
  showFeedback: boolean;
  feedbackPermitted: boolean;
  feedbackAvailableAt: string;
  feedbackReleasedAt: string;
  score: number | null;
  sectionScore: number | null;
  passed: boolean;
  criticalFailed: boolean;
  scorerVersion: string;
  invalidatedAt: string;
  invalidationReason: string;
  contributingAttemptIds: string[];
  gradeBreakdown: Record<string, unknown>[];
  availability: {
    remaining: number;
    readyAt: string;
    runningId: string;
    availableAt: string;
    dueAt: string;
    overdue: boolean;
    reason: string;
  };
};

export type AcademyResultMetaRead = {
  company_id: string;
  request_id: string;
  as_of: string;
  filters: Record<string, unknown>;
};

export type AcademyResultPageRead = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
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
    attempt: {
      id: string;
      company_id: string;
      version: number;
      etag: string;
      assignmentId: string;
      personId: string;
      courseId: string;
      courseTitle: string;
      courseVersion: number;
      groupId: string;
      groupTitle: string;
      groupKind: 'Quiz' | 'Survey';
      countsTowardGrade: boolean;
      policy: {
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
      questions: {
        id: string;
        courseId: string;
        lessonId: string;
        groupId?: string;
        order?: number;
        critical?: boolean;
        type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
        text: string;
        scenario?: string;
        category?: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        weight: number;
        required: boolean;
        shuffle: boolean;
        imageId?: string;
        options: {
          id: string;
          text: string;
        }[];
        correctIds?: string[];
        explanation?: string;
        correctFeedback?: string;
        incorrectFeedback?: string;
        tags?: string[];
        status: 'Draft' | 'Published' | 'Archived';
        version: number;
        updatedAt: string;
      }[];
      answers: Record<string, unknown>;
      flags: string[];
      startedAt: string;
      deadline: string;
      submittedAt: string;
      passMark: number;
      showFeedback: boolean;
      feedbackPermitted: boolean;
      feedbackAvailableAt: string;
      feedbackReleasedAt: string;
      score: number | null;
      sectionScore: number | null;
      passed: boolean;
      criticalFailed: boolean;
      scorerVersion: string;
      invalidatedAt: string;
      invalidationReason: string;
      contributingAttemptIds: string[];
      gradeBreakdown: Record<string, unknown>[];
      availability: {
        remaining: number;
        readyAt: string;
        runningId: string;
        availableAt: string;
        dueAt: string;
        overdue: boolean;
        reason: string;
      };
    };
    assignment: {
      id: string;
      company_id: string;
      version: number;
      etag: string;
      personId: string;
      courseId: string;
      courseVersion: number;
      due: string;
      assignedAt: string;
      assignedBy: string;
      recurrenceMonths: number;
      priority: string;
      source: string;
      type: string;
      notes: Record<string, unknown>;
      archived: boolean;
      previousId: string | null;
      supervisorId: string;
      notificationChannels: string[];
      courseSnapshot: Record<string, unknown>;
      completedLessonIds: string[];
      completedAt: string;
      questionSnapshot: {
        id: string;
        courseId: string;
        lessonId: string;
        groupId?: string;
        order?: number;
        critical?: boolean;
        type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
        text: string;
        scenario?: string;
        category?: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        weight: number;
        required: boolean;
        shuffle: boolean;
        imageId?: string;
        options: {
          id: string;
          text: string;
        }[];
        correctIds?: string[];
        explanation?: string;
        correctFeedback?: string;
        incorrectFeedback?: string;
        tags?: string[];
        status: 'Draft' | 'Published' | 'Archived';
        version: number;
        updatedAt: string;
      }[];
      policySnapshot: {
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
      positions: Record<string, unknown>;
      openedResourceIds: string[];
      resourceAcknowledgements: string[];
      availability: Record<string, unknown>;
    };
    history: {
      id: string;
      company_id: string;
      version: number;
      etag: string;
      assignmentId: string;
      personId: string;
      courseId: string;
      courseTitle: string;
      courseVersion: number;
      groupId: string;
      groupTitle: string;
      groupKind: 'Quiz' | 'Survey';
      countsTowardGrade: boolean;
      policy: {
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
      questions: {
        id: string;
        courseId: string;
        lessonId: string;
        groupId?: string;
        order?: number;
        critical?: boolean;
        type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
        text: string;
        scenario?: string;
        category?: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        weight: number;
        required: boolean;
        shuffle: boolean;
        imageId?: string;
        options: {
          id: string;
          text: string;
        }[];
        correctIds?: string[];
        explanation?: string;
        correctFeedback?: string;
        incorrectFeedback?: string;
        tags?: string[];
        status: 'Draft' | 'Published' | 'Archived';
        version: number;
        updatedAt: string;
      }[];
      answers: Record<string, unknown>;
      flags: string[];
      startedAt: string;
      deadline: string;
      submittedAt: string;
      passMark: number;
      showFeedback: boolean;
      feedbackPermitted: boolean;
      feedbackAvailableAt: string;
      feedbackReleasedAt: string;
      score: number | null;
      sectionScore: number | null;
      passed: boolean;
      criticalFailed: boolean;
      scorerVersion: string;
      invalidatedAt: string;
      invalidationReason: string;
      contributingAttemptIds: string[];
      gradeBreakdown: Record<string, unknown>[];
      availability: {
        remaining: number;
        readyAt: string;
        runningId: string;
        availableAt: string;
        dueAt: string;
        overdue: boolean;
        reason: string;
      };
    }[];
    retakePlans: {
      id: string;
      assignmentId: string;
      personId: string;
      fromAttemptId: string;
      groupId: string;
      scheduledFor: string;
      createdAt: string;
      updatedAt: string;
      createdBy: string;
      notifiedAt: string;
      startedAttemptId: string;
    }[];
    person: {
      id: string;
      name: string;
      email: string;
      role: string;
      location: string;
      department: string;
      status: string;
    };
    integrations: Record<string, unknown>;
  }[];
  meta: {
    company_id: string;
    request_id: string;
    as_of: string;
    filters: Record<string, unknown>;
  };
};

export type AcademyResultQuery = {
  page?: number;
  page_size?: number;
  q?: string;
  person_id?: string;
  assignment_id?: string;
};

export type AcademyResultReason = {
  reason: string;
};

export type AcademyResultRecordRead = {
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
  attempt: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    assignmentId: string;
    personId: string;
    courseId: string;
    courseTitle: string;
    courseVersion: number;
    groupId: string;
    groupTitle: string;
    groupKind: 'Quiz' | 'Survey';
    countsTowardGrade: boolean;
    policy: {
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
    questions: {
      id: string;
      courseId: string;
      lessonId: string;
      groupId?: string;
      order?: number;
      critical?: boolean;
      type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
      text: string;
      scenario?: string;
      category?: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      weight: number;
      required: boolean;
      shuffle: boolean;
      imageId?: string;
      options: {
        id: string;
        text: string;
      }[];
      correctIds?: string[];
      explanation?: string;
      correctFeedback?: string;
      incorrectFeedback?: string;
      tags?: string[];
      status: 'Draft' | 'Published' | 'Archived';
      version: number;
      updatedAt: string;
    }[];
    answers: Record<string, unknown>;
    flags: string[];
    startedAt: string;
    deadline: string;
    submittedAt: string;
    passMark: number;
    showFeedback: boolean;
    feedbackPermitted: boolean;
    feedbackAvailableAt: string;
    feedbackReleasedAt: string;
    score: number | null;
    sectionScore: number | null;
    passed: boolean;
    criticalFailed: boolean;
    scorerVersion: string;
    invalidatedAt: string;
    invalidationReason: string;
    contributingAttemptIds: string[];
    gradeBreakdown: Record<string, unknown>[];
    availability: {
      remaining: number;
      readyAt: string;
      runningId: string;
      availableAt: string;
      dueAt: string;
      overdue: boolean;
      reason: string;
    };
  };
  assignment: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    personId: string;
    courseId: string;
    courseVersion: number;
    due: string;
    assignedAt: string;
    assignedBy: string;
    recurrenceMonths: number;
    priority: string;
    source: string;
    type: string;
    notes: Record<string, unknown>;
    archived: boolean;
    previousId: string | null;
    supervisorId: string;
    notificationChannels: string[];
    courseSnapshot: Record<string, unknown>;
    completedLessonIds: string[];
    completedAt: string;
    questionSnapshot: {
      id: string;
      courseId: string;
      lessonId: string;
      groupId?: string;
      order?: number;
      critical?: boolean;
      type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
      text: string;
      scenario?: string;
      category?: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      weight: number;
      required: boolean;
      shuffle: boolean;
      imageId?: string;
      options: {
        id: string;
        text: string;
      }[];
      correctIds?: string[];
      explanation?: string;
      correctFeedback?: string;
      incorrectFeedback?: string;
      tags?: string[];
      status: 'Draft' | 'Published' | 'Archived';
      version: number;
      updatedAt: string;
    }[];
    policySnapshot: {
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
    positions: Record<string, unknown>;
    openedResourceIds: string[];
    resourceAcknowledgements: string[];
    availability: Record<string, unknown>;
  };
  history: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    assignmentId: string;
    personId: string;
    courseId: string;
    courseTitle: string;
    courseVersion: number;
    groupId: string;
    groupTitle: string;
    groupKind: 'Quiz' | 'Survey';
    countsTowardGrade: boolean;
    policy: {
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
    questions: {
      id: string;
      courseId: string;
      lessonId: string;
      groupId?: string;
      order?: number;
      critical?: boolean;
      type: 'Single choice' | 'Multiple choice' | 'True / false' | 'Free text';
      text: string;
      scenario?: string;
      category?: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      weight: number;
      required: boolean;
      shuffle: boolean;
      imageId?: string;
      options: {
        id: string;
        text: string;
      }[];
      correctIds?: string[];
      explanation?: string;
      correctFeedback?: string;
      incorrectFeedback?: string;
      tags?: string[];
      status: 'Draft' | 'Published' | 'Archived';
      version: number;
      updatedAt: string;
    }[];
    answers: Record<string, unknown>;
    flags: string[];
    startedAt: string;
    deadline: string;
    submittedAt: string;
    passMark: number;
    showFeedback: boolean;
    feedbackPermitted: boolean;
    feedbackAvailableAt: string;
    feedbackReleasedAt: string;
    score: number | null;
    sectionScore: number | null;
    passed: boolean;
    criticalFailed: boolean;
    scorerVersion: string;
    invalidatedAt: string;
    invalidationReason: string;
    contributingAttemptIds: string[];
    gradeBreakdown: Record<string, unknown>[];
    availability: {
      remaining: number;
      readyAt: string;
      runningId: string;
      availableAt: string;
      dueAt: string;
      overdue: boolean;
      reason: string;
    };
  }[];
  retakePlans: {
    id: string;
    assignmentId: string;
    personId: string;
    fromAttemptId: string;
    groupId: string;
    scheduledFor: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    notifiedAt: string;
    startedAttemptId: string;
  }[];
  person: {
    id: string;
    name: string;
    email: string;
    role: string;
    location: string;
    department: string;
    status: string;
  };
  integrations: Record<string, unknown>;
};

export type AcademyResultRetakeRead = {
  id: string;
  assignmentId: string;
  personId: string;
  fromAttemptId: string;
  groupId: string;
  scheduledFor: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notifiedAt: string;
  startedAttemptId: string;
};

export type AcademyRetakeWrite = {
  scheduledFor: string;
};

export type AcademyCertificateEmpty = Record<string, unknown>;

export type AcademyCertificateIssue = {
  attemptId: string;
};

export type AcademyCertificatePageRead = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    certificate: {
      id: string;
      company_id: string;
      version: number;
      etag: string;
      personId: string;
      assignmentId: string;
      courseId: string;
      passedAttemptId: string;
      courseTitle: string;
      courseCode: string;
      courseVersion: number;
      learner: string;
      issuer: string;
      issuedAt: string;
      completedAt: string;
      expires: string;
      score: number;
      cpdHours: number;
      sample: boolean;
      branding: Record<string, unknown>;
      documentId: string;
      replacesId: string;
      replacedById: string;
      correctionReason: string;
      revokedAt: string;
      revocationReason: string;
      state: string;
    };
    person: {
      id: string;
      name: string;
      email: string;
      role: string;
      location: string;
      department: string;
      status: string;
    };
    completion: Record<string, unknown>;
    document: Record<string, unknown>;
    training: Record<string, unknown>;
    currentTraining: Record<string, unknown> | null;
    refresher: Record<string, unknown> | null;
    matrix: Record<string, unknown>[];
    events: Record<string, unknown>[];
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
    integration: Record<string, unknown>;
  }[];
  meta: Record<string, unknown>;
};

export type AcademyCertificateQuery = {
  page?: number;
  page_size?: number;
  q?: string;
  person_id?: string;
  state?: 'All' | 'Current' | 'Expired' | 'Revoked' | 'Superseded';
};

export type AcademyCertificateRead = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  personId: string;
  assignmentId: string;
  courseId: string;
  passedAttemptId: string;
  courseTitle: string;
  courseCode: string;
  courseVersion: number;
  learner: string;
  issuer: string;
  issuedAt: string;
  completedAt: string;
  expires: string;
  score: number;
  cpdHours: number;
  sample: boolean;
  branding: Record<string, unknown>;
  documentId: string;
  replacesId: string;
  replacedById: string;
  correctionReason: string;
  revokedAt: string;
  revocationReason: string;
  state: string;
};

export type AcademyCertificateReason = {
  reason: string;
};

export type AcademyCertificateRecordRead = {
  certificate: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    personId: string;
    assignmentId: string;
    courseId: string;
    passedAttemptId: string;
    courseTitle: string;
    courseCode: string;
    courseVersion: number;
    learner: string;
    issuer: string;
    issuedAt: string;
    completedAt: string;
    expires: string;
    score: number;
    cpdHours: number;
    sample: boolean;
    branding: Record<string, unknown>;
    documentId: string;
    replacesId: string;
    replacedById: string;
    correctionReason: string;
    revokedAt: string;
    revocationReason: string;
    state: string;
  };
  person: {
    id: string;
    name: string;
    email: string;
    role: string;
    location: string;
    department: string;
    status: string;
  };
  completion: Record<string, unknown>;
  document: Record<string, unknown>;
  training: Record<string, unknown>;
  currentTraining: Record<string, unknown> | null;
  refresher: Record<string, unknown> | null;
  matrix: Record<string, unknown>[];
  events: Record<string, unknown>[];
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
  integration: Record<string, unknown>;
};

export type AcademyCompliancePageRead = {
  count: number;
  next: number | null;
  previous: number | null;
  results: Record<string, unknown>[];
  meta: Record<string, unknown>;
};

export type AcademyRecordsPageRead = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    tenantId: string;
    personId: string;
    createdAt: string;
    status: 'Requested' | 'Acknowledged';
    acknowledgedAt: string;
    acknowledgedBy: string;
  }[];
  meta: Record<string, unknown>;
};

export type AcademyRecordsRequestRead = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  tenantId: string;
  personId: string;
  createdAt: string;
  status: 'Requested' | 'Acknowledged';
  acknowledgedAt: string;
  acknowledgedBy: string;
};

export type AcademyRequirementPageRead = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    courseId: string;
    roles?: string[];
    branches?: string[];
    serviceCategory?: string;
    effectiveFrom: string;
    effectiveTo: string;
    minimumVersion?: number;
    allowExternal?: boolean;
    reviewRequired?: boolean;
    renewalMonths?: number;
    reminderDays?: number[];
    autoAssign?: boolean;
    id: string;
    company_id: string;
    version: number;
    etag: string;
  }[];
  meta: Record<string, unknown>;
};

export type AcademyRequirementRead = {
  courseId: string;
  roles?: string[];
  branches?: string[];
  serviceCategory?: string;
  effectiveFrom: string;
  effectiveTo: string;
  minimumVersion?: number;
  allowExternal?: boolean;
  reviewRequired?: boolean;
  renewalMonths?: number;
  reminderDays?: number[];
  autoAssign?: boolean;
  id: string;
  company_id: string;
  version: number;
  etag: string;
};

export type AcademyRequirementWrite = {
  courseId: string;
  roles?: string[];
  branches?: string[];
  serviceCategory?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  minimumVersion?: number;
  allowExternal?: boolean;
  reviewRequired?: boolean;
  renewalMonths?: number;
  reminderDays?: number[];
  autoAssign?: boolean;
};

export type AcademyReportAuditRead = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    at: string;
    actor: string;
    action: string;
    detail: string;
  }[];
};

export type AcademyReportCellRead = {
  branch: string;
  percent: number | null;
};

export type AcademyReportCourseRead = {
  id: string;
  title: string;
  cells: {
    branch: string;
    percent: number | null;
  }[];
};

export type AcademyReportEventRead = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
};

export type AcademyReportExportQuery = {
  from_date?: string;
  to_date?: string;
  branch?: string;
  role?: string;
  kind: 'compliance' | 'certificates' | 'matrix' | 'evidence-pack';
};

export type AcademyReportFilters = {
  from_date?: string;
  to_date?: string;
  branch?: string;
  role?: string;
};

export type AcademyReportGroupRead = {
  name: string;
  assigned: number;
  percent: number | null;
};

export type AcademyReportMetaRead = {
  company_id: string;
  as_of: string;
  request_id: string;
  timezone: string;
  filters: {
    from_date?: string;
    to_date?: string;
    branch?: string;
    role?: string;
  };
};

export type AcademyReportMetricRead = {
  label: string;
  value: string;
  caption: string;
  icon: string;
};

export type AcademyReportMonthRead = {
  month: string;
  count: number;
  percent: number | null;
};

export type AcademyReportPersonRead = {
  id: string;
  name: string;
  role: string;
  location: string;
};

export type AcademyReportQuery = {
  from_date?: string;
  to_date?: string;
  branch?: string;
  role?: string;
  page?: number;
  page_size?: number;
  audit_page?: number;
};

export type AcademyReportRead = {
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    title: string;
    cells: {
      branch: string;
      percent: number | null;
    }[];
  }[];
  meta: {
    company_id: string;
    as_of: string;
    request_id: string;
    timezone: string;
    filters: {
      from_date?: string;
      to_date?: string;
      branch?: string;
      role?: string;
    };
  };
  branches: string[];
  roles: string[];
  stats: {
    label: string;
    value: string;
    caption: string;
    icon: string;
  }[];
  months: {
    month: string;
    count: number;
    percent: number | null;
  }[];
  byBranch: {
    name: string;
    assigned: number;
    percent: number | null;
  }[];
  byRole: {
    name: string;
    assigned: number;
    percent: number | null;
  }[];
  risk: {
    person: {
      id: string;
      name: string;
      role: string;
      location: string;
    };
    overdue: number;
  }[];
  audit: {
    count: number;
    next: number | null;
    previous: number | null;
    results: {
      id: string;
      at: string;
      actor: string;
      action: string;
      detail: string;
    }[];
  };
};

export type AcademyReportRiskRead = {
  person: {
    id: string;
    name: string;
    role: string;
    location: string;
  };
  overdue: number;
};
