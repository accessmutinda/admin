import type { Vacancy } from '../shared/management.store';

export function validVacancyDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

function recruitmentDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function vacancyClosed(vacancy: Vacancy, now: Date): boolean {
  if (!vacancy.closingDate) return false;
  return !validVacancyDate(vacancy.closingDate) || vacancy.closingDate < recruitmentDate(now);
}

export function vacancyScheduled(vacancy: Vacancy, now: Date): boolean {
  if (!vacancy.goLiveDate) return false;
  return !validVacancyDate(vacancy.goLiveDate) || vacancy.goLiveDate > recruitmentDate(now);
}
