import { Person } from '../shared/management.store';
import { DAYS, staffRecord, weeklySlots } from '../people/hr.models';
import { HireInput } from './recruitment-api.service';

export function hireInput(person: Person): HireInput & { status: string } {
  const h = staffRecord(person);
  const { firstName, surname, middleName, birthDate, phone, driver, photo, ...personal } =
    h.personal;
  const { recruitment, ...employment } = h.employment;
  const rows =
    h.weeklySlots && h.availabilityMode !== 'Custom times'
      ? h.weeklySlots.flatMap((slot) =>
          slot.days.map((preference, index) => ({
            day: DAYS[index],
            start: slot.start,
            end: slot.end,
            preference,
          })),
        )
      : h.availability;
  return {
    status: h.status,
    first_name: firstName,
    surname,
    middle_name: middleName ?? '',
    email: person.email,
    phone,
    birth_date: birthDate || null,
    reference: h.reference,
    branch_name: person.location,
    job_title: person.role,
    start_date: person.start,
    employment_type: employment.type,
    is_driver: driver,
    contract_end: employment.contractEnd || null,
    facts: {
      personal: {
        ...personal,
        ...(person.documents?.find((file) => file.category === 'Photo')
          ? { photo_file_id: person.documents.find((file) => file.category === 'Photo')!.id }
          : {}),
      },
      employment: {
        ...Object.fromEntries(
          Object.entries(employment)
            .filter(([key]) => key !== 'type')
            .map(([key, value]) => [key, value === null ? null : String(value)]),
        ),
        ...(recruitment
          ? {
              recruitmentSource: recruitment.source ?? '',
              applicationDate: recruitment.applicationDate ?? '',
              interviewDate: recruitment.interviewDate ?? '',
              offerDate: recruitment.offerDate ?? '',
              nextReview: recruitment.nextReview ?? '',
              interviewNotes: recruitment.interviewNotes ?? '',
            }
          : {}),
      },
      preferences: h.preferences,
      availability: rows,
      checks: h.checks.map(({ reviewer, ...check }) => check),
      training: h.training.map((row) => ({
        courseId: row.courseId,
        completed: row.completed,
        expiry: row.expiry,
        competency: row.competency,
        certificateId: row.certificateId,
      })),
      induction: h.induction,
      references: h.references,
    },
    file_ids: (person.documents ?? []).map((file) => file.id),
  };
}

export function restoreHire(person: Person, source: HireInput): Person {
  const h = staffRecord(person),
    facts = source.facts as Record<string, any>;
  h.reference = source.reference ?? h.reference;
  h.status = 'Onboarding';
  Object.assign(h.personal, facts['personal'] ?? {}, {
    firstName: source.first_name ?? '',
    surname: source.surname ?? '',
    middleName: source.middle_name ?? '',
    birthDate: source.birth_date ?? '',
    phone: source.phone ?? '',
    driver: source.is_driver ?? false,
  });
  Object.assign(h.employment, facts['employment'] ?? {}, {
    type: source.employment_type ?? '',
    contractEnd: source.contract_end ?? '',
  });
  for (const field of ['hours', 'rate', 'probationMonths', 'noticeWeeks'] as const) {
    const value = h.employment[field];
    h.employment[field] = value === null || String(value) === '' ? null : Number(value);
  }
  Object.assign(h.preferences, facts['preferences'] ?? {});
  h.availabilityMode = 'Custom times';
  h.availability = facts['availability'] ?? h.availability;
  const entered = facts['availability'] as
    | {
        day: string;
        start: string;
        end: string;
        preference: 'Available' | 'Preferred' | 'Unavailable';
      }[]
    | undefined;
  if (entered?.length === 42) {
    const slots = weeklySlots({
      ...person,
      hr: { ...h, weeklySlots: undefined, availability: [] },
    });
    if (
      entered.every(
        (row) =>
          DAYS.includes(row.day) && slots.some((s) => s.start === row.start && s.end === row.end),
      )
    ) {
      for (const row of entered)
        slots.find((s) => s.start === row.start && s.end === row.end)!.days[DAYS.indexOf(row.day)] =
          row.preference;
      h.weeklySlots = slots;
      h.availabilityMode = 'Weekly slots';
    }
  }

  if (facts['checks']) h.checks = facts['checks'];
  if (facts['training']) h.training = facts['training'];
  if (facts['induction']) h.induction = facts['induction'];
  if (facts['references']) h.references = facts['references'];
  return {
    ...person,
    hr: h,
    email: source.email ?? person.email,
    location: source.branch_name ?? person.location,
    role: source.job_title ?? person.role,
    start: source.start_date ?? '',
  };
}
