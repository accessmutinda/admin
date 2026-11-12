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
