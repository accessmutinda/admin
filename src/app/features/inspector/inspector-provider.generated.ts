// Generated from backend OpenAPI.

export type InspectorError = {
  code: string;
  detail: string;
  field_errors: {};
  request_id: string;
};

export type InspectorAddressRead = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
};

export type InspectorClientCompanyRead = {
  logo_available: boolean;
  head_office_address: string | null;
  postcode: string | null;
  id: string;
  name: string;
  code: string;
  active: boolean;
  sector: string | null;
  registered_places: number | null;
  updated_at: string;
};

export type InspectorClientDocumentRead = {
  id: string;
  service_user_id: string;
  name: string;
  category: string;
  version: number;
  updated: string;
  expiry: string | null;
  content_type: string;
  size: number;
  owner: string | null;
  status: string;
};

export type InspectorClientExportQuery = {
  ordering?: 'name' | '-name';
  q?: string;
  risk?: '' | 'High' | 'Medium' | 'Low' | 'Not assessed';
  funding?: '' | 'Local authority' | 'Private' | 'NHS';
  postcode?: string;
  status?: '' | 'Active' | 'Inactive';
};

export type InspectorClientInstructionRead = {
  name: string;
  instructions: string;
  preferences: string;
  escalation: string;
  outcome: string;
  actions: string;
  client: string;
};

export type InspectorClientMetaRead = {
  company_id: string;
  as_of: string;
  timezone: string;
  request_id: string;
  filters: Record<string, number>;
  disclosure: string;
};

export type InspectorClientPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    version: number;
    name: string;
    reference: string;
    address: string;
    postcode: string;
    funding: 'Local authority' | 'Private' | 'NHS';
    priority: 'Standard' | 'High';
    active: boolean;
    updated_at: string;
    sections: Record<string, Record<string, string>>;
    risks: {
      id: string;
      name: string;
      detail: string;
      date: string;
      level: 'Low' | 'Medium' | 'High';
      status: 'Active';
    }[];
    instructions: {
      name: string;
      instructions: string;
      preferences: string;
      escalation: string;
      outcome: string;
      actions: string;
      client: string;
    }[];
    documents: {
      id: string;
      service_user_id: string;
      name: string;
      category: string;
      version: number;
      updated: string;
      expiry: string | null;
      content_type: string;
      size: number;
      owner: string | null;
      status: string;
    }[];
  }[];
  company: {
    logo_available: boolean;
    head_office_address: string | null;
    postcode: string | null;
    id: string;
    name: string;
    code: string;
    active: boolean;
    sector: string | null;
    registered_places: number | null;
    updated_at: string;
  };
  inspection: {
    id: string | null;
    version: number;
    etag: string;
    type: string | null;
    start: string | null;
    end: string | null;
    updated: string | null;
    by: string | null;
  };
  capabilities: Record<string, boolean>;
  meta: {
    company_id: string;
    as_of: string;
    timezone: string;
    request_id: string;
    filters: Record<string, number>;
    disclosure: string;
  };
};

export type InspectorClientRead = {
  id: string;
  version: number;
  name: string;
  reference: string;
  address: string;
  postcode: string;
  funding: 'Local authority' | 'Private' | 'NHS';
  priority: 'Standard' | 'High';
  active: boolean;
  updated_at: string;
  sections: Record<string, Record<string, string>>;
  risks: {
    id: string;
    name: string;
    detail: string;
    date: string;
    level: 'Low' | 'Medium' | 'High';
    status: 'Active';
  }[];
  instructions: {
    name: string;
    instructions: string;
    preferences: string;
    escalation: string;
    outcome: string;
    actions: string;
    client: string;
  }[];
  documents: {
    id: string;
    service_user_id: string;
    name: string;
    category: string;
    version: number;
    updated: string;
    expiry: string | null;
    content_type: string;
    size: number;
    owner: string | null;
    status: string;
  }[];
};

export type InspectorClientRiskRead = {
  id: string;
  name: string;
  detail: string;
  date: string;
  level: 'Low' | 'Medium' | 'High';
  status: 'Active';
};

