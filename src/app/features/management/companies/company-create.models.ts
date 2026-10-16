import type { Company, WorkspaceData } from '../shared/management.store';
import { MODULES } from '../shared/management.store';
import { ROLES } from '../../../core/auth/models/role';
import { ROTA_ACTIONS } from '../rota/rota.models';
import { PAYROLL_ACTIONS } from '../payroll/payroll.models';
import {
  defaultCompanyBranding,
  BRANDING_FONTS,
  validBrandColor,
  validBrandUrl,
} from './company-branding.models';
import {
  CompanyContacts,
  emptyCompanyContacts,
  addressErrors,
  validContactEmail,
  validContactPhone,
} from './company-contacts.models';
import { emptyCompliance } from './company-compliance.models';
import { initialSubscription, SUBSCRIPTION_PLANS } from './company-modules.models';

export const CREATE_STEPS = [
  'Basic Details',
  'Registration',
  'Contacts',
  'Modules',
  'Review & Create',
];
export const CREATE_SECTORS = [
  'Domiciliary care',
  'Residential care',
  'Residential Care Home',
  'Supported living',
  'Dementia care',
  'Community care',
];
export const CREATE_SIZES = ['1–10 staff', '11–50 staff', '51–200 staff', '201+ staff'];
export const CREATE_REGIONS = ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Other'];
export const SETUP_WORKFLOWS: Record<string, string[]> = {
  'Care plans': ['Create', 'Manager review', 'Compliance approval'],
  Policies: ['Draft', 'Compliance review', 'Publish'],
  Incidents: ['Report', 'Manager review', 'Close'],
  Training: ['Assign', 'Complete', 'Manager verification'],
  Exports: ['Request', 'Administrator approval', 'Export'],
};
export type WorkspaceSetup = Pick<
  WorkspaceData,
  | 'permissions'
  | 'workflows'
  | 'backup'
  | 'rotaPermissions'
  | 'payrollPermissions'
  | 'workflowPreferences'
