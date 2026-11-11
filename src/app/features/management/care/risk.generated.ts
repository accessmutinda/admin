// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type RiskWrite = {
  voice_note_id?: string | null;
  review_decision_id?: string | null;
  domain:
    | 'General'
    | 'Falls & Mobility'
    | 'Moving & Handling'
    | 'Mental Health'
    | 'Behaviour / PBS'
    | 'Self-Harm / Suicide'
    | 'Medication'
    | 'Substance / Alcohol'
    | 'Safeguarding'
    | 'Community / Outreach'
    | 'Environmental / Fire'
    | 'Nutrition & Hydration'
    | 'Skin / Pressure Care'
    | 'Dysphagia / Choking'
    | 'Epilepsy / Seizures'
    | 'Diabetes'
    | 'Lone Working / Staff Safety'
    | 'Financial Risk'
    | 'Home Access'
    | 'Equipment Safety'
    | 'Other condition-specific risks';
  specific: string;
  date: string;
  review: string | null;
  likelihood: number;
  severity: number;
  residualLikelihood: number;
  residualSeverity: number;
  harmed: ('Service user' | 'Staff' | 'Family' | 'Public' | 'Property' | 'Other')[];
  fields: Record<string, string>;
  checks: string[];
  triggers: (
    | 'Accident'
    | 'Incident'
    | 'Fall'
    | 'Medication error'
    | 'Safeguarding concern'
    | 'Hospital admission / discharge'
    | 'New diagnosis'
    | 'Change in medication'
    | 'Change in mobility'
    | 'Behaviour escalation'
    | 'Change of care package'
    | 'New equipment'
    | 'Significant complaint'
    | 'Near miss'
    | 'Significant change in needs'
  )[];
  actions: {
    id: string;
    text: string;
    owner: string;
    due: string;
    status: 'Open' | 'In progress' | 'Completed';
  }[];
  tasks: {
    task:
      | 'Turning in bed'
      | 'Rolling in bed'
      | 'Lying to sitting'
      | 'Repositioning in bed'
      | 'Getting into bed'
      | 'Getting out of bed'
      | 'Toilet / commode transfers'
      | 'Bath / shower transfers'
      | 'Sitting to standing'
      | 'Standing'
      | 'Walking'
      | 'Stairs'
      | 'Wheelchair transfers'
      | 'Armchair transfers'
      | 'Floor transfers'
      | 'Car / transport access';
    support: '' | 'Independent' | 'Supervision' | 'Assistance' | 'Double-up' | 'Not Applicable';
    equipment: string;
    technique: string;
    notes: string;
  }[];
  handlingRisks: {
    id: string;
    task:
      | 'Turning in bed'
      | 'Rolling in bed'
      | 'Lying to sitting'
      | 'Repositioning in bed'
      | 'Getting into bed'
      | 'Getting out of bed'
      | 'Toilet / commode transfers'
      | 'Bath / shower transfers'
      | 'Sitting to standing'
      | 'Standing'
      | 'Walking'
      | 'Stairs'
      | 'Wheelchair transfers'
      | 'Armchair transfers'
      | 'Floor transfers'
      | 'Car / transport access';
    risk: string;
    level: 'Low' | 'Medium' | 'High' | 'Critical';
    controls: string;
  }[];
  careArea:
    | ''
    | 'About Me'
    | 'Personal Care'
    | 'Mobility'
    | 'Nutrition & Hydration'
    | 'Continence'
    | 'Dressing & Grooming'
    | 'Communication'
    | 'Mental Health / Behaviour'
    | 'Medication Support'
    | 'Environment & Home Safety'
    | 'Social & Community Support'
    | 'Daily Routine'
    | 'Cultural / Religious Needs'
    | 'Managing Money'
    | 'End of Life'
    | 'Home Access & Security'
    | 'Call Package';
  incidentIds: string[];
  documentIds: string[];
  visibility: {
    staff: boolean;
    family: boolean;
    inspector: boolean;
  };
  reason: string;
};

