// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type ServiceUserRecordSection = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  key: string;
  fields: {
    key: string;
    value: string;
  }[];
  entries: {
    id: string;
    version: number;
    name: string;
    detail: string;
    date: string | null;
    level: string;
    status: string;
    capacity: string;
  }[];
  can_edit: boolean;
  can_create: boolean;
  has_code: boolean;
  staff_read: boolean;
  staff_choices: {
    id: string;
    name: string;
  }[];
  local_date: string;
};

export type ServiceUserRecordEntryWrite = {
  name: string;
  detail?: string;
  date?: string | null;
  level?: 'Low' | 'Medium' | 'High';
  status?: 'Active' | 'Completed' | 'Inactive';
  capacity?: '' | 'Has capacity' | 'Lacks capacity' | 'Fluctuates' | 'Not assessed';
};

export type ServiceUserRecordEntryPatch = {
  name?: string;
  detail?: string;
  date?: string | null;
  level?: '' | 'Low' | 'Medium' | 'High';
  status?: 'Active' | 'Completed' | 'Inactive';
  capacity?: '' | 'Has capacity' | 'Lacks capacity' | 'Fluctuates' | 'Not assessed';
};

export type ServiceUserRecordDiagnosesWrite = {
  primary?: string;
  diet?: string;
  ongoing?: string;
  communication?: string;
  hearing?: string;
  vision?: string;
  sensory?: string;
};

export type ServiceUserRecordMovingWrite = {
  assessed?: string | null;
  review?: string | null;
  support?: '' | 'Independent' | 'One person' | 'Two people' | 'Specialist assessment required';
  equipment?: string;
  instructions?: string;
};

export type ServiceUserRecordCapacityWrite = {
  status?: '' | 'Not recorded' | 'Has capacity' | 'Lacks capacity' | 'Fluctuates' | 'Not assessed';
  assessed?: string | null;
  reason?: string;
  welfareLpa?: string;
  financeLpa?: string;
  advance?: string;
  support?: string;
  review?: string | null;
};

export type ServiceUserRecordConsentWrite = {
  status?: '' | 'Not recorded' | 'Given' | 'Declined' | 'Withdrawn';
  date?: string | null;
  by?: string;
  care?: '' | 'Not recorded' | 'Agreed' | 'Declined';
  medication?: '' | 'Not recorded' | 'Agreed' | 'Declined';
  family?: '' | 'Not recorded' | 'Agreed' | 'Declined';
  photo?: '' | 'Not recorded' | 'Agreed' | 'Declined';
  notes?: string;
};

export type ServiceUserRecordAccessWrite = {
  location?: string;
  code?: string;
  checked?: string | null;
  instructions?: string;
};

export type ServiceUserRecordSupportWrite = {
  personal?: string;
  nutrition?: string;
  continence?: string;
  safety?: string;
  behaviour?: string;
  continuity?: string;
  gender?: '' | 'Any' | 'Female' | 'Male';
  preferredStaff?: string;
  backupStaff?: string;
};

export type ServiceUserCarePlan = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  plan: {
    name: string;
    start: string | null;
    review: string | null;
    status: string;
    needs: string;
    support: string;
  };
  goals: {
    name: string;
    detail: string;
    date: string | null;
    level: 'Low' | 'Medium' | 'High';
    status: 'Active' | 'Completed' | 'Inactive';
    id: string;
    version: number;
  }[];
  can_edit: boolean;
  can_create_goal: boolean;
};

export type ServiceUserCarePlanWrite = {
  name?: string;
  start?: string | null;
  review?: string | null;
  status?: 'Draft' | 'Active' | 'Archived';
  needs?: string;
  support?: string;
};

export type ServiceUserCareGoalWrite = {
  name: string;
  detail?: string;
  date?: string | null;
  level?: 'Low' | 'Medium' | 'High';
  status?: 'Active' | 'Completed' | 'Inactive';
};

export type ServiceUserCareGoalPatch = {
  name?: string;
  detail?: string;
  date?: string | null;
  level?: 'Low' | 'Medium' | 'High';
  status?: 'Active' | 'Completed' | 'Inactive';
};

export type ServiceUserFamily = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  approved: string;
  preferences: string;
  sharing_consent: string;
  can_edit: boolean;
};

export type ServiceUserFamilyWrite = {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  approved?: string;
  preferences?: string;
  sharing_consent?: string;
};

export type ServiceUserDemographics = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  name: string;
  reference: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  details: {
    dob?: string | null;
    gender?: string;
    preferredName?: string;
    language?: string;
    nhs?: string;
    religion?: string;
    ethnicity?: string;
    gp?: string;
    living?: string;
    sexuality?: string;
    likes?: string;
    dislikes?: string;
    about?: string;
  };
  local_date: string;
  can_edit: boolean;
};

