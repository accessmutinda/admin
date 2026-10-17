import { COURSES, Person } from '../shared/management.store';
import { checkState, readiness, staffRecord, today, dateValid } from './hr.models';

export function onboardingTasks(person: Person) {
  const record = staffRecord(person);
  return [
    {
      title: 'Personal details',
      section: 'personal',
      done: !!(
        record.personal.firstName.trim() &&
        record.personal.surname.trim() &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email.trim())
      ),
    },
    {
      title: 'Employment details',
      section: 'employment',
      done: !!(
        person.role &&
        person.location &&
        dateValid(person.start) &&
        record.employment.type &&
        record.reference
      ),
    },
    ...record.checks
      .filter((check) => check.status !== 'Not required')
      .map((check) => ({
        title: check.title,
        section: 'compliance',
        done:
          check.status === 'Verified' &&
          checkState(check) !== 'Expired' &&
          dateValid(check.completed) &&
          check.completed <= today() &&
          !!check.reviewer.trim() &&
          !!person.documents?.some((document) => document.id === check.documentId),
      })),
    ...record.induction.map((task) => ({
      title: task.title,
      section: 'training',
      done: task.complete,
    })),
    ...COURSES.filter((course) => course.category === 'Mandatory').map((course) => ({
      title: course.title,
      section: 'training',
      done: record.training.some(
        (training) =>
          training.courseId === course.id &&
          dateValid(training.completed) &&
          training.completed <= today() &&
          (!training.expiry || training.expiry >= today()),
      ),
    })),
  ];
}

export function onboardingRow(person: Person) {
  const tasks = onboardingTasks(person);
  const completed = tasks.filter((task) => task.done).length;
  return {
    person: { ...person, hr: staffRecord(person) },
    tasks,
    completed,
    total: tasks.length,
    progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    ready: readiness(person).ready && tasks.every((task) => task.done),
    next: tasks.find((task) => !task.done),
  };
}

export function complianceRows(people: Person[]) {
  return people
    .filter((person) => !['Left', 'Inactive'].includes(staffRecord(person).status))
    .flatMap((person) =>
      staffRecord(person)
        .checks.filter((check) => check.status !== 'Not required')
        .map((check) => {
          const evidence = person.documents?.find((document) => document.id === check.documentId);
          const state = checkState(check);
          return {
            key: person.id + ':' + check.id,
            person,
            check,
            evidence,
            state:
              state === 'Verified' && (!evidence || !check.completed || !check.reviewer.trim())
                ? 'Needs evidence'
                : state,
          };
        }),
    );
}