export type InspectorCompanyRead = {
  id: string;
  name: string;
  code: string;
  trading_name: string | null;
  registration_number: string | null;
  sector: string | null;
  registered_places: number | null;
  date_established: string | null;
  country: string | null;
  region: string | null;
  active: boolean;
  updated_at: string;
  registered_address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    county: string | null;
    postcode: string | null;
    country: string | null;
  } | null;
  head_office_address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    county: string | null;
    postcode: string | null;
    country: string | null;
  } | null;
  contacts: {
    primary: {
      mainPhone: string | null;
      generalEmail: string | null;
      website: string | null;
      emergencyContact: string | null;
      outOfHoursNumber: string | null;
    };
    addresses: Record<
      string,
      {
        line1: string | null;
        line2: string | null;
        city: string | null;
        county: string | null;
        postcode: string | null;
        country: string | null;
      }
    >;
    keyContacts: {
      category: string;
      name: string;
      role: string | null;
      email: string | null;
      phone: string | null;
    }[];
  };
  compliance: {
    regulator_number: string | null;
    provider_type: string | null;
    registration_status: string | null;
    regulatory_region: string | null;
    inspection_type: string | null;
    data_protection_number: string | null;
    safeguarding_lead: string | null;
    medication_lead: string | null;
    insurance_expiry: string | null;
  };
  logo_available: boolean;
};

export type InspectorComplianceRead = {
  regulator_number: string | null;
  provider_type: string | null;
  registration_status: string | null;
  regulatory_region: string | null;
  inspection_type: string | null;
  data_protection_number: string | null;
  safeguarding_lead: string | null;
  medication_lead: string | null;
  insurance_expiry: string | null;
};

export type InspectorContactRead = {
  category: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
};

export type InspectorContactsRead = {
  primary: {
    mainPhone: string | null;
    generalEmail: string | null;
    website: string | null;
    emergencyContact: string | null;
    outOfHoursNumber: string | null;
  };
  addresses: Record<
    string,
    {
      line1: string | null;
      line2: string | null;
      city: string | null;
      county: string | null;
      postcode: string | null;
      country: string | null;
    }
  >;
  keyContacts: {
    category: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
  }[];
};

export type InspectorDetailsMutation = {
  id: string | null;
  version: number;
  etag: string;
  type: string | null;
  start: string | null;
  end: string | null;
  updated: string | null;
  by: string | null;
  company_id: string;
};

export type InspectorDetailsRead = {
  id: string | null;
  version: number;
  etag: string;
  type: string | null;
  start: string | null;
  end: string | null;
  updated: string | null;
  by: string | null;
};

export type InspectorDetailsWrite = {
  type: string;
  start: string | null;
  end: string | null;
};

export type InspectorDocumentContentQuery = {
  source_version: number;
};

export type InspectorDocumentMetadata = {
  name: string;
  category:
    | 'Policies'
    | 'Procedures'
    | 'Staffing Records'
    | 'Training Certificates'
    | 'Care Plan Samples'
    | 'MAR Records'
    | 'Audits'
    | 'Incident Records'
    | 'Contracts'
    | 'Insurance'
    | 'Business Continuity'
    | 'Data Protection';
  question: 'Safe' | 'Effective' | 'Caring' | 'Responsive' | 'Well-led';
  expiry?: string | null;
};

export type InspectorDocumentPack = {
  documents: {
    id: string;
    source_version: number;
  }[];
};

export type InspectorDocumentPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    version: string;
    source_version: number;
    name: string;
    filename: string;
    category: string;
    questions: ('Safe' | 'Effective' | 'Caring' | 'Responsive' | 'Well-led')[];
    owner: string;
    updated: string;
    expiry: string | null;
    status: string;
    source: string;
    state: string;
    content_type: string;
    size: number | null;
    downloadable: boolean;
  }[];
  company: {
    logo_available: boolean;
    head_office_address: string | null;
    postcode: string | null;
    id: string;
    name: string;
    code: string;
    active: boolean;
    sector: string | null;
    registered_places: number | null;
    updated_at: string;
  };
  inspection: {
    id: string | null;
    version: number;
    etag: string;
    type: string | null;
    start: string | null;
    end: string | null;
    updated: string | null;
    by: string | null;
  };
  capabilities: Record<string, boolean>;
  meta: {
    company_id: string;
    as_of: string;
    timezone: string;
    request_id: string;
    filters: Record<string, number>;
    disclosure: string;
    revision: string;
  };
};

