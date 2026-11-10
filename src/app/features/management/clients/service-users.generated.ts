// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

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
