import { COURSES, Person } from '../../shared/management.store';
import { londonDate } from '../../rota/rota.models';

export type Publication = 'Draft' | 'Published' | 'Archived';
export interface AcademyLesson {
  id: string;
  title: string;
  minutes: number;
  content: string;
  transcript: string;
  videoId: string;
  thumbnailId: string;
  captionId: string;
  handoutIds: string[];
}
export interface AcademyCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  mandatory: boolean;
  cpdHours: number;
  passMark: number | null;
  validityMonths: number | null;
  status: Publication;
  sample: boolean;
  thumbnailId: string;
  lessons: AcademyLesson[];
  version: number;
  updatedAt: string;
}
export interface AcademyQuestion {
  id: string;
  courseId: string;
  lessonId: string;
  type: 'Single choice' | 'Multiple choice' | 'True / false';
  text: string;
  scenario: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  weight: number;
  required: boolean;
  shuffle: boolean;
  imageId: string;
  options: { id: string; text: string }[];
  correctIds: string[];
  explanation: string;
  correctFeedback: string;
  incorrectFeedback: string;
  tags: string[];
  status: Publication;
  version: number;
  updatedAt: string;
}
export interface AcademySettings {
  passMark: number;
  maxAttempts: number;
  timeLimitMinutes: number;
  validityMonths: number;
  reminderDays: number;
  dueSoonDays: number;
  refresherDays: number;
  overdueDays: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  sequentialLessons: boolean;
  allowSelfEnrolment: boolean;
  showFeedback: boolean;
  showSignatureDate: boolean;
  portalNotifications: boolean;
  adminRoles: string[];
  template: 'Standard' | 'Modern' | 'Minimal' | 'Professional';
  primary: string;
  secondary: string;
  logoId: string;
  backgroundId: string;
  signatureId: string;
  signatureName: string;
  signatureRole: string;
  issuer: string;
  notificationTemplates: { assigned: string; result: string; certificate: string; expiry: string };
  updatedAt: string;
}
export interface AcademyAssignment {
  id: string;
  personId: string;
  courseId: string;
  due: string;
  assignedAt: string;
  assignedBy: string;
  recurrenceMonths: number;
  completedLessonIds: string[];
  notes: Record<string, string>;
  positions: Record<string, number>;
  completedAt: string;
  archived: boolean;
}
export interface AcademyAttempt {
  award?: {
    cpdHours: number;
    validityMonths: number;
    sample: boolean;
    branding: AcademySettings;
    issuer: string;
    learner: string;
  };