export type RiskRead = {
  voice_transcript: string;
  voice_audio: boolean;
  voice_note_id: string | null;
  review_decision_id: string | null;
  template_version: number;
  id: string;
  company_id: string;
  service_user_id: string;
  groupId: string;
  version: number;
  source_version: number;
  etag: string;
  domain: string;
  specific: string;
  date: string;
  review: string;
  status: 'Draft' | 'In review' | 'Approved';
  likelihood: number;
  severity: number;
  residualLikelihood: number;
  residualSeverity: number;
  harmed: string[];
  fields: Record<string, string>;
  checks: string[];
  triggers: string[];
  actions: {
    id: string;
    text: string;
    owner: string;
    due: string;
    status: 'Open' | 'In progress' | 'Completed';
  }[];
  tasks: {
    task:
      | 'Turning in bed'
      | 'Rolling in bed'
      | 'Lying to sitting'
      | 'Repositioning in bed'
      | 'Getting into bed'
      | 'Getting out of bed'
      | 'Toilet / commode transfers'
      | 'Bath / shower transfers'
      | 'Sitting to standing'
      | 'Standing'
      | 'Walking'
      | 'Stairs'
      | 'Wheelchair transfers'
      | 'Armchair transfers'
      | 'Floor transfers'
      | 'Car / transport access';
    support: '' | 'Independent' | 'Supervision' | 'Assistance' | 'Double-up' | 'Not Applicable';
    equipment: string;
    technique: string;
    notes: string;
  }[];
  handlingRisks: {
    id: string;
    task:
      | 'Turning in bed'
      | 'Rolling in bed'
      | 'Lying to sitting'
      | 'Repositioning in bed'
      | 'Getting into bed'
      | 'Getting out of bed'
      | 'Toilet / commode transfers'
      | 'Bath / shower transfers'
      | 'Sitting to standing'
      | 'Standing'
      | 'Walking'
      | 'Stairs'
      | 'Wheelchair transfers'
      | 'Armchair transfers'
      | 'Floor transfers'
      | 'Car / transport access';
    risk: string;
    level: 'Low' | 'Medium' | 'High' | 'Critical';
    controls: string;
  }[];
  careArea: string;
  incidentIds: string[];
  documentIds: string[];
  visibility: {
    staff: boolean;
    family: boolean;
    inspector: boolean;
  };
  author: string;
  authorId: string;
  approver: string;
  approvedAt: string;
};

export type RiskReason = {
  reason: string;
};