export type ServiceUserDemographicsWrite = {
  dob?: string | null;
  gender?: string;
  preferredName?: string;
  language?: string;
  nhs?: string;
  religion?: string;
  ethnicity?: string;
  gp?: string;
  living?: string;
  sexuality?: string;
  likes?: string;
  dislikes?: string;
  about?: string;
  name?: string;
  reference?: string;
  address?: string;
  postcode?: string;
  phone?: string;
  email?: string;
};

export type ServiceUserOverview = {
  workspace: {
    visits_read: boolean;
    sections: {
      id: string;
      company_id: string;
      version: number;
      etag: string;
      key: string;
      fields: {
        key: string;
        value: string;
      }[];
      entries: {
        id: string;
        version: number;
        name: string;
        detail: string;
        date: string | null;
        level: string;
        status: string;
        capacity: string;
      }[];
      can_edit: boolean;
      can_create: boolean;
      has_code: boolean;
      staff_read: boolean;
      staff_choices: {
        id: string;
        name: string;
      }[];
      local_date: string;
    }[];
    visits: {
      id: string;
      callName: string;
      date: string;
      start: string;
      end: string;
      state: string;
    }[];
  };
  care_plan: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    plan: {
      name: string;
      start: string | null;
      review: string | null;
      status: string;
      needs: string;
      support: string;
    };
    goals: {
      name: string;
      detail: string;
      date: string | null;
      level: 'Low' | 'Medium' | 'High';
      status: 'Active' | 'Completed' | 'Inactive';
      id: string;
      version: number;
    }[];
    can_edit: boolean;
    can_create_goal: boolean;
  } | null;
  family: {
    approved: string;
    preferences: string;
    sharing_consent: string;
  };
  record: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    name: string;
    reference: string;
    address: string;
    postcode: string;
    funding: string;
    priority: string;
    active: boolean;
    phone: string;
    email: string;
    details: {
      dob?: string | null;
      gender?: string;
      preferredName?: string;
      language?: string;
      nhs?: string;
      religion?: string;
      ethnicity?: string;
      gp?: string;
      living?: string;
      sexuality?: string;
      likes?: string;
      dislikes?: string;
      about?: string;
    };
    representative: {
      name?: string;
      relationship?: string;
      phone?: string;
      email?: string;
    };
    riskFlags: string[];
    photo_id: string | null;
    primary_needs: string[];
    packages: {
      id: string;
      name: string;
    }[];
    next_visit: {
      id: string;
      date: string;
      start: string;
    } | null;
  };
  clinical: {
    primary_diagnosis: string;
    other_conditions: string;
    allergies: string;
    diet: string;
    ongoing: string;
    equipment: string;
    mobility_support: string;
    mobility_instructions: string;
    communication: string;
    hearing: string;
    vision: string;
    sensory: string;
    decision_support: string;
    welfare_lpa: string;
    finance_lpa: string;
    personal: string;
    nutrition: string;
    continence: string;
    safety: string;
    behaviour: string;
    continuity: string;
    key_safe_location: string;
  };
  capacity: {
    status: string;
    assessed_on: string | null;
    reason: string;
  };
  medication_reference: string | null;
  medication_read: boolean;
  medication_edit: boolean;
  risks: {
    title: string;
    level: string;
  }[];
  risks_read: boolean;
  services_read: boolean;
  local_date: string;
};

export type ServiceUserOverviewHealthWrite = {
  primary_diagnosis?: string;
  other_conditions?: string;
  allergies?: string;
  diet?: string;
  ongoing?: string;
  equipment?: string;
  mobility_support?:
    '' | 'Independent' | 'One person' | 'Two people' | 'Specialist assessment required';
  mobility_instructions?: string;
  welfare_lpa?: string;
  finance_lpa?: string;
  capacity_status?: '' | 'Has capacity' | 'Lacks capacity' | 'Fluctuates' | 'Not assessed';
  capacity_assessed_on?: string | null;
  capacity_reason?: string;
  medication_reference?: string;
};

export type ServiceUserOverviewSupportWrite = {
  personal?: string;
  nutrition?: string;
  mobility_instructions?: string;
  continence?: string;
  safety?: string;
  behaviour?: string;
  continuity?: string;
};

export type ServiceUserOverviewCommunicationWrite = {
  communication?: string;
  language?: string;
  hearing?: string;
  vision?: string;
  sensory?: string;
  decision_support?: string;
};

export type ServiceUserOverviewPreferencesWrite = {
  likes?: string;
  dislikes?: string;
  about?: string;
};