export type InspectorDocumentRead = {
  id: string;
  version: string;
  source_version: number;
  name: string;
  filename: string;
  category: string;
  questions: ('Safe' | 'Effective' | 'Caring' | 'Responsive' | 'Well-led')[];
  owner: string;
  updated: string;
  expiry: string | null;
  status: string;
  source: string;
  state: string;
  content_type: string;
  size: number | null;
  downloadable: boolean;
};

export type InspectorDocumentReference = {
  id: string;
  source_version: number;
};

export type InspectorDocumentUpload = {
  file: string;
  metadata: {
    name: string;
    category:
      | 'Policies'
      | 'Procedures'
      | 'Staffing Records'
      | 'Training Certificates'
      | 'Care Plan Samples'
      | 'MAR Records'
      | 'Audits'
      | 'Incident Records'
      | 'Contracts'
      | 'Insurance'
      | 'Business Continuity'
      | 'Data Protection';
    question: 'Safe' | 'Effective' | 'Caring' | 'Responsive' | 'Well-led';
    expiry?: string | null;
  };
};

export type InspectorDocumentUploaded = {
  id: string;
  version: number;
  state: string;
};

export type InspectorEngagementPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    company_id: string;
    membership_id: string;
    starts_at: string;
    ends_at: string;
    revoked_at: string | null;
    reason: string;
    version: number;
    etag: string;
  }[];
  meta: Record<string, {}>;
};

export type InspectorEngagementQuery = {
  page?: number;
  page_size?: number;
};

export type InspectorEngagementRead = {
  id: string;
  company_id: string;
  membership_id: string;
  starts_at: string;
  ends_at: string;
  revoked_at: string | null;
  reason: string;
  version: number;
  etag: string;
};

export type InspectorEngagementWrite = {
  membership_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
};

export type InspectorEvidenceRead = {
  id: string;
  name: string;
  kind: string;
  content_type: string | null;
  size: number;
  owner: string | null;
  updated: string;
  expiry: string | null;
  version: number;
  scan_state: string;
};

export type InspectorFindingRead = {
  id: string;
  version: number;
  question: 'Safe' | 'Effective' | 'Caring' | 'Responsive' | 'Well-led';
  type: 'Strength' | 'Concern' | 'Required action';
  text: string;
  owner: string;
  due: string;
  status: 'Open' | 'In progress' | 'Completed';
  evidenceIds: string[];
  at: string;
  by: string;
};

export type InspectorFindingWrite = {
  question: 'Safe' | 'Effective' | 'Caring' | 'Responsive' | 'Well-led';
  type: 'Strength' | 'Concern' | 'Required action';
  text: string;
  owner: string;
  due: string | null;
  status: 'Open' | 'In progress' | 'Completed';
  evidenceIds: string[];
  evidenceVersions: Record<string, number>;
};

export type InspectorIncidentPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    source_id: string;
    source_type: 'care' | 'visit';
    version: number;
    name: string;
    detail: string;
    client: string;
    client_id: string;
    date: string;
    category: 'Incident' | 'Safeguarding';
    level: string | null;
    status: string;
    reviewed: boolean;
    updated_at: string;
  }[];
  findings: {
    id: string;
    version: number;
    question: 'Safe' | 'Effective' | 'Caring' | 'Responsive' | 'Well-led';
    type: 'Strength' | 'Concern' | 'Required action';
    text: string;
    owner: string;
    due: string;
    status: 'Open' | 'In progress' | 'Completed';
    evidenceIds: string[];
    at: string;
    by: string;
  }[];
  company: {
    logo_available: boolean;
    head_office_address: string | null;
    postcode: string | null;
    id: string;
    name: string;
    code: string;
    active: boolean;
    sector: string | null;
    registered_places: number | null;
    updated_at: string;
  };
  inspection: {
    id: string | null;
    version: number;
    etag: string;
    type: string | null;
    start: string | null;
    end: string | null;
    updated: string | null;
    by: string | null;
  };
  summary: {
    recorded: number;
    safeguarding: number;
    awaiting_review: number;
    reviewed: number;
    concerns: number;
    required_actions: number;
    completed_actions: number;
  };
  capabilities: Record<string, boolean>;
  meta: {
    company_id: string;
    as_of: string;
    timezone: string;
    request_id: string;
    filters: Record<string, number>;
    disclosure: string;
  };
};

