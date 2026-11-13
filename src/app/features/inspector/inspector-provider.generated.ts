// Generated from the backend inspector provider OpenAPI contract.
export type InspectorError = {
  code: string;
  detail: string;
  field_errors: Record<string, unknown>;
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
  meta: Record<string, Record<string, unknown>>;
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

export type InspectorLocationRead = {
  id: string;
  name: string;
  type: string | null;
  registered_places: number | null;
  status: string;
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

export type InspectorRevokeWrite = {
  reason: string;
};