export type ServiceUserOverviewContactWrite = {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
};

export type ServiceUserOverviewPhotoWrite = {
  photo_id: string | null;
};

export type ServiceUser = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
  name: string;
  reference: string;
  address: string;
  postcode: string;
  funding: string;
  priority: string;
  active: boolean;
  phone: string;
  email: string;
  details: {
    dob?: string | null;
    gender?: string;
    preferredName?: string;
    language?: string;
    nhs?: string;
    religion?: string;
    ethnicity?: string;
    gp?: string;
    living?: string;
    sexuality?: string;
    likes?: string;
    dislikes?: string;
    about?: string;
  };
  representative: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };
  riskFlags: string[];
  photo_id: string | null;
  primary_needs: string[];
  packages: {
    id: string;
    name: string;
  }[];
  next_visit: {
    id: string;
    date: string;
    start: string;
  } | null;
};

export type ServiceUserDirectoryFactWrite = {
  kind: 'need' | 'capacity' | 'risk';
  title: string;
  active?: boolean;
  observed_on: string;
  capacity?: '' | 'Has capacity' | 'Lacks capacity' | 'Fluctuates' | 'Not assessed';
  level?: '' | 'Low' | 'Medium' | 'High';
  reason: string;
  supersedes?: string | null;
};

export type ServiceUserCarePackageWrite = {
  name: string;
  active?: boolean;
};

export type ServiceUserPlannedVisitWrite = {
  package_id?: string | null;
  starts_at: string;
  ends_at: string;
  time_sensitive?: boolean;
};

export type ServiceUserVisitCancelWrite = {
  reason: string;
};

export type ServiceUserSourceInput = {
  id: string;
  company_id: string;
  version: number;
  etag: string;
};

export type ServiceUserWrite = {
  name: string;
  reference: string;
  address: string;
  postcode: string;
  funding: 'Local authority' | 'Private' | 'NHS';
  priority?: 'Standard' | 'High';
  active?: boolean;
  phone?: string;
  email?: string;
  details: {
    dob?: string | null;
    gender?: string;
    preferredName?: string;
    language?: string;
    nhs?: string;
    religion?: string;
    ethnicity?: string;
    gp?: string;
    living?: string;
    sexuality?: string;
    likes?: string;
    dislikes?: string;
    about?: string;
  };
  representative: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };
  riskFlags?: (
    'Medication support' | 'Living alone' | 'Dementia' | 'Critical / welfare-sensitive'
  )[];
  photo_id?: string | null;
};

export type ServiceUserPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    company_id: string;
    version: number;
    etag: string;
    name: string;
    reference: string;
    address: string;
    postcode: string;
    funding: string;
    priority: string;
    active: boolean;
    phone: string;
    email: string;
    details: {
      dob?: string | null;
      gender?: string;
      preferredName?: string;
      language?: string;
      nhs?: string;
      religion?: string;
      ethnicity?: string;
      gp?: string;
      living?: string;
      sexuality?: string;
      likes?: string;
      dislikes?: string;
      about?: string;
    };
    representative: {
      name?: string;
      relationship?: string;
      phone?: string;
      email?: string;
    };
    riskFlags: string[];
    photo_id: string | null;
    primary_needs: string[];
    packages: {
      id: string;
      name: string;
    }[];
    next_visit: {
      id: string;
      date: string;
      start: string;
    } | null;
  }[];
  meta: {
    company_id: string;
    local_date: string;
    as_of: string;
    request_id: string;
    filters: {};
    unavailable: {
      time_sensitive: string;
      capacity_reviews: string;
      primary_needs: string;
      packages: string;
      next_visit: string;
      high_risk: string;
    };
  };
};

export type ServiceUserSummary = {
  company_id: string;
  active: number;
  high_priority: number;
  high_risk: number | null;
  time_sensitive: number | null;
  capacity_reviews: number | null;
  unavailable: {
    time_sensitive: string;
    capacity_reviews: string;
    primary_needs: string;
    packages: string;
    next_visit: string;
    high_risk: string;
  };
  as_of: string;
  local_date: string;
};

export type ServiceUserFacets = {
  company_id: string;
  needs: string[];
  packages: string[];
  funding: string[];
  unavailable: {
    time_sensitive: string;
    capacity_reviews: string;
    primary_needs: string;
    packages: string;
    next_visit: string;
    high_risk: string;
  };
};

export type ServiceUserPhotoWrite = {
  name: string;
  content_type: 'image/png' | 'image/jpeg';
  size: number;
  digest: string;
};

export type ServiceUserPhotoChunkWrite = {
  content: string;
};

export type ServiceUserPhoto = {
  id: string;
  company_id: string;
  state: string;
  etag: string;
};
