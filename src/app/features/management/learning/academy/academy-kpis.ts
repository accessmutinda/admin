import type { AcademyData } from './academy.models';
import type { Person } from '../../shared/management.store';
import { evidenceCurrent, requirementsFor } from './academy-governance.models';
export function academyKpis(data: AcademyData, people: Person[], from = '', to = '9999-12-31') {
  const submitted = data.attempts.filter(
    (a) =>
      a.submittedAt &&
      !a.invalidatedAt &&
      a.groupKind !== 'Survey' &&
      a.submittedAt.slice(0, 10) >= from &&
      a.submittedAt.slice(0, 10) <= to &&
      people.some((p) => p.id === a.personId),
  );
  const finals = submitted.filter((a) => !a.groupId),
    checkpoints = submitted.filter((a) => !!a.groupId);
  const rate = (rows: typeof submitted) =>
    rows.length ? Math.round((rows.filter((a) => a.passed).length / rows.length) * 100) + '%' : '—';
  const applicable = people.filter((p) => requirementsFor(data, p).length);
  const current = applicable.filter((p) =>
    requirementsFor(data, p).every((r) => evidenceCurrent(data, p, r.courseId, undefined, r)),
  );
  return {
    finalPassRate: rate(finals),
    checkpointPassRate: rate(checkpoints),
    finalAttempts: finals.length,
    checkpointAttempts: checkpoints.length,
    exceptions: (data.completions ?? []).filter(
      (j) => j.status === 'SYNC_EXCEPTION' && people.some((p) => p.id === j.personId),
    ).length,
    currency: applicable.length
      ? Math.round((current.length / applicable.length) * 100) + '%'
      : '—',
    current: current.length,
    applicable: applicable.length,
  };
}
