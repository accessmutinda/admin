// Generated from the family sharing OpenAPI contract.

export type FamilyAccessPage = {
  company_id: string;
  service_user_id: string;
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    company_id: string;
    service_user_id: string;
    version: number;
    etag: string;
    name: string;
    email: string;
    relationship: string;
    status: string;
    scopes: string[];
    at: string;
  }[];
  meta: Record<string, string>;
};

export type FamilyAccessRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  version: number;
  etag: string;
  name: string;
  email: string;
  relationship: string;
  status: string;
  scopes: string[];
  at: string;
};

export type FamilyAccessWrite = {
  name: string;
  email: string;
  relationship: string;
  status: 'Pending' | 'Active' | 'Revoked';
  scopes: (
    | 'Care plan'
    | 'Medication'
    | 'Visits'
    | 'Notes'
    | 'Invoices'
    | 'Messages'
    | 'Documents'
    | 'Photos'
  )[];
};

export type FamilyChoiceRead = {
  clientId: string;
  accessId: string;
  name: string;
  contact: string;
  preview: boolean;
};

export type FamilyChoicesRead = {
  company_id: string;
  companyName: string;
  results: {
    clientId: string;
    accessId: string;
    name: string;
    contact: string;
    preview: boolean;
  }[];
};

export type FamilyInvoiceData = {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  state: string;
  currency: string;
  total: string;
  paid: string;
  balance: string;
  lines: {
    id: string;
    date: string;
    call: string;
    amount: string;
  }[];
};

export type FamilyInvoiceLine = {
  id: string;
  date: string;
  call: string;
  amount: string;
};

export type FamilyInvoiceSource = {
  kind: string;
  invoiceId: string | null;
  name: string;
  sourceDigest: string;
  eligible: boolean;
  data: {
    id: string;
    number: string;
    date: string;
    dueDate: string;
    state: string;
    currency: string;
    total: string;
    paid: string;
    balance: string;
    lines: {
      id: string;
      date: string;
      call: string;
      amount: string;
    }[];
  };
  customer: string;
};

export type FamilyMessagePage = {
  company_id: string;
  service_user_id: string;
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    company_id: string;
    service_user_id: string;
    version: number;
    etag: string;
    text: string;
    by: string;
    at: string;
    accessId: string;
    fromFamily: boolean;
  }[];
  meta: Record<string, string>;
};

export type FamilyMessageRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  version: number;
  etag: string;
  text: string;
  by: string;
  at: string;
  accessId: string;
  fromFamily: boolean;
};

export type FamilyMessageWrite = {
  accessId: string;
  text: string;
};

export type FamilyPage = {
  company_id: string;
  service_user_id: string;
  count: number;
  next: number | null;
  previous: number | null;
  results: Record<string, string>[];
  meta: Record<string, string>;
};

export type FamilyPermissionWrite = {
  scope:
    | 'Care plan'
    | 'Medication'
    | 'Visits'
    | 'Notes'
    | 'Invoices'
    | 'Messages'
    | 'Documents'
    | 'Photos';
  enabled: boolean;
};

