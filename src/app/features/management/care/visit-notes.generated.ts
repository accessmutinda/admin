// Generated from backend OpenAPI.

export type VisitNoteFileRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  name: string;
  mime: string;
  size: number;
  state: string;
  version: number;
  etag: string;
  uploadedAt: string;
  uploadedBy: string;
};

export type VisitNoteHistory = {
  company_id: string;
  service_user_id: string;
  revisions: {
    id: string;
    company_id: string;
    service_user_id: string;
    version: number;
    etag: string;
    visitId: string | null;
    date: string;
    start: string;
    end: string;
    carerId: string;
    carerName: string;
    durationMinutes: number;
    visitType: string;
    body: string;
    status: string;
    visibility: {
      staff: boolean;
      family: boolean;
      inspector: boolean;
    };
    attachments: {
      id: string;
      company_id: string;
      service_user_id: string;
      name: string;
      mime: string;
      size: number;
      state: string;
      version: number;
      etag: string;
      uploadedAt: string;
      uploadedBy: string;
    }[];
    createdAt: string;
    createdById: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
    deleted: boolean;
  }[];
};

export type VisitNoteOptions = {
  company_id: string;
  service_user_id: string;
  timezone: string;
  today: string;
  staff: {
    id: string;
    name: string;
  }[];
  carers: {
    id: string;
    name: string;
  }[];
  types: string[];
  visits: {
    id: string;
    date: string;
    start: string;
    end: string;
    callName: string;
    staffIds: string[];
  }[];
  visits_available: boolean;
};

export type VisitNotePage = {
  company_id: string;
  service_user_id: string;
  count: number;
  total: number;
  page: number;
  page_size: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    company_id: string;
    service_user_id: string;
    version: number;
    etag: string;
    visitId: string | null;
    date: string;
    start: string;
    end: string;
    carerId: string;
    carerName: string;
    durationMinutes: number;
    visitType: string;
    body: string;
    status: string;
    visibility: {
      staff: boolean;
      family: boolean;
      inspector: boolean;
    };
    attachments: {
      id: string;
      company_id: string;
      service_user_id: string;
      name: string;
      mime: string;
      size: number;
      state: string;
      version: number;
      etag: string;
      uploadedAt: string;
      uploadedBy: string;
    }[];
    createdAt: string;
    createdById: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
    deleted: boolean;
  }[];
};

export type VisitNoteQuery = {
  from_date?: string;
  to_date?: string;
  carer?: string;
  type?: string;
  page?: number;
  page_size?: number;
};

export type VisitNoteRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  version: number;
  etag: string;
  visitId: string | null;
  date: string;
  start: string;
  end: string;
  carerId: string;
  carerName: string;
  durationMinutes: number;
  visitType: string;
  body: string;
  status: string;
  visibility: {
    staff: boolean;
    family: boolean;
    inspector: boolean;
  };
  attachments: {
    id: string;
    company_id: string;
    service_user_id: string;
    name: string;
    mime: string;
    size: number;
    state: string;
    version: number;
    etag: string;
    uploadedAt: string;
    uploadedBy: string;
  }[];
  createdAt: string;
  createdById: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deleted: boolean;
};

export type VisitNoteReason = {
  reason: string;
};

export type VisitNoteSharing = {
  audience: 'staff' | 'family' | 'inspector';
  value: boolean;
  reason: string;
};

export type VisitNoteStaff = {
  id: string;
  name: string;
};

export type VisitNoteUpload = {
  file: string;
};

export type VisitNoteVisibility = {
  staff: boolean;
  family: boolean;
  inspector: boolean;
};

export type VisitNoteVisit = {
  id: string;
  date: string;
  start: string;
  end: string;
  callName: string;
  staffIds: string[];
};

export type VisitNoteWrite = {
  visitId: string | null;
  date: string;
  start: string;
  end: string;
  carerId: string;
  visitType: string;
  body: string;
  status: 'Completed' | 'Flagged';
  visibility: {
    staff: boolean;
    family: boolean;
    inspector: boolean;
  };
  attachment_ids: string[];
  reason: string;
};