export type InspectorIncidentRead = {
  id: string;
  source_id: string;
  source_type: 'care' | 'visit';
  version: number;
  name: string;
  detail: string;
  client: string;
  client_id: string;
  date: string;
  category: 'Incident' | 'Safeguarding';
  level: string | null;
  status: string;
  reviewed: boolean;
  updated_at: string;
};

export type InspectorIncidentSummary = {
  recorded: number;
  safeguarding: number;
  awaiting_review: number;
  reviewed: number;
  concerns: number;
  required_actions: number;
  completed_actions: number;
};

export type InspectorLocationRead = {
  id: string;
  name: string;
  type: string | null;
  registered_places: number | null;
  status: string;
};

export type InspectorMedicationAdministration = {
  id: string;
  version: number;
  medicationId: string;
  medication: string;
  date: string;
  time: string;
  outcome: string;
  reason: string;
  response: string;
  witness: string;
  by: string;
  at: string;
  doseUnits: string;
  correctionOf: string | null;
  superseded: boolean;
};

export type InspectorMedicationAdministrationDetail = {
  id: string;
  version: number;
  medicationId: string;
  medication: string;
  date: string;
  time: string;
  outcome: string;
  reason: string;
  response: string;
  witness: string;
  by: string;
  at: string;
  doseUnits: string;
  correctionOf: string | null;
  superseded: boolean;
  client: string;
  clientId: string;
};

export type InspectorMedicationClient = {
  id: string;
  name: string;
  prescriptions: {
    status: string;
    id: string;
    version: number;
    name: string;
    strength: string;
    dose: string;
    route: string;
    frequency: string;
    times: string[];
    start: string;
    end: string | null;
    controlled: boolean;
    discontinuedAt: string;
    indication: string;
    prescriber: string;
    pharmacy: string;
    stock: string | null;
    stockLocation: string;
    prnIndication: string;
    prnMax: string | null;
    notes: string;
  }[];
  administrations: {
    id: string;
    version: number;
    medicationId: string;
    medication: string;
    date: string;
    time: string;
    outcome: string;
    reason: string;
    response: string;
    witness: string;
    by: string;
    at: string;
    doseUnits: string;
    correctionOf: string | null;
    superseded: boolean;
  }[];
};

export type InspectorMedicationExportQuery = {
  q?: string;
  ordering?: 'name' | '-name';
  view?: 'Overview' | 'Controlled drugs' | 'PRN prescriptions' | 'Medication profiles';
  client?: string;
  start?: string;
  end?: string;
};

export type InspectorMedicationPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    name: string;
    prescriptions: {
      status: string;
      id: string;
      version: number;
      name: string;
      strength: string;
      dose: string;
      route: string;
      frequency: string;
      times: string[];
      start: string;
      end: string | null;
      controlled: boolean;
      discontinuedAt: string;
      indication: string;
      prescriber: string;
      pharmacy: string;
      stock: string | null;
      stockLocation: string;
      prnIndication: string;
      prnMax: string | null;
      notes: string;
    }[];
    administrations: {
      id: string;
      version: number;
      medicationId: string;
      medication: string;
      date: string;
      time: string;
      outcome: string;
      reason: string;
      response: string;
      witness: string;
      by: string;
      at: string;
      doseUnits: string;
      correctionOf: string | null;
      superseded: boolean;
    }[];
  }[];
  company: {
    logo_available: boolean;
    head_office_address: string | null;
    postcode: string | null;
    id: string;
    name: string;
    code: string;
    active: boolean;
    sector: string | null;
    registered_places: number | null;
    updated_at: string;
  };
  inspection: {
    id: string | null;
    version: number;
    etag: string;
    type: string | null;
    start: string | null;
    end: string | null;
    updated: string | null;
    by: string | null;
  };
  summary: {
    active_prescriptions: number;
    prescriptions: number;
    administrations: number;
  };
  capabilities: Record<string, boolean>;
  meta: {
    company_id: string;
    as_of: string;
    timezone: string;
    request_id: string;
    filters: Record<string, number>;
    disclosure: string;
  };
};

