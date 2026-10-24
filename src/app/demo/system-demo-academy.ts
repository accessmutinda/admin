import type { WorkspaceData } from '../features/management/shared/management.store';
import {
  emptyAcademy,
  type AcademyAssignment,
  type AcademyAttempt,
  type AcademyCertificate,
} from '../features/management/learning/academy/academy.models';
import { addDays } from '../features/management/rota/rota.models';
import { appendDemo, demoAt, demoId } from './system-demo-utils';

export function seedSystemAcademy(data: WorkspaceData, today: string): WorkspaceData {
  const academy = data.academy ?? emptyAcademy();
  const staff = data.people.filter(
    (person) => /^care-demo-staff-[0-3]$/.test(person.id) || person.id === demoId('staff-jane'),
  );
  const assignments: AcademyAssignment[] = [];
  const attempts: AcademyAttempt[] = [];
  const certificates: AcademyCertificate[] = [];
  staff.forEach((person, personIndex) =>
    academy.courses.forEach((course, courseIndex) => {
      const completed = (personIndex + courseIndex) % 3 === 0;
      const due = addDays(today, courseIndex === 1 && !completed ? -3 : 14 + courseIndex * 3);
      const assignmentId = demoId('learning-' + person.id + '-' + course.id);
      assignments.push({
        id: assignmentId,
        personId: person.id,
        courseId: course.id,
        due,
        assignedAt: demoAt(today, -28),
        assignedBy: 'Demo training manager',
        recurrenceMonths: 12,
        completedLessonIds: completed
          ? course.lessons.map((lesson) => lesson.id)
          : (personIndex + courseIndex) % 2
            ? [course.lessons[0].id]
            : [],
        notes: completed ? {} : { [course.lessons[0].id]: 'Demo learning reflection saved.' },
        positions: {},
        completedAt: completed ? demoAt(today, -7) : '',
        archived: false,
      });
      if (!completed) return;
      const questions = academy.questions.filter(
        (question) => question.courseId === course.id && question.status === 'Published',
      );
      const score = 100;
      attempts.push({
        id: demoId('attempt-' + person.id + '-' + course.id),
        assignmentId,
        personId: person.id,
        courseId: course.id,
        courseTitle: course.title,
        courseVersion: course.version,
        questions: structuredClone(questions),
        answers: Object.fromEntries(
          questions.map((question) => [question.id, [...question.correctIds]]),
        ),
        flags: [],
        startedAt: demoAt(today, -7, '09:00'),
        deadline: demoAt(today, -7, '09:30'),
        submittedAt: demoAt(today, -7, '09:20'),
        passMark: course.passMark ?? academy.settings.passMark,
        showFeedback: true,
        score,
        passed: true,
        award: {
          cpdHours: course.cpdHours,
          validityMonths: 12,
          sample: true,
          branding: structuredClone(academy.settings),
          issuer: 'Demo training provider',
          learner: person.name,
        },
      });
      certificates.push({
        id: demoId('certificate-' + person.id + '-' + course.id),
        personId: person.id,
        assignmentId,
        courseId: course.id,
        courseTitle: course.title,
        courseVersion: course.version,
        learner: person.name,
        issuer: 'Demo training provider',
        issuedAt: demoAt(today, -7),
        expires: addDays(today, courseIndex === 0 ? 20 : 358),
        score,
        cpdHours: course.cpdHours,
        sample: true,
        branding: structuredClone(academy.settings),
      });
    }),
  );
  return {
    ...data,
    academy: {
      ...academy,
      assignments: appendDemo(academy.assignments, assignments),
      attempts: appendDemo(academy.attempts, attempts),
      certificates: appendDemo(academy.certificates, certificates),
      notices: appendDemo(
        academy.notices,
        assignments
          .filter((assignment) => !assignment.completedAt)
          .map((assignment) => ({
            id: assignment.id + '-notice',
            assignmentId: assignment.id,
            personId: assignment.personId,
            title: 'Demo learning assignment',
            text: 'Your demonstration course is available in the staff academy.',
            at: demoAt(today, -2),
            key: assignment.id + '-assigned',
          })),
      ),
      events: appendDemo(
        academy.events,
        certificates.map((certificate) => ({
          id: certificate.id + '-event',
          at: certificate.issuedAt,
          actor: 'Demo training manager',
          action: 'Demo course completed',
          detail: certificate.courseTitle,
          personId: certificate.personId,
        })),
      ),
    },
  };
}
