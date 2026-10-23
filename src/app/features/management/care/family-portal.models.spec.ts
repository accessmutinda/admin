import { familyMedicationStatus, upcomingFamilyVisit } from './family-portal.models';

describe('Family portal record status', () => {
  it('excludes elapsed and completed visits and uses UK instants in summer and winter', () => {
    const winter = Date.parse('2026-12-01T12:00:00Z');
    expect(
      upcomingFamilyVisit({ date: '2026-12-01', start: '09:00', completed: false }, winter),
    ).toBe(false);
    expect(
      upcomingFamilyVisit({ date: '2026-12-01', start: '12:00', completed: false }, winter),
    ).toBe(true);
    expect(
      upcomingFamilyVisit({ date: '2026-12-01', start: '14:00', completed: true }, winter),
    ).toBe(false);
    expect(
      upcomingFamilyVisit(
        { date: '2026-07-01', start: '13:00', completed: false },
        Date.parse('2026-07-01T12:01:00Z'),
      ),
    ).toBe(false);
    expect(
      upcomingFamilyVisit(
        { date: '2026-07-01', start: '14:00', completed: false },
        Date.parse('2026-07-01T12:01:00Z'),
      ),
    ).toBe(true);
    expect(
      upcomingFamilyVisit(
        { date: '2026-03-29', start: '01:30', completed: false },
        Date.parse('2026-03-29T00:00:00Z'),
      ),
    ).toBe(false);
  });
  it('distinguishes current, ended, discontinued and future prescriptions', () => {
    const medication = { start: '2026-01-01', end: '', discontinuedAt: '' };
    expect(familyMedicationStatus(medication, '2026-10-23')).toBe('Current');
    expect(familyMedicationStatus({ ...medication, end: '2026-10-23' }, '2026-10-23')).toBe(
      'Current',
    );
    expect(familyMedicationStatus({ ...medication, end: '2026-10-22' }, '2026-10-23')).toBe(
      'Ended',
    );
    expect(familyMedicationStatus({ ...medication, start: '2026-10-24' }, '2026-10-23')).toBe(
      'Scheduled',
    );
    expect(
      familyMedicationStatus(
        { ...medication, discontinuedAt: '2026-10-23T09:00:00Z' },
        '2026-10-23',
      ),
    ).toBe('Discontinued');
  });
});
