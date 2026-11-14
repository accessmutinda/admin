import { Pipe, PipeTransform } from '@angular/core';

type DateStyle = 'date' | 'time' | 'datetime' | 'short';
function dateValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const result = new Date(value);
  if (!Number.isFinite(result.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && result.toISOString().slice(0, 10) !== value) return null;
  return result;
}
export function companyDateKey(value: string, zone = 'UTC'): string {
  const date = dateValue(value);
  if (!date) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const field = (key: string) => parts.find((part) => part.type === key)?.value ?? '';
    return `${field('year')}-${field('month')}-${field('day')}`;
  } catch {
    return '';
  }
}

@Pipe({ name: 'companyDate' })
export class CompanyDatePipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    zone: string | null | undefined,
    style: DateStyle = 'datetime',
  ): string {
    const date = dateValue(value);
    if (!date) return 'Not recorded';
    const calendar = /^\d{4}-\d{2}-\d{2}$/.test(value!);
    const options: Intl.DateTimeFormatOptions =
      style === 'time'
        ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
        : {
            day: 'numeric',
            month: 'short',
            ...(style === 'short' ? {} : { year: 'numeric' }),
            ...(style === 'date' ? {} : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
          };
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: calendar ? 'UTC' : zone || 'UTC',
        ...options,
      }).format(date);
    } catch {
      return 'Not recorded';
    }
  }
}
