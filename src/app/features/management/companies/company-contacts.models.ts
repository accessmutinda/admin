export interface CompanyAddress {
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}
export type AddressKind = 'registered' | 'headOffice' | 'billing';
export interface CompanyKeyContact {
  id: string;
  category: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  active: boolean;
}
export interface CompanyContacts {
  addresses: Record<AddressKind, CompanyAddress>;
  billingSameAsRegistered: boolean;
  primary: {
    mainPhone: string;
    secondaryPhone: string;
    generalEmail: string;
    billingEmail: string;
    website: string;
    emergencyContact: string;
    outOfHoursNumber: string;
  };
  keyContacts: CompanyKeyContact[];
  addressChecks: Partial<Record<AddressKind, { signature: string; checkedAt: string }>>;
}
export const CONTACT_CATEGORIES = [
  { name: 'Registered Manager', icon: 'person', color: '#009c53' },
  { name: 'Nominated Individual', icon: 'person', color: '#008afa' },
  { name: 'Finance Contact', icon: 'badge', color: '#f59e0b' },
  { name: 'Compliance Contact', icon: 'person', color: '#8b19cb' },
  { name: 'IT/System Contact', icon: 'person', color: '#008d9f' },
];
export function emptyCompanyContacts(company: {
  headOfficeAddress?: string;
  postcode?: string;
  contacts?: CompanyContacts;
}): CompanyContacts {
  if (company.contacts) return structuredClone(company.contacts);
  const address = (): CompanyAddress => ({
    line1: '',
    line2: '',
    city: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
  });
  return {
    addresses: {
      registered: address(),
      headOffice: {
        ...address(),
        line1: company.headOfficeAddress ?? '',
        postcode: company.postcode ?? '',
      },
      billing: address(),
    },
    billingSameAsRegistered: false,
    primary: {
      mainPhone: '',
      secondaryPhone: '',
      generalEmail: '',
      billingEmail: '',
      website: '',
      emergencyContact: '',
      outOfHoursNumber: '',
    },
    keyContacts: [],
    addressChecks: {},
  };
}
export function effectiveAddress(data: CompanyContacts, kind: AddressKind): CompanyAddress {
  return data.addresses[kind === 'billing' && data.billingSameAsRegistered ? 'registered' : kind];
}
export function addressSignature(address: CompanyAddress): string {
  return JSON.stringify(Object.values(address).map((v) => v.trim().toLowerCase()));
}
export function addressErrors(
  address: CompanyAddress,
): Partial<Record<keyof CompanyAddress, string>> {
  const errors: Partial<Record<keyof CompanyAddress, string>> = {};
  for (const key of ['line1', 'city', 'postcode', 'country'] as const)
    if (!address[key].trim()) errors[key] = 'This field is required.';
  if (
    address.country === 'United Kingdom' &&
    address.postcode.trim() &&
    !/^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i.test(address.postcode.trim())
  )
    errors.postcode = 'Enter a valid UK postcode.';
  return errors;
}
export function validContactEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
export function validContactPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return (
    value.trim().length <= 30 &&
    /^[+\d][\d\s().-]*$/.test(value.trim()) &&
    digits.length >= 7 &&
    digits.length <= 15
  );
}
export function primaryContactComplete(data: CompanyContacts): boolean {
  return validContactPhone(data.primary.mainPhone) && validContactEmail(data.primary.generalEmail);
}
export function completeKeyContact(contact: CompanyKeyContact): boolean {
  return (
    !!contact.name.trim() &&
    !!contact.role.trim() &&
    validContactEmail(contact.email) &&
    validContactPhone(contact.phone) &&
    contact.active
  );
}
export function contactsCompletion(data: CompanyContacts): number {
  const checks = (['registered', 'headOffice', 'billing'] as const).flatMap((kind) => {
    const errors = addressErrors(effectiveAddress(data, kind));
    return (['line1', 'city', 'postcode', 'country'] as const).map((key) => !errors[key]);
  });
  checks.push(
    validContactPhone(data.primary.mainPhone),
    validContactEmail(data.primary.generalEmail),
  );
  checks.push(
    ...CONTACT_CATEGORIES.map((category) =>
      data.keyContacts.some((c) => c.category === category.name && completeKeyContact(c)),
    ),
  );
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
export function contactInformationComplete(
  company: { contacts?: CompanyContacts } | undefined,
): boolean {
  if (!company?.contacts) return false;
  return (
    primaryContactComplete(company.contacts) &&
    (['registered', 'headOffice', 'billing'] as const).every(
      (kind) => !Object.keys(addressErrors(effectiveAddress(company.contacts!, kind))).length,
    )
  );
}
