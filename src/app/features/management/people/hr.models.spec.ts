import { availabilityCovers } from './hr.models';
import { CHECKS, COURSES } from '../shared/management.store';
import {
  checkState,
  dateValid,
  newStaff,
  readiness,
  staffErrors,
  staffRecord,
  today,
} from './hr.models';
function completeStaff() {
  const p = newStaff();
  const h = p.hr!;
  h.personal.firstName = 'Alex';
  h.personal.surname = 'Smith';
  p.name = 'Alex Smith';
  p.email = 'alex@example.org';
  p.role = 'Care Worker';
  p.location = 'London';
  p.start = '2026-01-01';
  h.employment.type = 'Permanent';
  return p;
}
describe('Staff data and readiness', () => {
  it('preserves legacy evidence without asserting verified compliance or dated learning', () => {
    const p = completeStaff();
    delete p.hr;
    p.checks = CHECKS.map(() => true);
    p.learning = ['safeguarding'];
    p.progress = { safeguarding: 100 };
    p.notes = ['Legacy note'];
    const h = staffRecord(p);
    expect(h.checks.every((c) => c.status === 'Recorded')).toBe(true);
    expect(h.training[0].completed).toBe('');
    expect(h.notes[0].at).toBe('');
    expect(readiness(p).ready).toBe(false);
    expect(p.hr).toBeUndefined();
    expect(staffRecord(p)).toEqual(h);
  });
  it('normalises an existing record without altering its identity or input', () => {
    const p = completeStaff();
    const h = staffRecord(p);
    h.reference = 'CHANGED';
    expect(p.hr!.reference).not.toBe('CHANGED');
    expect(p.id).toBeTruthy();
  });
  it('requires actual mandatory completion and induction alongside check outcomes', () => {
    const p = completeStaff();
    p.hr!.checks.forEach((c) => (c.status = 'Not required'));
    expect(readiness(p).missing).toEqual(['Induction', 'Mandatory training']);
    p.hr!.induction.forEach((t) => (t.complete = true));
    p.hr!.training = COURSES.filter((c) => c.category === 'Mandatory').map((c) => ({
      courseId: c.id,
      completed: '2026-01-02',
      expiry: '',
      assessor: '',
      competency: 'Not assessed',
      certificateId: '',
    }));
    expect(readiness(p).ready).toBe(true);
    p.hr!.training[0].expiry = '2026-01-03';
    expect(readiness(p).ready).toBe(false);
  });
  it('handles expiry boundaries without expiring a check before its last day', () => {
    const c = staffRecord(completeStaff()).checks[0];
    c.status = 'Verified';
    c.expiry = '2026-10-17';
    expect(checkState(c, '2026-10-17')).toBe('Due soon');
    expect(checkState(c, '2026-10-18')).toBe('Expired');
    c.status = 'Not required';
    expect(checkState(c, '2026-10-18')).toBe('Not required');
  });
  it('rejects invalid calendar dates and validates overnight availability without guessing hours', () => {
    expect(dateValid('2026-02-30')).toBe(false);
    expect(dateValid('2026-02-28')).toBe(true);
    const p = completeStaff();
    p.hr!.availability[0] = {
      day: 'Monday',
      start: '22:00',
      end: '06:00',
      preference: 'Available',
    };
    expect(staffErrors(p).flat()).toEqual([]);
    p.hr!.availability[0].end = '22:00';
    expect(staffErrors(p)[2]).toHaveLength(1);
  });
  it('keeps drafts independent from creation requirements and validates training dates', () => {
    const p = newStaff();
    expect(staffErrors(p)[0].length).toBeGreaterThan(0);
    expect(staffErrors(p)[1].length).toBeGreaterThan(0);
    p.hr!.training = [
      {
        courseId: 'safeguarding',
        completed: '2999-01-01',
        expiry: '',
        assessor: '',
        competency: 'Not assessed',
        certificateId: '',
      },
    ];
    expect(staffErrors(p)[3]).toHaveLength(1);
    expect(dateValid(today())).toBe(true);
  });
  it('covers the previous day overnight window and rejects gaps between availability slots', () => {
    const p = completeStaff();
    p.hr!.availability[0] = {
      day: 'Monday',
      start: '22:00',
      end: '06:00',
      preference: 'Preferred',
    };
    expect(availabilityCovers(p, '2026-10-19', '23:00', '02:00')).toBe(true);
    expect(availabilityCovers(p, '2026-10-20', '02:00', '05:00')).toBe(true);
    expect(availabilityCovers(p, '2026-10-20', '05:00', '07:00')).toBe(false);
    expect(availabilityCovers(p, '2026-10-20', '14:00', '15:00')).toBe(false);
  });
});
