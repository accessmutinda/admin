import type { CompanyDetail } from './companies-api.models';
import type { Company } from '../shared/management.store';

export function companyProfileFields(detail: CompanyDetail): Partial<Company> {
  const address = detail.head_office_address;
  return {
    name: detail.name,
    code: detail.code,
    tradingName: detail.trading_name ?? '',
    sector: detail.service_type ?? '',
    description: detail.description ?? '',
    size: detail.staff_size_band ?? '',
    registration: detail.registration_number ?? '',
    country: detail.country ?? undefined,
    region: detail.region ?? undefined,
    establishedDate: detail.date_established ?? '',
    headOfficeName: detail.head_office_name ?? '',
    headOfficeAddress: address
      ? [address.line1, address.line2, address.city, address.county, address.country]
          .filter((value) => value?.trim())
          .join(', ')
      : '',
    postcode: address?.postcode ?? detail.postcode ?? '',
    registeredPlaces: detail.registered_places ?? null,
    primaryLanguage: detail.primary_language ?? '',
    tagline: detail.tagline ?? '',
    lifecycle: detail.lifecycle,
    active: detail.lifecycle === 'active',
    modules: detail.enabled_modules ?? [],
    modifiedAt: detail.updated_at ?? undefined,
    modifiedBy: detail.updated_by?.name ?? undefined,
    profileCompletion: detail.profile_completion_percent ?? null,
    setupProgress: detail.setup_progress,
  };
}

export function companyCompletion(company: Company): number | null {
  if (company.apiSummaryOnly) return company.profileCompletion ?? null;
  const fields = [
    company.name,
    company.code,
    company.registration,
    company.postcode,
    company.sector,
    company.size,
    company.logo,
    company.modules.length,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function generalInformationComplete(company: Company | undefined): boolean {
  if (!company) return false;
  return (
    [
      company.name,
      company.code,
      company.sector,
      company.description,
      company.registration,
      company.establishedDate,
      company.headOfficeName,
      company.primaryLanguage,
    ].every((value) => !!value?.trim()) &&
    Number.isInteger(company.registeredPlaces) &&
    Number(company.registeredPlaces) >= 0
  );
}

export function companyModifiedAt(value: string | undefined): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(date);
}
