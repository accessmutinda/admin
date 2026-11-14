import type { CompanyDetail } from './companies-api.models';
import type { Company } from '../shared/management.store';

export interface CompanyProfileUpdate {
  name: string;
  trading_name: string;
  code: string;
  service_type: string;
  description: string | null;
  staff_size_band: string | null;
  registration_number: string | null;
  head_office_name: string | null;
  registered_places: number | null;
  primary_language: string | null;
  date_established: string | null;
}

export function companyProfileUpdate(company: Company): CompanyProfileUpdate {
  const text = (value: string | undefined) => {
    const trimmed = value?.trim() ?? '';
    return trimmed || null;
  };
  return {
    name: company.name.trim(),
    trading_name: company.tradingName?.trim() ?? '',
    code: company.code.trim(),
    service_type: company.sector.trim(),
    description: text(company.description),
    staff_size_band: text(company.size),
    registration_number: text(company.registration),
    head_office_name: text(company.headOfficeName),
    registered_places: wholePlaces(company.registeredPlaces),
    primary_language: text(company.primaryLanguage),
    date_established: text(company.establishedDate),
  };
}

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
    registeredPlaces: wholePlaces(detail.registered_places),
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
    ].every((value) => !!value?.trim()) && wholePlaces(company.registeredPlaces) != null
  );
}

export function wholePlaces(value: unknown): number | null {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  const places = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isInteger(places) && places >= 0 ? places : null;
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