export type RiskWorkspace = {
  company_id: string;
  service_user_id: string;
  local_date: string;
  assessments: {
    voice_transcript: string;
    voice_audio: boolean;
    voice_note_id: string | null;
    review_decision_id: string | null;
    template_version: number;
    id: string;
    company_id: string;
    service_user_id: string;
    groupId: string;
    version: number;
    source_version: number;
    etag: string;
    domain: string;
    specific: string;
    date: string;
    review: string;
    status: 'Draft' | 'In review' | 'Approved';
    likelihood: number;
    severity: number;
    residualLikelihood: number;
    residualSeverity: number;
    harmed: string[];
    fields: Record<string, string>;
    checks: string[];
    triggers: string[];
    actions: {
      id: string;
      text: string;
      owner: string;
      due: string;
      status: 'Open' | 'In progress' | 'Completed';
    }[];
    tasks: {
      task:
        | 'Turning in bed'
        | 'Rolling in bed'
        | 'Lying to sitting'
        | 'Repositioning in bed'
        | 'Getting into bed'
        | 'Getting out of bed'
        | 'Toilet / commode transfers'
        | 'Bath / shower transfers'
        | 'Sitting to standing'
        | 'Standing'
        | 'Walking'
        | 'Stairs'
        | 'Wheelchair transfers'
        | 'Armchair transfers'
        | 'Floor transfers'
        | 'Car / transport access';
      support: '' | 'Independent' | 'Supervision' | 'Assistance' | 'Double-up' | 'Not Applicable';
      equipment: string;
      technique: string;
      notes: string;
    }[];
    handlingRisks: {
      id: string;
      task:
        | 'Turning in bed'
        | 'Rolling in bed'
        | 'Lying to sitting'
        | 'Repositioning in bed'
        | 'Getting into bed'
        | 'Getting out of bed'
        | 'Toilet / commode transfers'
        | 'Bath / shower transfers'
        | 'Sitting to standing'
        | 'Standing'
        | 'Walking'
        | 'Stairs'
        | 'Wheelchair transfers'
        | 'Armchair transfers'
        | 'Floor transfers'
        | 'Car / transport access';
      risk: string;
      level: 'Low' | 'Medium' | 'High' | 'Critical';
      controls: string;
    }[];
    careArea: string;
    incidentIds: string[];
    documentIds: string[];
    visibility: {
      staff: boolean;
      family: boolean;
      inspector: boolean;
    };
    author: string;
    authorId: string;
    approver: string;
    approvedAt: string;
  }[];
  history: {
    at: string;
    by: string;
    action: string;
    reason: string;
    assessment: {
      voice_transcript: string;
      voice_audio: boolean;
      voice_note_id: string | null;
      review_decision_id: string | null;
      template_version: number;
      id: string;
      company_id: string;
      service_user_id: string;
      groupId: string;
      version: number;
      source_version: number;
      etag: string;
      domain: string;
      specific: string;
      date: string;
      review: string;
      status: 'Draft' | 'In review' | 'Approved';
      likelihood: number;
      severity: number;
      residualLikelihood: number;
      residualSeverity: number;
      harmed: string[];
      fields: Record<string, string>;
      checks: string[];
      triggers: string[];
      actions: {
        id: string;
        text: string;
        owner: string;
        due: string;
        status: 'Open' | 'In progress' | 'Completed';
      }[];
      tasks: {
        task:
          | 'Turning in bed'
          | 'Rolling in bed'
          | 'Lying to sitting'
          | 'Repositioning in bed'
          | 'Getting into bed'
          | 'Getting out of bed'
          | 'Toilet / commode transfers'
          | 'Bath / shower transfers'
          | 'Sitting to standing'
          | 'Standing'
          | 'Walking'
          | 'Stairs'
          | 'Wheelchair transfers'
          | 'Armchair transfers'
          | 'Floor transfers'
          | 'Car / transport access';
        support: '' | 'Independent' | 'Supervision' | 'Assistance' | 'Double-up' | 'Not Applicable';
        equipment: string;
        technique: string;
        notes: string;
      }[];
      handlingRisks: {
        id: string;
        task:
          | 'Turning in bed'
          | 'Rolling in bed'
          | 'Lying to sitting'
          | 'Repositioning in bed'
          | 'Getting into bed'
          | 'Getting out of bed'
          | 'Toilet / commode transfers'
          | 'Bath / shower transfers'
          | 'Sitting to standing'
          | 'Standing'
          | 'Walking'
          | 'Stairs'
          | 'Wheelchair transfers'
          | 'Armchair transfers'
          | 'Floor transfers'
          | 'Car / transport access';
        risk: string;
        level: 'Low' | 'Medium' | 'High' | 'Critical';
        controls: string;
      }[];
      careArea: string;
      incidentIds: string[];
      documentIds: string[];
      visibility: {
        staff: boolean;
        family: boolean;
        inspector: boolean;
      };
      author: string;
      authorId: string;
      approver: string;
      approvedAt: string;
    };
  }[];
  legacy: {
    status: string;
    id: string;
    name: string;
    detail: string;
    date: string;
    level: string;
  }[];
  documents: {
    status: string;
    id: string;
    name: string;
    detail: string;
    date: string;
    level: string;
  }[];
  incidents_available: boolean;
  company_name: string;
};