export type InspectorMedicationPrescription = {
  status: string;
  id: string;
  version: number;
  name: string;
  strength: string;
  dose: string;
  route: string;
  frequency: string;
  times: string[];
  start: string;
  end: string | null;
  controlled: boolean;
  discontinuedAt: string;
  indication: string;
  prescriber: string;
  pharmacy: string;
  stock: string | null;
  stockLocation: string;
  prnIndication: string;
  prnMax: string | null;
  notes: string;
};

export type InspectorMedicationPrescriptionDetail = {
  status: string;
  id: string;
  version: number;
  name: string;
  strength: string;
  dose: string;
  route: string;
  frequency: string;
  times: string[];
  start: string;
  end: string | null;
  controlled: boolean;
  discontinuedAt: string;
  indication: string;
  prescriber: string;
  pharmacy: string;
  stock: string | null;
  stockLocation: string;
  prnIndication: string;
  prnMax: string | null;
  notes: string;
  client: string;
  clientId: string;
};

export type InspectorMedicationSummary = {
  active_prescriptions: number;
  prescriptions: number;
  administrations: number;
};

export type InspectorPrimaryRead = {
  mainPhone: string | null;
  generalEmail: string | null;
  website: string | null;
  emergencyContact: string | null;
  outOfHoursNumber: string | null;
};

export type InspectorProviderMeta = {
  as_of: string;
  timezone: string;
  source: string;
};

export type InspectorProviderRead = {
  company_id: string;
  company: {
    id: string;
    name: string;
    code: string;
    trading_name: string | null;
    registration_number: string | null;
    sector: string | null;
    registered_places: number | null;
    date_established: string | null;
    country: string | null;
    region: string | null;
    active: boolean;
    updated_at: string;
    registered_address: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      county: string | null;
      postcode: string | null;
      country: string | null;
    } | null;
    head_office_address: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      county: string | null;
      postcode: string | null;
      country: string | null;
    } | null;
    contacts: {
      primary: {
        mainPhone: string | null;
        generalEmail: string | null;
        website: string | null;
        emergencyContact: string | null;
        outOfHoursNumber: string | null;
      };
      addresses: Record<
        string,
        {
          line1: string | null;
          line2: string | null;
          city: string | null;
          county: string | null;
          postcode: string | null;
          country: string | null;
        }
      >;
      keyContacts: {
        category: string;
        name: string;
        role: string | null;
        email: string | null;
        phone: string | null;
      }[];
    };
    compliance: {
      regulator_number: string | null;
      provider_type: string | null;
      registration_status: string | null;
      regulatory_region: string | null;
      inspection_type: string | null;
      data_protection_number: string | null;
      safeguarding_lead: string | null;
      medication_lead: string | null;
      insurance_expiry: string | null;
    };
    logo_available: boolean;
  };
  locations: {
    id: string;
    name: string;
    type: string | null;
    registered_places: number | null;
    status: string;
  }[];
  service_user_count: number;
  documents: {
    id: string;
    name: string;
    kind: string;
    content_type: string | null;
    size: number;
    owner: string | null;
    updated: string;
    expiry: string | null;
    version: number;
    scan_state: string;
  }[];
  inspection: {
    id: string | null;
    version: number;
    etag: string;
    type: string | null;
    start: string | null;
    end: string | null;
    updated: string | null;
    by: string | null;
  };
  capabilities: Record<string, boolean>;
  meta: {
    as_of: string;
    timezone: string;
    source: string;
  };
  request_id: string;
};