>;
export interface CompanyCreateDraft {
  company: Company;
  setup: WorkspaceSetup;
}
export function safeWorkspaceSetup(source?: WorkspaceSetup): WorkspaceSetup {
  const setup: WorkspaceSetup = {
    permissions: {},
    workflows: structuredClone(SETUP_WORKFLOWS),
    backup: source?.backup ?? true,
    rotaPermissions: {},
    payrollPermissions: {},
    workflowPreferences: {},
  };
  if (!source) return setup;
  for (const role of Object.values(ROLES)) {
    for (const module of MODULES) {
      const key = role.label + ':' + module;
      const values = source.permissions?.[key];
      if (
        Array.isArray(values) &&
        values.length === 5 &&
        values.every((v) => typeof v === 'boolean')
      )
        setup.permissions[key] = [...values];
    }
    const rota = source.rotaPermissions?.[role.label];
    if (rota)
      setup.rotaPermissions![role.label] = rota.filter((key) =>
        ROTA_ACTIONS.some((action) => action.key === key),
      );
    const payroll = source.payrollPermissions?.[role.label];
    if (payroll)
      setup.payrollPermissions![role.label] = payroll.filter((key) =>
        PAYROLL_ACTIONS.some((action) => action.key === key),
      );
  }
  for (const [key, defaults] of Object.entries(SETUP_WORKFLOWS)) {
    const stages = source.workflows?.[key]?.filter((stage) => defaults.includes(stage));
    if (stages?.length) setup.workflows[key] = [...new Set(stages)];
    const preference = source.workflowPreferences?.[key];
    if (preference)
      setup.workflowPreferences![key] = {
        notify: !!preference.notify,
        escalation:
          Number.isSafeInteger(preference.escalation) && preference.escalation >= 0
            ? preference.escalation
            : 0,
      };
  }
  return setup;
}
export function newCompanySetup(source?: Company, workspace?: WorkspaceData): CompanyCreateDraft {
  const company: Company = {
    id: crypto.randomUUID(),
    name: '',
    tradingName: '',
    code: '',
    sector: source && CREATE_SECTORS.includes(source.sector) ? source.sector : 'Domiciliary care',
    size: source && CREATE_SIZES.includes(source.size) ? source.size : '11–50 staff',
    registration: '',
    postcode: '',
    country: 'United Kingdom',
    region: '',
    color: source && validBrandColor(source.color) ? source.color : '#008afa',
    accent: source && validBrandColor(source.accent) ? source.accent : '#f59e0b',
    tagline: '',
    logo: '',
    modules: source
      ? [...new Set(source.modules.filter((module) => MODULES.includes(module)))]
      : ['Care delivery', 'People & HR', 'Training academy'],
    active: !source,
  };
  company.contacts = emptyCompanyContacts({});
  company.compliance = emptyCompliance();
  company.subscription = initialSubscription();
  company.subscription.plan = '';
  const subscription = source?.subscription;
  if (subscription) {
    if (SUBSCRIPTION_PLANS.includes(subscription.plan) && subscription.plan !== 'Not recorded')
      company.subscription.plan = subscription.plan;
    if (['Monthly', 'Annual'].includes(subscription.cycle))
      company.subscription.cycle = subscription.cycle;
    for (const key of ['userLimit', 'careRecordLimit', 'storageLimitGb'] as const) {
      const value = subscription[key];
      if (
        value !== null &&
        Number.isFinite(value) &&
        value > 0 &&
        (key === 'storageLimitGb' || Number.isSafeInteger(value))
      )
        company.subscription[key] = value;
    }
  }
  company.branding = defaultCompanyBranding('', '');
  const brand = company.branding;
  const original = source?.branding;
  brand.primaryColor =
    original && validBrandColor(original.primaryColor) ? original.primaryColor : company.color;
  brand.secondaryColor =
    original && validBrandColor(original.secondaryColor) ? original.secondaryColor : '#10b981';
  brand.accentColor =
    original && validBrandColor(original.accentColor) ? original.accentColor : company.accent;
  if (original) {
    if (BRANDING_FONTS.includes(original.fontFamily)) brand.fontFamily = original.fontFamily;
    brand.showPlatformBranding = original.showPlatformBranding;
    brand.document = {
      headerStyle: original.document.headerStyle === 'compact' ? 'compact' : 'standard',
      showLogo: original.document.showLogo,
      showAddress: original.document.showAddress,
      showTagline: original.document.showTagline,
      footer: '',
    };
    if (['English', 'Welsh', 'Scottish Gaelic', 'Irish'].includes(original.portal.language))
      brand.portal.language = original.portal.language;
    if (['Europe/London', 'Europe/Dublin', 'UTC'].includes(original.portal.timezone))
      brand.portal.timezone = original.portal.timezone;
    brand.portal.microsoftSignIn = original.portal.microsoftSignIn;
  }
  company.color = brand.primaryColor;
  company.accent = brand.accentColor;
  brand.welcomeMessage = '';
  brand.senderName = '';
  brand.document.footer = '';
  return { company, setup: safeWorkspaceSetup(workspace) };
}
export function companySetupErrors(company: Company, others: Company[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!company.name.trim()) errors['name'] = 'Enter the company name.';
  else if (company.name.trim().length > 150) errors['name'] = 'Use 150 characters or fewer.';
  if (!/^[a-z0-9][a-z0-9-]{2,19}$/i.test(company.code.trim()))
    errors['code'] = 'Use 3–20 letters, numbers or hyphens, starting with a letter or number.';
  else if (
    others.some(
      (other) =>
        other.id !== company.id &&
        other.code.trim().toLowerCase() === company.code.trim().toLowerCase(),
    )
  )
    errors['code'] = 'This company code is already in use.';
  if ((company.tradingName?.length ?? 0) > 150)
    errors['tradingName'] = 'Use 150 characters or fewer.';
  if (!CREATE_SECTORS.includes(company.sector)) errors['sector'] = 'Select a service type.';
  if (!CREATE_SIZES.includes(company.size)) errors['size'] = 'Select a company size.';
  if (!company.registration.trim() || company.registration.trim().length > 60)
    errors['registration'] = 'Enter the company registration number, up to 60 characters.';
  if (!company.country?.trim() || company.country.length > 100)
    errors['country'] = 'Enter the registration country, up to 100 characters.';
  if (!CREATE_REGIONS.includes(company.region ?? ''))
    errors['region'] = 'Select the operating region.';
  if (!SUBSCRIPTION_PLANS.slice(1).includes(company.subscription?.plan ?? ''))
    errors['plan'] = 'Select an initial subscription plan.';
  if ((company.compliance?.taxNumber.length ?? 0) > 150)
    errors['taxNumber'] = 'Use 150 characters or fewer.';
  const primary = company.contacts!.primary;
  if (!validContactEmail(primary.generalEmail) || primary.generalEmail.length > 254)
    errors['generalEmail'] = 'Enter a valid company email address.';
  if (!validContactPhone(primary.mainPhone))
    errors['mainPhone'] = 'Enter a valid phone number with 7–15 digits.';
  if (!validBrandUrl(primary.website) || primary.website.length > 500)
    errors['website'] = 'Enter a full http or https website address.';
  const address = company.contacts!.addresses.headOffice;
  const hasAddress = ['line1', 'line2', 'city', 'county', 'postcode'].some(
    (key) => !!address[key as keyof typeof address].trim(),
  );
  if (hasAddress)
    for (const [key, value] of Object.entries(addressErrors(address)))
      errors['address.' + key] = value;
  for (const [key, value] of Object.entries(address))
    if (value.length > 150) errors['address.' + key] = 'Use 150 characters or fewer.';
  if (!company.modules.length || company.modules.some((module) => !MODULES.includes(module)))
    errors['modules'] = 'Select at least one available module.';
  return errors;
}
export const STEP_FIELDS = [
  ['name', 'tradingName', 'code', 'sector', 'size', 'plan'],
  ['registration', 'taxNumber', 'country', 'region'],
  [
    'generalEmail',
    'mainPhone',
    'website',
    'address.line1',
    'address.line2',
    'address.city',
    'address.county',
    'address.postcode',
    'address.country',
  ],
  ['modules'],
];
export function prepareCreatedCompany(draft: Company): Company {
  const company = structuredClone(draft);
  for (const key of [
    'name',
    'code',
    'sector',
    'size',
    'registration',
    'country',
    'region',
    'tradingName',
  ] as const)
    if (typeof company[key] === 'string') company[key] = company[key]!.trim();
  for (const key of Object.keys(company.contacts!.primary) as (keyof CompanyContacts['primary'])[])
    company.contacts!.primary[key] = company.contacts!.primary[key].trim();
  const address = company.contacts!.addresses.headOffice;
  for (const key of Object.keys(address) as (keyof typeof address)[])
    address[key] = address[key].trim();
  company.postcode = address.postcode;
  company.headOfficeAddress = [address.line1, address.line2, address.city, address.county]
    .filter(Boolean)
    .join(', ');
  company.compliance!.taxNumber = company.compliance!.taxNumber.trim();
  const brand = company.branding!;
  const defaults = defaultCompanyBranding(company.name, company.code);
  brand.subdomain = defaults.subdomain;
  brand.senderName = defaults.senderName;
  brand.welcomeMessage = defaults.welcomeMessage;
  brand.document.footer = defaults.document.footer;
  return company;
}