export type RiskHistoryRead = {
  at: string;
  by: string;
  action: string;
  reason: string;
  assessment: {
    voice_transcript: string;
    voice_audio: boolean;
    voice_note_id: string | null;
    review_decision_id: string | null;
    template_version: number;
    id: string;
    company_id: string;
    service_user_id: string;
    groupId: string;
    version: number;
    source_version: number;
    etag: string;
    domain: string;
    specific: string;
    date: string;
    review: string;
    status: 'Draft' | 'In review' | 'Approved';
    likelihood: number;
    severity: number;
    residualLikelihood: number;
    residualSeverity: number;
    harmed: string[];
    fields: Record<string, string>;
    checks: string[];
    triggers: string[];
    actions: {
      id: string;
      text: string;
      owner: string;
      due: string;
      status: 'Open' | 'In progress' | 'Completed';
    }[];
    tasks: {
      task:
        | 'Turning in bed'
        | 'Rolling in bed'
        | 'Lying to sitting'
        | 'Repositioning in bed'
        | 'Getting into bed'
        | 'Getting out of bed'
        | 'Toilet / commode transfers'
        | 'Bath / shower transfers'
        | 'Sitting to standing'
        | 'Standing'
        | 'Walking'
        | 'Stairs'
        | 'Wheelchair transfers'
        | 'Armchair transfers'
        | 'Floor transfers'
        | 'Car / transport access';
      support: '' | 'Independent' | 'Supervision' | 'Assistance' | 'Double-up' | 'Not Applicable';
      equipment: string;
      technique: string;
      notes: string;
    }[];
    handlingRisks: {
      id: string;
      task:
        | 'Turning in bed'
        | 'Rolling in bed'
        | 'Lying to sitting'
        | 'Repositioning in bed'
        | 'Getting into bed'
        | 'Getting out of bed'
        | 'Toilet / commode transfers'
        | 'Bath / shower transfers'
        | 'Sitting to standing'
        | 'Standing'
        | 'Walking'
        | 'Stairs'
        | 'Wheelchair transfers'
        | 'Armchair transfers'
        | 'Floor transfers'
        | 'Car / transport access';
      risk: string;
      level: 'Low' | 'Medium' | 'High' | 'Critical';
      controls: string;
    }[];
    careArea: string;
    incidentIds: string[];
    documentIds: string[];
    visibility: {
      staff: boolean;
      family: boolean;
      inspector: boolean;
    };
    author: string;
    authorId: string;
    approver: string;
    approvedAt: string;
  };
};

export type RiskReference = {
  status: string;
  id: string;
  name: string;
  detail: string;
  date: string;
  level: string;
};

export type RiskActionWrite = {
  id: string;
  text: string;
  owner: string;
  due: string;
  status: 'Open' | 'In progress' | 'Completed';
};

export type RiskTaskWrite = {
  task:
    | 'Turning in bed'
    | 'Rolling in bed'
    | 'Lying to sitting'
    | 'Repositioning in bed'
    | 'Getting into bed'
    | 'Getting out of bed'
    | 'Toilet / commode transfers'
    | 'Bath / shower transfers'
    | 'Sitting to standing'
    | 'Standing'
    | 'Walking'
    | 'Stairs'
    | 'Wheelchair transfers'
    | 'Armchair transfers'
    | 'Floor transfers'
    | 'Car / transport access';
  support: '' | 'Independent' | 'Supervision' | 'Assistance' | 'Double-up' | 'Not Applicable';
  equipment: string;
  technique: string;
  notes: string;
};

export type RiskHandlingWrite = {
  id: string;
  task:
    | 'Turning in bed'
    | 'Rolling in bed'
    | 'Lying to sitting'
    | 'Repositioning in bed'
    | 'Getting into bed'
    | 'Getting out of bed'
    | 'Toilet / commode transfers'
    | 'Bath / shower transfers'
    | 'Sitting to standing'
    | 'Standing'
    | 'Walking'
    | 'Stairs'
    | 'Wheelchair transfers'
    | 'Armchair transfers'
    | 'Floor transfers'
    | 'Car / transport access';
  risk: string;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  controls: string;
};

export type RiskVisibility = {
  staff: boolean;
  family: boolean;
  inspector: boolean;
};

export type RiskDecisionHistory = {
  id: string;
  at: string;
  by: string;
  source_kind: string;
  source_id: string;
  source_version: number;
  decision: string;
  reason: string;
};