export type InspectorQualityAction = {
  id: string;
  version: number;
  assessment_id: string | null;
  title: string;
  owner_name: string;
  due: string;
  priority: 'Standard' | 'High';
  status: 'Open' | 'In progress' | 'Completed';
  resolution: string;
};

export type InspectorQualityAssessment = {
  id: string;
  version: number;
  template_code: string;
  title: string;
  subject_name: string | null;
  assessor_name: string | null;
  date: string;
  review_date: string | null;
  context: string;
  status: 'Draft' | 'Scheduled' | 'Submitted' | 'Signed off';
  answers: Record<string, string>;
  outcome: string;
  recommendations: string;
  signature: {
    name: string;
    role: string;
    at: string;
    declaration: boolean;
  } | null;
  evidence: {
    id: string;
    version: number;
    name: string;
    content_type: string;
    size: number;
    caption: string;
  }[];
  audit: {
    id: string;
    at: string;
    actor: string;
    action: string;
    detail: string;
  }[];
};

export type InspectorQualityAudit = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
};

export type InspectorQualityEvidence = {
  id: string;
  version: number;
  name: string;
  content_type: string;
  size: number;
  caption: string;
};

export type InspectorQualityMeta = {
  company_id: string;
  as_of: string;
  timezone: string;
  request_id: string;
  filters: Record<string, number>;
  disclosure: string;
  revision: string;
};

export type InspectorQualityPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    version: number;
    template_code: string;
    title: string;
    subject_name: string | null;
    assessor_name: string | null;
    date: string;
    review_date: string | null;
    context: string;
    status: 'Draft' | 'Scheduled' | 'Submitted' | 'Signed off';
    answers: Record<string, string>;
    outcome: string;
    recommendations: string;
    signature: {
      name: string;
      role: string;
      at: string;
      declaration: boolean;
    } | null;
    evidence: {
      id: string;
      version: number;
      name: string;
      content_type: string;
      size: number;
      caption: string;
    }[];
    audit: {
      id: string;
      at: string;
      actor: string;
      action: string;
      detail: string;
    }[];
  }[];
  actions: {
    id: string;
    version: number;
    assessment_id: string | null;
    title: string;
    owner_name: string;
    due: string;
    priority: 'Standard' | 'High';
    status: 'Open' | 'In progress' | 'Completed';
    resolution: string;
  }[];
  findings: {
    id: string;
    version: number;
    question: 'Safe' | 'Effective' | 'Caring' | 'Responsive' | 'Well-led';
    type: 'Strength' | 'Concern' | 'Required action';
    text: string;
    owner: string;
    due: string;
    status: 'Open' | 'In progress' | 'Completed';
    evidenceIds: string[];
    at: string;
    by: string;
  }[];
  company: {
    logo_available: boolean;
    head_office_address: string | null;
    postcode: string | null;
    id: string;
    name: string;
    code: string;
    active: boolean;
    sector: string | null;
    registered_places: number | null;
    updated_at: string;
  };
  inspection: {
    id: string | null;
    version: number;
    etag: string;
    type: string | null;
    start: string | null;
    end: string | null;
    updated: string | null;
    by: string | null;
  };
  summary: {
    assessments: number;
    signed_off: number;
    open_actions: number;
    clean_evidence: number;
    covered_questions: number;
  };
  preparation: {
    registration_recorded: boolean;
    findings_resolved: boolean | null;
  };
  capabilities: Record<string, boolean>;
  meta: {
    company_id: string;
    as_of: string;
    timezone: string;
    request_id: string;
    filters: Record<string, number>;
    disclosure: string;
    revision: string;
  };
};

export type InspectorQualityPreparation = {
  registration_recorded: boolean;
  findings_resolved: boolean | null;
};

export type InspectorQualitySignature = {
  name: string;
  role: string;
  at: string;
  declaration: boolean;
};

export type InspectorQualitySummary = {
  assessments: number;
  signed_off: number;
  open_actions: number;
  clean_evidence: number;
  covered_questions: number;
};

export type InspectorRevokeWrite = {
  reason: string;
};

