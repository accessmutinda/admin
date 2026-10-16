import type { Company } from '../shared/management.store';

export function companyCompletion(company: Company): number {
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