export type FamilyPlanData = {
  details: {
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
};

export type FamilyPlanSource = {
  kind: string;
  invoiceId: string | null;
  name: string;
  sourceDigest: string;
  eligible: boolean;
  data: {
    details: {
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
  };
};

export type FamilyPortalQuery = {
  preview?: boolean;
  page?:
    | 'overview'
    | 'visits'
    | 'care-plan'
    | 'notes'
    | 'medication'
    | 'documents'
    | 'messages'
    | 'photos'
    | 'invoices'
    | 'permissions'
    | 'support';
};

export type FamilyPortalRead = {
  profilePhoto: boolean;
  company_id: string;
  service_user_id: string;
  access: {
    id: string;
    company_id: string;
    service_user_id: string;
    version: number;
    etag: string;
    name: string;
    email: string;
    relationship: string;
    status: string;
    scopes: string[];
    at: string;
  };
  name: string;
  photoConsent: boolean;
  profile: {
    dob: string;
    postcode: string;
    photo: string;
  };
  notes: string | null;
  plan: {
    details: {
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
    structured: boolean;
    partialDemo: boolean;
    sections: {
      name: string;
      instructions: string;
      preferences: string;
      actions: string;
      outcome: string;
      escalation: string;
    }[];
  } | null;
  visits:
    | {
        id: string;
        date: string;
        start: string;
        end: string;
        callName: string;
        completed: boolean;
        carers: string[];
        location: string;
        attendance: {
          name: string;
          start: string;
          end: string;
          duration: number | null;
        }[];
      }[]
    | null;
  medication:
    | {
        id: string;
        name: string;
        strength: string;
        dose: string;
        route: string;
        frequency: string;
        support: string;
        controlled: boolean;
        times: string[];
        start: string;
        end: string;
        discontinuedAt: string;
      }[]
    | null;
  administrations:
    | {
        id: string;
        date: string;
        time: string;
        outcome: string;
        by: string;
        medication: string;
      }[]
    | null;
  allergies:
    | {
        id: string;
        name: string;
        detail: string;
        status: string;
      }[]
    | null;
  updates:
    | {
        id: string;
        company_id: string;
        service_user_id: string;
        version: number;
        etag: string;
        date: string;
        category: string;
        text: string;
        by: string;
        at: string;
      }[]
    | null;
  visitNotes:
    | {
        id: string;
        date: string;
        start: string;
        end: string;
        visitType: string;
        body: string;
        status: string;
        carer: string;
      }[]
    | null;
  documents:
    | {
        id: string;
        name: string;
        category: string;
        version: string;
        size: number;
        at: string;
        mime: string;
        data: string;
      }[]
    | null;
  photos:
    | {
        id: string;
        name: string;
        category: string;
        version: string;
        size: number;
        at: string;
        mime: string;
        data: string;
      }[]
    | null;
  invoices:
    | {
        id: string;
        number: string;
        date: string;
        dueDate: string;
        state: string;
        currency: string;
        total: string;
        paid: string;
        balance: string;
        lines: {
          id: string;
          date: string;
          call: string;
          amount: string;
        }[];
      }[]
    | null;
  messages:
    | {
        id: string;
        company_id: string;
        service_user_id: string;
        version: number;
        etag: string;
        text: string;
        by: string;
        at: string;
        accessId: string;
        fromFamily: boolean;
      }[]
    | null;
  unavailable: Record<string, string>;
};

export type FamilyPublicationOptions = {
  company_id: string;
  service_user_id: string;
  plan: {
    kind: string;
    invoiceId: string | null;
    name: string;
    sourceDigest: string;
    eligible: boolean;
    data: {
      details: {
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
    };
  } | null;
  invoices: {
    kind: string;
    invoiceId: string | null;
    name: string;
    sourceDigest: string;
    eligible: boolean;
    data: {
      id: string;
      number: string;
      date: string;
      dueDate: string;
      state: string;
      currency: string;
      total: string;
      paid: string;
      balance: string;
      lines: {
        id: string;
        date: string;
        call: string;
        amount: string;
      }[];
    };
    customer: string;
  }[];
  publications: {
    id: string;
    company_id: string;
    service_user_id: string;
    version: number;
    etag: string;
    kind: string;
    invoiceId: string | null;
    sourceDigest: string;
    reason: string;
    at: string;
    by: string;
  }[];
  canPublishPlan: boolean;
  canPublishInvoices: boolean;
};

export type FamilyPublicationRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  version: number;
  etag: string;
  kind: string;
  invoiceId: string | null;
  sourceDigest: string;
  reason: string;
  at: string;
  by: string;
};

export type FamilyPublicationWrite = {
  kind: 'plan' | 'invoice';
  invoiceId: string | null;
  sourceDigest: string;
  reason: string;
};

export type FamilyQuery = {
  page?: number;
  page_size?: number;
  access_id?: string;
};

export type FamilyReason = {
  reason: string;
};

export type FamilySharedAdministration = {
  id: string;
  date: string;
  time: string;
  outcome: string;
  by: string;
  medication: string;
};

export type FamilySharedAllergy = {
  id: string;
  name: string;
  detail: string;
  status: string;
};

export type FamilySharedAttendance = {
  name: string;
  start: string;
  end: string;
  duration: number | null;
};

export type FamilySharedDocument = {
  id: string;
  name: string;
  category: string;
  version: string;
  size: number;
  at: string;
  mime: string;
  data: string;
};

export type FamilySharedMedication = {
  id: string;
  name: string;
  strength: string;
  dose: string;
  route: string;
  frequency: string;
  support: string;
  controlled: boolean;
  times: string[];
  start: string;
  end: string;
  discontinuedAt: string;
};

export type FamilySharedPlan = {
  details: {
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
  structured: boolean;
  partialDemo: boolean;
  sections: {
    name: string;
    instructions: string;
    preferences: string;
    actions: string;
    outcome: string;
    escalation: string;
  }[];
};

export type FamilySharedPlanSection = {
  name: string;
  instructions: string;
  preferences: string;
  actions: string;
  outcome: string;
  escalation: string;
};

export type FamilySharedProfile = {
  dob: string;
  postcode: string;
  photo: string;
};

export type FamilySharedVisit = {
  id: string;
  date: string;
  start: string;
  end: string;
  callName: string;
  completed: boolean;
  carers: string[];
  location: string;
  attendance: {
    name: string;
    start: string;
    end: string;
    duration: number | null;
  }[];
};

export type FamilySharedVisitNote = {
  id: string;
  date: string;
  start: string;
  end: string;
  visitType: string;
  body: string;
  status: string;
  carer: string;
};

export type FamilyUpdatePage = {
  company_id: string;
  service_user_id: string;
  count: number;
  next: number | null;
  previous: number | null;
  results: {
    id: string;
    company_id: string;
    service_user_id: string;
    version: number;
    etag: string;
    date: string;
    category: string;
    text: string;
    by: string;
    at: string;
  }[];
  meta: Record<string, string>;
};

export type FamilyUpdateRead = {
  id: string;
  company_id: string;
  service_user_id: string;
  version: number;
  etag: string;
  date: string;
  category: string;
  text: string;
  by: string;
  at: string;
};

export type FamilyUpdateWrite = {
  date: string;
  category: 'Wellbeing' | 'Medication' | 'Personal care' | 'Meals & fluids' | 'General';
  text: string;
};

export type FamilyVisitsExportRead = {
  company_id: string;
  service_user_id: string;
  visits: {
    id: string;
    date: string;
    start: string;
    end: string;
    callName: string;
    completed: boolean;
    carers: string[];
    location: string;
    attendance: {
      name: string;
      start: string;
      end: string;
      duration: number | null;
    }[];
  }[];
};

export type FamilyWorkspaceRead = {
  company_id: string;
  service_user_id: string;
  consent: string;
  today: string;
};