export type InspectorSharedVisitNote = {
  id: string;
  version: number;
  visit_id: string | null;
  client_id: string;
  client: string;
  date: string;
  end_date: string;
  start: string;
  end: string;
  visit_type: string;
  carer: string;
  body: string;
  status: 'Completed' | 'Flagged';
};

export type InspectorStaffCheck = {
  code: string;
  id: string;
  title: string;
  status: string;
  current: boolean;
  completed: string | null;
  expiry: string | null;
  effective_state: string;
};

export type InspectorStaffDocument = {
  id: string;
  name: string;
  category: string;
  expiry: string | null;
  status: string;
  version: number;
  source: string;
};

export type InspectorStaffExportQuery = {
  q?: string;
  ordering?: 'name' | '-name';
};

export type InspectorStaffPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    person_id: string;
    version: number;
    name: string;
    role: string | null;
    location: string | null;
    reference: string | null;
    department: string | null;
    employment_type: string;
    status: string;
    checks: {
      code: string;
      id: string;
      title: string;
      status: string;
      current: boolean;
      completed: string | null;
      expiry: string | null;
      effective_state: string;
    }[];
    training: {
      id: string;
      course_id: string;
      course_version: number;
      completed_at: string | null;
      title: string;
      completed: string | null;
      expiry: string | null;
      current: boolean;
      competency: 'Not assessed' | 'Competent' | 'Needs development';
      source: 'HR' | 'Academy';
      certificate_id: string | null;
      status: string;
    }[];
    references: {
      id: string;
      name: string;
      organisation: string;
      status: string;
    }[];
    documents: {
      id: string;
      name: string;
      category: string;
      expiry: string | null;
      status: string;
      version: number;
      source: string;
    }[];
    updated_at: string;
  }[];
  company: {
    logo_available: boolean;
    head_office_address: string | null;
    postcode: string | null;
    id: string;
    name: string;
    code: string;
    active: boolean;
    sector: string | null;
    registered_places: number | null;
    updated_at: string;
  };
  inspection: {
    id: string | null;
    version: number;
    etag: string;
    type: string | null;
    start: string | null;
    end: string | null;
    updated: string | null;
    by: string | null;
  };
  summary: {
    total_staff: number;
    open_vacancies: number;
    verified_dbs: number;
    training_certificates: number;
    pipeline: Record<string, number>;
    training: {
      id: string;
      name: string;
      current: number;
      expired: number;
      missing: number;
      competent: number;
    }[];
  };
  capabilities: Record<string, boolean>;
  meta: {
    company_id: string;
    as_of: string;
    timezone: string;
    request_id: string;
    filters: Record<string, number>;
    disclosure: string;
  };
};

export type InspectorStaffRead = {
  id: string;
  person_id: string;
  version: number;
  name: string;
  role: string | null;
  location: string | null;
  reference: string | null;
  department: string | null;
  employment_type: string;
  status: string;
  checks: {
    code: string;
    id: string;
    title: string;
    status: string;
    current: boolean;
    completed: string | null;
    expiry: string | null;
    effective_state: string;
  }[];
  training: {
    id: string;
    course_id: string;
    course_version: number;
    completed_at: string | null;
    title: string;
    completed: string | null;
    expiry: string | null;
    current: boolean;
    competency: 'Not assessed' | 'Competent' | 'Needs development';
    source: 'HR' | 'Academy';
    certificate_id: string | null;
    status: string;
  }[];
  references: {
    id: string;
    name: string;
    organisation: string;
    status: string;
  }[];
  documents: {
    id: string;
    name: string;
    category: string;
    expiry: string | null;
    status: string;
    version: number;
    source: string;
  }[];
  updated_at: string;
};

export type InspectorStaffReference = {
  id: string;
  name: string;
  organisation: string;
  status: string;
};

export type InspectorStaffSummary = {
  total_staff: number;
  open_vacancies: number;
  verified_dbs: number;
  training_certificates: number;
  pipeline: Record<string, number>;
  training: {
    id: string;
    name: string;
    current: number;
    expired: number;
    missing: number;
    competent: number;
  }[];
};

