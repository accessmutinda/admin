import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'ukDate' })
export class AcademyDate implements PipeTransform {
  transform(value: string | null | undefined, format = 'd MMM yyyy', _zone?: string): string {
    if (!value) return 'Not recorded';
    const date = new Date(value.length === 10 ? value + 'T12:00:00Z' : value);
    if (!Number.isFinite(date.getTime())) return 'Not recorded';
    if (/^HH:mm(?::ss)?$/.test(format))
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        timeStyle: format.includes('ss') ? 'medium' : 'short',
      }).format(date);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      dateStyle: 'medium',
      ...(format.includes('HH')
        ? { timeStyle: format.includes('ss') ? ('medium' as const) : ('short' as const) }
        : {}),
    }).format(date);
  }
}
