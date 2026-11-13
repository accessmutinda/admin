import { CompanyDatePipe, companyDateKey } from './company-date.pipe';

describe('Company dates across portal screens', () => {
  const pipe = new CompanyDatePipe();
  it('uses the company timezone instead of the browser timezone', () => {
    expect(pipe.transform('2026-11-13T11:54:00Z', 'Europe/London', 'time')).toBe('11:54');
    expect(pipe.transform('2026-11-13T11:54:00Z', 'Africa/Nairobi', 'time')).toBe('14:54');
  });
  it('handles daylight saving at the event instant', () => {
    expect(pipe.transform('2026-07-13T11:54:00Z', 'Europe/London', 'time')).toBe('12:54');
  });
  it('keeps calendar dates unchanged in zones behind UTC', () => {
    expect(pipe.transform('2026-11-13', 'America/Los_Angeles', 'date')).toBe('13 Nov 2026');
    expect(companyDateKey('2026-11-13', 'America/Los_Angeles')).toBe('2026-11-13');
  });
  it('uses local date boundaries when filtering timestamped records', () => {
    expect(companyDateKey('2026-11-12T10:30:00Z', 'Pacific/Kiritimati')).toBe('2026-11-13');
    expect(companyDateKey('2026-11-13T01:00:00Z', 'America/Los_Angeles')).toBe('2026-11-12');
  });
  it('handles absent or invalid values without inventing a date', () => {
    for (const value of [null, '', 'bad', '2026-02-31'])
      expect(pipe.transform(value, 'Europe/London')).toBe('Not recorded');
    expect(pipe.transform('2026-11-13T10:00:00Z', 'invalid/zone')).toBe('Not recorded');
    expect(companyDateKey('bad', 'Europe/London')).toBe('');
  });
});