export type RiskVoiceWrite = {
  transcript: string;
  domain:
    | 'General'
    | 'Falls & Mobility'
    | 'Moving & Handling'
    | 'Mental Health'
    | 'Behaviour / PBS'
    | 'Self-Harm / Suicide'
    | 'Medication'
    | 'Substance / Alcohol'
    | 'Safeguarding'
    | 'Community / Outreach'
    | 'Environmental / Fire'
    | 'Nutrition & Hydration'
    | 'Skin / Pressure Care'
    | 'Dysphagia / Choking'
    | 'Epilepsy / Seizures'
    | 'Diabetes'
    | 'Lone Working / Staff Safety'
    | 'Financial Risk'
    | 'Home Access'
    | 'Equipment Safety'
    | 'Other condition-specific risks';
  file?: string;
};

export type RiskVoiceRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  domain: string;
  transcript: string;
  state: string;
  size: number;
  content_type: string;
};

export type RiskSuggestion = {
  id: string;
  source_id: string;
  source_kind: string;
  source_version: number;
  assessment_id: string | null;
  title: string;
  detail: string;
};

export type RiskReviewRead = {
  decisions: {
    id: string;
    at: string;
    by: string;
    source_kind: string;
    source_id: string;
    source_version: number;
    decision: string;
    reason: string;
  }[];
  company_id: string;
  service_user_id: string;
  as_of: string;
  suggestions: {
    id: string;
    source_id: string;
    source_kind: string;
    source_version: number;
    assessment_id: string | null;
    title: string;
    detail: string;
  }[];
  unavailable_sources: string[];
};

export type RiskDecisionWrite = {
  suggestion_id: string;
  decision: 'accepted' | 'dismissed';
  reason: string;
};

export type RiskDecisionRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  assessment: {
    voice_transcript: string;
    voice_audio: boolean;
    voice_note_id: string | null;
    review_decision_id: string | null;
    template_version: number;
    id: string;
    company_id: string;
    service_user_id: string;
    groupId: string;
    version: number;
    source_version: number;
    etag: string;
    domain: string;
    specific: string;
    date: string;
    review: string;
    status: 'Draft' | 'In review' | 'Approved';
    likelihood: number;
    severity: number;
    residualLikelihood: number;
    residualSeverity: number;
    harmed: string[];
    fields: Record<string, string>;
    checks: string[];
    triggers: string[];
    actions: {
      id: string;
      text: string;
      owner: string;
      due: string;
      status: 'Open' | 'In progress' | 'Completed';
    }[];
    tasks: {
      task:
        | 'Turning in bed'
        | 'Rolling in bed'
        | 'Lying to sitting'
        | 'Repositioning in bed'
        | 'Getting into bed'
        | 'Getting out of bed'
        | 'Toilet / commode transfers'
        | 'Bath / shower transfers'
        | 'Sitting to standing'
        | 'Standing'
        | 'Walking'
        | 'Stairs'
        | 'Wheelchair transfers'
        | 'Armchair transfers'
        | 'Floor transfers'
        | 'Car / transport access';
      support: '' | 'Independent' | 'Supervision' | 'Assistance' | 'Double-up' | 'Not Applicable';
      equipment: string;
      technique: string;
      notes: string;
    }[];
    handlingRisks: {
      id: string;
      task:
        | 'Turning in bed'
        | 'Rolling in bed'
        | 'Lying to sitting'
        | 'Repositioning in bed'
        | 'Getting into bed'
        | 'Getting out of bed'
        | 'Toilet / commode transfers'
        | 'Bath / shower transfers'
        | 'Sitting to standing'
        | 'Standing'
        | 'Walking'
        | 'Stairs'
        | 'Wheelchair transfers'
        | 'Armchair transfers'
        | 'Floor transfers'
        | 'Car / transport access';
      risk: string;
      level: 'Low' | 'Medium' | 'High' | 'Critical';
      controls: string;
    }[];
    careArea: string;
    incidentIds: string[];
    documentIds: string[];
    visibility: {
      staff: boolean;
      family: boolean;
      inspector: boolean;
    };
    author: string;
    authorId: string;
    approver: string;
    approvedAt: string;
  } | null;
};
