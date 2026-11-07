import type { AcademyData, AcademyCourse } from './academy.models';
import type { Person } from '../../shared/management.store';
import { londonDate } from '../../rota/rota.models';

export type AcademyCapability =
  | 'author'
  | 'publish'
  | 'assign'
  | 'review'
  | 'correct'
  | 'configure'
  | 'export'
  | 'evidence'
  | 'diagnostics';
export interface AcademyRequirement {
  id: string;
  courseId: string;
  roles: string[];
  branches: string[];
  serviceCategory: string;
  effectiveFrom: string;
  effectiveTo: string;
  minimumVersion: number;
  allowExternal: boolean;
  reviewRequired: boolean;
  renewalMonths: number;
  reminderDays: number[];
  autoAssign: boolean;
}
export interface AcademyAdjustment {
  id: string;
  assignmentId: string;
  personId: string;
  extraMinutes: number;
  untimed: boolean;
  reason: string;
  approvedBy: string;
  approvedAt: string;
  expires: string;
}
export interface AcademyReview {
  id: string;
  personId: string;
  attemptId: string;
  assignmentId: string;
  kind: 'Remedial review' | 'Evidence correction';
  status: 'Open' | 'In progress' | 'Resolved';
  ownerId: string;
  due: string;
  reason: string;
  actions: string;
  decision: string;
  resolvedAt: string;
}
export interface AcademyDelivery {
  id: string;
  personId: string;
  assignmentId: string;
  channel: 'Email' | 'SMS' | 'App' | 'In-platform';
  title: string;
  text: string;
  status: 'Queued' | 'Sent' | 'Delivered' | 'Failed';
  attempts: number;
  nextAttemptAt: string;
  updatedAt: string;
  providerId: string;
  error: string;
  history: { at: string; status: string; detail: string }[];
}
export interface AcademyAuthorisation {
  id: string;
  personId: string;
  courseId: string;
  task: string;
  clientId: string;
  location: string;
  assessorId: string;
  observedAt: string;
  reviewDue: string;
  status: 'Approved' | 'Restricted' | 'Revoked';
  evidence: string;
  restrictions: string;
}
export interface AcademyAccessGrant {
  id: string;
  email: string;
  role: string;
  personIds: string[];
  capabilities: AcademyCapability[];
  startsAt: string;
  expiresAt: string;
  reason: string;
  approvedBy: string;
  revokedAt: string;
}
export interface AcademyGovernance {
  capabilityRoles?: Record<string, AcademyCapability[]>;
  version: number;
  requirements: AcademyRequirement[];
  adjustments: AcademyAdjustment[];
  reviews: AcademyReview[];
  deliveries: AcademyDelivery[];
  authorisations: AcademyAuthorisation[];
  grants: AcademyAccessGrant[];
  schedulerRuns: { at: string; actor: string; assignments: number; notices: number }[];
  channelFailure: boolean;
  automaticRecovery?: boolean;
  offline?: boolean;
  syncQueue?: {
    id: string;
    at: string;
    personId: string;
    action: string;
    status: 'Pending' | 'Reconciled';
    reconciledAt: string;
  }[];
}
export function emptyGovernance(): AcademyGovernance {
  return {
    version: 1,
    requirements: [],
    adjustments: [],
    reviews: [],
    deliveries: [],
    authorisations: [],
    grants: [],
    schedulerRuns: [],
    channelFailure: false,
  };
}
export function courseApplies(course: AcademyCourse, person: Person, day = londonDate()) {
  return (
    course.status === 'Published' &&
    course.active !== false &&
    (!course.effectiveDate || course.effectiveDate <= day) &&
    (!course.targetRoles?.length || course.targetRoles.includes(person.role)) &&
    (!course.targetBranches?.length || course.targetBranches.includes(person.location))
  );
}
export function requirementsFor(data: AcademyData, person: Person, day = londonDate()) {
  const applicable = (data.governance?.requirements ?? []).filter(
    (r) =>
      r.effectiveFrom <= day &&
      (!r.effectiveTo || r.effectiveTo >= day) &&
      (!r.roles.length || r.roles.includes(person.role)) &&
      (!r.branches.length || r.branches.includes(person.location)) &&
      (!r.serviceCategory || person.hr?.employment.department === r.serviceCategory),
  );
  const explicit = new Set(
    (data.governance?.requirements ?? [])
      .filter((r) => r.effectiveFrom <= day)
      .map((r) => r.courseId),
  );
  return [
    ...data.courses
      .filter((c) => c.mandatory && courseApplies(c, person, day) && !explicit.has(c.id))
      .map(
        (c) =>
          ({
            id: 'course:' + c.id,
            courseId: c.id,
            roles: [],
            branches: [],
            serviceCategory: '',
            effectiveFrom: '',
            effectiveTo: '',
            minimumVersion: 0,
            allowExternal: true,
            reviewRequired: false,
            renewalMonths: c.validityMonths ?? data.settings.validityMonths,
            reminderDays: [data.settings.reminderDays],
            autoAssign: false,
          }) satisfies AcademyRequirement,
      ),
    ...applicable,
  ];
}
export function evidenceCurrent(
  data: AcademyData,
  person: Person,
  courseId: string,
  day = londonDate(),
  rule?: AcademyRequirement,
) {
  const record = person.hr?.training.find((t) => t.courseId === courseId);
  if (
    !record?.completed ||
    record.completed > day ||
    (record.expiry && record.expiry < day) ||
    record.evidenceStatus === 'Revoked' ||
    rule?.reviewRequired
  )
    return false;
  const certificate = data.certificates.find((c) => c.id === record.certificateId);
  if (!certificate) return rule?.allowExternal !== false;
  if (data.attempts.some((a) => a.id === certificate.passedAttemptId && a.invalidatedAt))
    return false;
  if (
    certificate.personId !== person.id ||
    certificate.revokedAt ||
    (certificate.courseVersion ?? 1) < (rule?.minimumVersion ?? 0)
  )
    return false;
  const job = data.completions?.find(
    (j) =>
      j.assignmentId === certificate.assignmentId &&
      j.personId === person.id &&
      (certificate.replacesId
        ? j.certificateId === certificate.id
        : !j.certificateId || j.certificateId === certificate.id),
  );
  return (
    job?.status === 'COMPLETE_SYNCED' && !!person.documents?.some((d) => d.id === job.documentId)
  );
}
