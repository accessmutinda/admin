import type { Company } from '../shared/management.store';

export const PROVIDER_TYPES = [
  'Independent Provider',
  'Local Authority',
  'NHS Provider',
  'Charity / Voluntary Provider',
  'Other',
];
export const REGISTRATION_STATUSES = [
  'Registered',
  'Application in Progress',
  'Suspended',
  'Cancelled',
  'Not Registered',
];
export const INSPECTION_TYPES = [
  'Full Inspection',
  'Focused Inspection',
  'Targeted Inspection',
  'Not Yet Inspected',
];
export const COMPLIANCE_DOCUMENTS = [
  { key: 'registration', name: 'Registration Certificate' },
  { key: 'insurance', name: 'Insurance Certificate' },
  { key: 'dataProtection', name: 'Data Protection Policy' },
  { key: 'continuity', name: 'Business Continuity Plan' },
] as const;
export type ComplianceDocumentKey = (typeof COMPLIANCE_DOCUMENTS)[number]['key'];
export interface ComplianceDocument {
  name: string;
  type: string;
  size: number;
  content: string;
  uploadedAt: string;
  uploadedBy: string;
  owner: string;
  expiry: string;
}
export interface CompanyCompliance {
  cqcNumber: string;
  taxNumber: string;
  providerType: string;
  registrationStatus: string;
  inspectionType: string;
  insuranceExpiry: string;
  regulatoryRegion: string;
  dataProtectionNumber: string;
  safeguardingLead: string;
  medicationLead: string;
  reminders: boolean;
  documents: Partial<Record<ComplianceDocumentKey, ComplianceDocument>>;
}
export function emptyCompliance(company?: Company): CompanyCompliance {
  return structuredClone(
    company?.compliance ?? {
      cqcNumber: '',
      taxNumber: '',
      providerType: '',
      registrationStatus: '',
      inspectionType: '',
      insuranceExpiry: '',
      regulatoryRegion: '',
      dataProtectionNumber: '',
      safeguardingLead: '',
      medicationLead: '',
      reminders: false,
      documents: {},
    },
  );
}
export function todayUk(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function daysUntil(value: string, today = todayUk()): number | null {
  return validDate(value) ? Math.round((Date.parse(value) - Date.parse(today)) / 86400000) : null;
}
export function complianceErrors(
  value: CompanyCompliance,
  companyNumber: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of [
    'cqcNumber',
    'providerType',
    'registrationStatus',
    'insuranceExpiry',
    'regulatoryRegion',
    'dataProtectionNumber',
    'safeguardingLead',
    'medicationLead',
  ] as const) {
    if (!value[key].trim()) errors[key] = 'This field is required.';
  }
  if (!companyNumber.trim())
    errors['companyNumber'] = 'Add the company number in General Information.';
  for (const key of [
    'cqcNumber',
    'taxNumber',
    'regulatoryRegion',
    'dataProtectionNumber',
    'safeguardingLead',
    'medicationLead',
  ] as const) {
    if (value[key].length > 150) errors[key] = 'Use 150 characters or fewer.';
  }
  if (value.providerType && !PROVIDER_TYPES.includes(value.providerType))
    errors['providerType'] = 'Select a listed provider type.';
  if (value.registrationStatus && !REGISTRATION_STATUSES.includes(value.registrationStatus))
    errors['registrationStatus'] = 'Select a listed status.';
  if (value.inspectionType && !INSPECTION_TYPES.includes(value.inspectionType))
    errors['inspectionType'] = 'Select a listed inspection type.';
  if (value.insuranceExpiry && !validDate(value.insuranceExpiry))
    errors['insuranceExpiry'] = 'Enter a valid date.';
  for (const { key } of COMPLIANCE_DOCUMENTS) {
    const document = value.documents[key];
    if (!document) continue;
    if (document.owner.length > 150) errors[key] = 'Owner must be 150 characters or fewer.';
    if (document.expiry && !validDate(document.expiry))
      errors[key] = 'Enter a valid document expiry date.';
  }
  return errors;
}
export function complianceChecks(
  value: CompanyCompliance,
  companyNumber: string,
  today = todayUk(),
) {
  const count = COMPLIANCE_DOCUMENTS.filter(({ key }) => !!value.documents[key]).length;
  const insuranceDays = daysUntil(value.insuranceExpiry, today);
  return [
    {
      key: 'details',
      title: 'Registration details recorded',
      complete: !Object.keys(complianceErrors(value, companyNumber)).length,
      detail: 'Required company and provider details',
      target: 'rc-registration',
    },
    {
      key: 'insurance',
      title: 'Insurance evidence current',
      complete:
        !!value.documents.insurance &&
        insuranceDays !== null &&
        insuranceDays >= 0 &&
        (!value.documents.insurance.expiry ||
          (daysUntil(value.documents.insurance.expiry, today) ?? -1) >= 0),
      detail: 'Certificate uploaded and recorded expiry current',
      target: 'rc-document-insurance',
    },
    {
      key: 'documents',
      title: 'Supporting documents current',
      complete:
        count === COMPLIANCE_DOCUMENTS.length &&
        COMPLIANCE_DOCUMENTS.every(
          ({ key }) =>
            !value.documents[key]?.expiry ||
            (daysUntil(value.documents[key]!.expiry, today) ?? -1) >= 0,
        ),
      detail: `${count}/${COMPLIANCE_DOCUMENTS.length} documents uploaded`,
      target: 'rc-mapping',
    },
    {
      key: 'owners',
      title: 'Responsible owners assigned',
      complete:
        !!value.safeguardingLead.trim() &&
        !!value.medicationLead.trim() &&
        COMPLIANCE_DOCUMENTS.every(({ key }) => !!value.documents[key]?.owner.trim()),
      detail: 'Two leads and an owner for each document',
      target: 'rc-mapping',
    },
    {
      key: 'reminders',
      title: 'Renewal tracking enabled',
      complete: value.reminders,
      detail: 'Shows upcoming renewals on this page',
      target: 'rc-reminders',
    },
  ];
}
export function complianceComplete(company: Company | undefined): boolean {
  return (
    !!company?.compliance &&
    complianceChecks(company.compliance, company.registration).every((check) => check.complete)
  );
}
export function complianceFileError(file: Pick<File, 'name' | 'size' | 'type'>): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowed: Record<string, string[]> = {
    pdf: ['', 'application/pdf'],
    docx: ['', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  };
  if (!extension || !allowed[extension]?.includes(file.type)) return 'Choose a PDF or DOCX file.';
  if (!file.size || file.size > 10 * 1024 * 1024) return 'Choose a nonempty file up to 10MB.';
  return '';
}
