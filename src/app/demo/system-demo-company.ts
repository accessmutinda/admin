import type { Company, WorkspaceData } from '../features/management/shared/management.store';
import { emptyCompanyContacts } from '../features/management/companies/company-contacts.models';
import {
  emptyCompliance,
  COMPLIANCE_DOCUMENTS,
} from '../features/management/companies/company-compliance.models';
import { initialSubscription } from '../features/management/companies/company-modules.models';
import { addDays } from '../features/management/rota/rota.models';
import { appendDemo, demoAt, demoId, monthDate } from './system-demo-utils';

export function seedSystemCompany(company: Company, data: WorkspaceData, today: string): Company {
  const contacts = emptyCompanyContacts(company);
  const address = {
    line1: '24 Example Street',
    line2: 'Demo service office',
    city: 'London',
    county: 'Greater London',
    postcode: company.postcode || 'HA1 1AA',
    country: 'United Kingdom',
  };
  const addresses = { ...contacts.addresses };
  for (const key of ['registered', 'headOffice', 'billing'] as const)
    addresses[key] = {
      ...address,
      ...Object.fromEntries(Object.entries(addresses[key]).filter(([, value]) => value.trim())),
    } as typeof address;
  const primary = { ...contacts.primary };
  for (const [key, value] of Object.entries({
    mainPhone: '07700 900200',
    secondaryPhone: '07700 900201',
    generalEmail: 'office@example.test',
    billingEmail: 'finance@example.test',
    website: 'https://example.test',
    emergencyContact: 'Demo on-call coordinator',
    outOfHoursNumber: '07700 900202',
  })) {
    if (!primary[key as keyof typeof primary]) primary[key as keyof typeof primary] = value;
  }
  const compliance = emptyCompliance(company);
  const complianceDefaults = {
    cqcNumber: 'DEMO-REG-' + company.code,
    taxNumber: 'DEMO-TAX-001',
    providerType: 'Independent Provider',
    registrationStatus: 'Registered',
    inspectionType: 'Full Inspection',
    insuranceExpiry: addDays(today, 180),
    regulatoryRegion: 'England',
    dataProtectionNumber: 'DEMO-ICO-001',
    safeguardingLead: 'Demo safeguarding lead',
    medicationLead: 'Demo medication lead',
  };
  for (const [key, value] of Object.entries(complianceDefaults))
    if (!compliance[key as keyof typeof compliance]) Object.assign(compliance, { [key]: value });
  const source = data.rota?.clients[0]?.file?.documents?.[0];
  const documents = { ...compliance.documents };
  if (source)
    for (const document of COMPLIANCE_DOCUMENTS)
      documents[document.key] ??= {
        name: 'DEMO - ' + document.name + '.pdf',
        type: source.mime,
        size: source.size,
        content: source.data,
        uploadedAt: demoAt(today, -30),
        uploadedBy: 'Demo compliance coordinator',
        owner: 'Demo registered manager',
        expiry: addDays(today, 180),
      };
  const subscription = initialSubscription(company);
  return {
    ...company,
    description:
      company.description ||
      'Fictional demonstration provider showing connected care, workforce and quality workflows.',
    tradingName: company.tradingName || company.name,
    establishedDate: company.establishedDate || addDays(today, -1000),
    headOfficeName: company.headOfficeName || 'Demo central office',
    headOfficeAddress: company.headOfficeAddress || '24 Example Street, London',
    country: company.country || 'United Kingdom',
    region: company.region || 'Greater London',
    primaryLanguage: company.primaryLanguage || 'English',
    contacts: {
      ...contacts,
      addresses,
      primary,
      keyContacts: appendDemo(
        contacts.keyContacts,
        [
          'Registered Manager',
          'Nominated Individual',
          'Finance Contact',
          'Compliance Contact',
          'IT/System Contact',
        ].map((category, index) => ({
          id: demoId('company-contact-' + index),
          category,
          name: ['Sarah Mitchell', 'Daniel Foster', 'Laura Jenkins', 'Priya Nair', 'Michael Osei'][
            index
          ],
          role: category,
          email:
            ['manager', 'nominated', 'finance', 'compliance', 'systems'][index] + '@example.test',
          phone: '07700 90020' + index,
          active: true,
        })),
      ),
    },
    compliance: { ...compliance, documents },
    subscription: {
      ...subscription,
      plan: subscription.plan === 'Not recorded' ? 'Professional' : subscription.plan,
      status: subscription.status === 'Not recorded' ? 'Active' : subscription.status,
      cycle: subscription.cycle === 'Not recorded' ? 'Monthly' : subscription.cycle,
      renewalDate: subscription.renewalDate || addDays(today, 30),
      userLimit: subscription.userLimit ?? 100,
      storageLimitGb: subscription.storageLimitGb ?? 25,
      careRecordLimit: subscription.careRecordLimit ?? 500,
      support: subscription.support || 'Demo priority support',
      notes:
        subscription.notes ||
        'Fictional subscription and billing examples; no live payment method is connected.',
      invoices: appendDemo(
        subscription.invoices,
        [0, 1, 2].map((index) => ({
          id: demoId('subscription-invoice-' + index),
          reference: 'DEMO-SUB-' + (index + 1),
          date: monthDate(today, -index, 1),
          dueDate: monthDate(today, -index, 15),
          amount: 249,
          status: index === 0 ? 'Outstanding' : 'Paid',
          notes: 'Fictional monthly subscription invoice.',
        })),
      ),
    },
  };
}