  id: string;
  assignmentId: string;
  personId: string;
  courseId: string;
  courseTitle: string;
  courseVersion: number;
  questions: AcademyQuestion[];
  answers: Record<string, string[]>;
  flags: string[];
  startedAt: string;
  deadline: string;
  submittedAt: string;
  passMark: number;
  showFeedback: boolean;
  score: number | null;
  passed: boolean;
}
export interface AcademyCertificate {
  courseVersion?: number;
  id: string;
  personId: string;
  assignmentId: string;
  courseId: string;
  courseTitle: string;
  learner: string;
  issuer: string;
  issuedAt: string;
  expires: string;
  score: number;
  cpdHours: number;
  sample: boolean;
  branding: AcademySettings;
}
export interface AcademyAsset {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: 'Video' | 'Image' | 'Document' | 'Captions';
  at: string;
  by: string;
}
export interface AcademyEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
  personId: string;
}
export interface AcademyNotice {
  id: string;
  assignmentId: string;
  personId: string;
  title: string;
  text: string;
  at: string;
  key: string;
}
export interface AcademyData {
  courseDrafts: AcademyCourse[];
  questionDrafts: AcademyQuestion[];
  courses: AcademyCourse[];
  questions: AcademyQuestion[];
  assignments: AcademyAssignment[];
  attempts: AcademyAttempt[];
  certificates: AcademyCertificate[];
  assets: AcademyAsset[];
  settings: AcademySettings;
  events: AcademyEvent[];
  notices: AcademyNotice[];
}
export function defaultAcademySettings(): AcademySettings {
  return {
    passMark: 70,
    maxAttempts: 3,
    timeLimitMinutes: 30,
    validityMonths: 12,
    reminderDays: 30,
    dueSoonDays: 14,
    refresherDays: 60,
    overdueDays: 3,
    shuffleQuestions: true,
    shuffleOptions: true,
    sequentialLessons: true,
    allowSelfEnrolment: false,
    showFeedback: true,
    showSignatureDate: true,
    portalNotifications: true,
    adminRoles: ['PO', 'CA', 'RM', 'TM', 'HR'],
    template: 'Standard',
    primary: '#008AFA',
    secondary: '#008D9F',
    logoId: '',
    backgroundId: '',
    signatureId: '',
    signatureName: '',
    signatureRole: '',
    issuer: '',
    notificationTemplates: {
      assigned: 'You have been assigned {{course}}. Due: {{due}}.',
      result: 'Your result for {{course}} is available.',
      certificate: 'Your certificate for {{course}} is ready.',
      expiry: 'Your certificate for {{course}} expires on {{due}}.',
    },
    updatedAt: '',
  };
}
export function emptyAcademy(): AcademyData {
  const courses: AcademyCourse[] = COURSES.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    mandatory: c.category === 'Mandatory',
    cpdHours: 0.5,
    passMark: null,
    validityMonths: null,
    status: 'Published',
    sample: true,
    thumbnailId: '',
    version: 1,
    updatedAt: '',
    lessons: ['Understand the essentials', 'Recognise and respond', 'Put it into practice'].map(
      (title, i) => ({
        id: c.id + '-lesson-' + (i + 1),
        title,
        minutes: 10,
        content:
          i === 0
            ? c.description +
              ' This sample lesson introduces the learning workflow. Use your organisation’s approved training content for practice.'
            : i === 1
              ? 'Listen carefully, record facts and use your organisation’s approved reporting procedure. This sample text is not a clinical instruction.'
              : 'Reflect on your learning and discuss questions with your supervisor. Completing these sample lessons does not establish practical competency or external accreditation.',
        transcript: '',
        videoId: '',
        thumbnailId: '',
        captionId: '',
        handoutIds: [],
      }),
    ),
  }));
  return {
    courseDrafts: [],
    questionDrafts: [],
    courses,
    questions: courses.map((c) => ({
      id: c.id + '-question-1',
      courseId: c.id,
      lessonId: c.lessons[0].id,
      type: 'Single choice',
      text: 'Where should you find your organisation’s approved procedure?',
      scenario: 'This is a sample assessment question for the learning workflow.',
      category: 'Policies and reporting',
      difficulty: 'Easy',
      weight: 1,
      required: true,
      shuffle: true,
      imageId: '',
      options: [
        { id: 'policy', text: 'The current approved policy and my supervisor.' },
        { id: 'guess', text: 'An unverified guess.' },
        { id: 'old', text: 'An outdated personal copy without checking.' },
      ],
      correctIds: ['policy'],
      explanation: 'Use current, approved guidance and ask your supervisor if you are unsure.',
      correctFeedback: 'Correct. Use the current approved guidance.',
      incorrectFeedback: 'Review the lesson and check the current approved guidance.',
      tags: ['Sample'],
      status: 'Published',
      version: 1,
      updatedAt: '',
    })),
    assignments: [],
    attempts: [],
    certificates: [],
    assets: [],
    settings: defaultAcademySettings(),
    events: [],
    notices: [],
  };
}
export function legacyAssignment(person: Person, courseId: string): AcademyAssignment {
  return {
    id: 'legacy:' + person.id + ':' + courseId,
    personId: person.id,
    courseId,
    due: '',
    assignedAt: '',
    assignedBy: 'Existing learning assignment',
    recurrenceMonths: 0,
    completedLessonIds: [],
    notes: {},
    positions: {},
    completedAt: '',
    archived: false,
  };
}
export const questionCorrect = (q: AcademyQuestion, answers: string[]) =>
  answers.length === q.correctIds.length &&
  new Set(answers).size === answers.length &&
  q.correctIds.every((id) => answers.includes(id));
export function gradeAttempt(attempt: AcademyAttempt): number {
  const total = attempt.questions.reduce((sum, q) => sum + q.weight, 0);
  return total
    ? Math.round(
        (attempt.questions.reduce(
          (sum, q) => sum + (questionCorrect(q, attempt.answers[q.id] ?? []) ? q.weight : 0),
          0,
        ) /
          total) *
          100,
      )
    : 0;
}
export function addMonths(date: string, months: number): string {
  const d = new Date(date + 'T12:00:00Z');
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export function assignmentStatus(
  assignment: AcademyAssignment,
  soon: number,
  today = londonDate(),
): string {
  if (assignment.completedAt) return 'Completed';
  if (assignment.due && assignment.due < today) return 'Overdue';
  if (
    assignment.due &&
    assignment.due <=
      new Date(Date.parse(today + 'T12:00:00Z') + soon * 86400000).toISOString().slice(0, 10)
  )
    return 'Due soon';
  return assignment.completedLessonIds.length ? 'In progress' : 'Not started';
}
export function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
