import { AcademyService } from './academy.service';
import { AcademyAssignment } from './academy.models';
import { certificateRecord } from './academy-certificate-test-data';

describe('Certificate completion and retained result history', () => {
  const assignment: AcademyAssignment = {
    id: 'assignment',
    personId: 'worker',
    courseId: 'course',
    due: '2027-12-01',
    assignedAt: '2026-11-01T00:00:00Z',
    assignedBy: 'Training lead',
    recurrenceMonths: 0,
    completedLessonIds: ['lesson'],
    notes: {},
    positions: {},
    completedAt: '2026-11-12T10:00:00Z',
    archived: false,
  };
  function context() {
    const latest = certificateRecord('replacement');
    latest.certificate.replacesId = 'original';
    latest.completion.certificateId = 'replacement';
    const old = certificateRecord('original');
    old.certificate.replacedById = 'replacement';
    const data = {
      certificates: [latest.certificate, old.certificate],
      completions: [latest.completion, old.completion],
      attempts: [],
      settings: { dueSoonDays: 30 },
    };
    const service = {
      state: () => data,
      canReadPerson: () => true,
      assignedCourse: () => ({ evidenceType: 'Internal knowledge completion' }),
      completion: (id: string) =>
        AcademyService.prototype.completion.call(service as unknown as AcademyService, id),
    };
    return { service: service as unknown as AcademyService, data };
  }
  it('uses the replacement evidence when the server returns newest certificates first', () => {
    const { service } = context();
    expect(service.completion('assignment')?.certificateId).toBe('replacement');
  });
  it('completes knowledge learning when HR evidence is recorded while leaving rota pending', () => {
    const { service } = context();
    expect(AcademyService.prototype.status.call(service, assignment)).toBe('Completed');
    expect(service.completion('assignment')?.status).toBe('ROTA_REFRESH_PENDING');
  });
  it('retains an older invalidated attempt without overriding a later valid completion', () => {
    const { service, data } = context();
    (data.attempts as unknown[]).push({
      assignmentId: 'assignment',
      groupId: '',
      invalidatedAt: '2026-11-10T10:00:00Z',
    });
    expect(AcademyService.prototype.status.call(service, assignment)).toBe('Completed');
  });
});