export type InspectorStaffTraining = {
  id: string;
  course_id: string;
  course_version: number;
  completed_at: string | null;
  title: string;
  completed: string | null;
  expiry: string | null;
  current: boolean;
  competency: 'Not assessed' | 'Competent' | 'Needs development';
  source: 'HR' | 'Academy';
  certificate_id: string | null;
  status: string;
};

export type InspectorStaffTrainingSummary = {
  id: string;
  name: string;
  current: number;
  expired: number;
  missing: number;
  competent: number;
};

export type InspectorVisitAttendance = {
  id: string;
  carer: string;
  start: string;
  end: string | null;
  allocated: boolean;
};

export type InspectorVisitDay = {
  date: string;
  day: number;
  in_month: boolean;
  count: number;
  completed: number;
  issues: number;
};

export type InspectorVisitExportQuery = {
  q?: string;
  ordering?: 'name' | '-name';
  month?: string;
  day?: string;
};

export type InspectorVisitFilters = {
  page: number;
  page_size: number;
  month: string;
};

export type InspectorVisitMeta = {
  company_id: string;
  as_of: string;
  timezone: string;
  request_id: string;
  filters: {
    page: number;
    page_size: number;
    month: string;
  };
  disclosure: string;
  revision: string;
  month: string;
};

export type InspectorVisitPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    version: number;
    client_id: string;
    client_name: string;
    address: string;
    call_name: string;
    date: string;
    end_date: string;
    start: string;
    end: string;
    starts_at: string;
    ends_at: string;
    carers: number;
    tasks: string;
    allocation: string;
    staff: {
      id: string;
      name: string;
    }[];
    attendance: {
      id: string;
      carer: string;
      start: string;
      end: string | null;
      allocated: boolean;
    }[];
    status: 'Scheduled' | 'Completed' | 'In progress' | 'No attendance' | 'Unallocated';
  }[];
  notes: {
    id: string;
    version: number;
    visit_id: string | null;
    client_id: string;
    client: string;
    date: string;
    end_date: string;
    start: string;
    end: string;
    visit_type: string;
    carer: string;
    body: string;
    status: 'Completed' | 'Flagged';
  }[];
  summary: {
    published: number;
    completed: number;
    in_progress: number;
    no_attendance: number;
    unallocated: number;
  };
  calendar: {
    date: string;
    day: number;
    in_month: boolean;
    count: number;
    completed: number;
    issues: number;
  }[];
  company: {
    logo_available: boolean;
    head_office_address: string | null;
    postcode: string | null;
    id: string;
    name: string;
    code: string;
    active: boolean;
    sector: string | null;
    registered_places: number | null;
    updated_at: string;
  };
  inspection: {
    id: string | null;
    version: number;
    etag: string;
    type: string | null;
    start: string | null;
    end: string | null;
    updated: string | null;
    by: string | null;
  };
  capabilities: Record<string, boolean>;
  meta: {
    company_id: string;
    as_of: string;
    timezone: string;
    request_id: string;
    filters: {
      page: number;
      page_size: number;
      month: string;
    };
    disclosure: string;
    revision: string;
    month: string;
  };
};

export type InspectorVisitPerson = {
  id: string;
  name: string;
};

export type InspectorVisitQuery = {
  page?: number;
  page_size?: number;
  month?: string;
};

export type InspectorVisitRead = {
  id: string;
  version: number;
  client_id: string;
  client_name: string;
  address: string;
  call_name: string;
  date: string;
  end_date: string;
  start: string;
  end: string;
  starts_at: string;
  ends_at: string;
  carers: number;
  tasks: string;
  allocation: string;
  staff: {
    id: string;
    name: string;
  }[];
  attendance: {
    id: string;
    carer: string;
    start: string;
    end: string | null;
    allocated: boolean;
  }[];
  status: 'Scheduled' | 'Completed' | 'In progress' | 'No attendance' | 'Unallocated';
};

export type InspectorVisitSummary = {
  published: number;
  completed: number;
  in_progress: number;
  no_attendance: number;
  unallocated: number;
};
