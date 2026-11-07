import { AcademyGovernanceService } from './academy-governance.service';
import {
  DestroyRef,
  Injectable,
  InjectionToken,
  effect,
  inject,
  signal,
  NgZone,
} from '@angular/core';
import { AcademyAssets } from './academy-assets.service';
import { AcademyService } from './academy.service';
import {
  AcademyCertificate,
  AcademyCompletion,
  AcademyData,
  AcademySyncStatus,
  gradeAttempt,
  addMonths,
  questionCorrect,
} from './academy.models';
import { WorkspaceData } from '../../shared/management.store';
import { staffRecord } from '../../people/hr.models';
import { addDays, londonDate } from '../../rota/rota.models';

export const ACADEMY_DEMO_PDF = new InjectionToken<
  (certificate: AcademyCertificate) => Promise<{ content: string; checksum: string }>
>('Academy demo PDF renderer', {
  providedIn: 'root',
  factory: () => {
    const assets = inject(AcademyAssets);
    return async (certificate) => {
      const { downloadAcademyCertificate } = await import('./academy-pdf');
      const content = await downloadAcademyCertificate(certificate, assets, true, true);
      if (typeof content !== 'string')
        throw new Error('The certificate PDF could not be generated.');
      const bytes = Uint8Array.from(atob(content.split(',')[1]), (c) => c.charCodeAt(0));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return {
        content,
        checksum: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(
          '',
        ),
      };
    };
  },
});
export const ACADEMY_DEMO_STEP_DELAY = new InjectionToken<number>('Academy demo step delay', {
  providedIn: 'root',
  factory: () => 180,
});
@Injectable({ providedIn: 'root' })
export class AcademyDemoWorkflow {
  private readonly academy = inject(AcademyService);
  private readonly governance = inject(AcademyGovernanceService);
  private readonly pdf = inject(ACADEMY_DEMO_PDF);
  private readonly running = new Set<string>();
  private alive = true;
  private readonly delay = inject(ACADEMY_DEMO_STEP_DELAY);
  private readonly clock = signal(Date.now());
  private pause() {
    return this.delay > 0
      ? new Promise<void>((resolve) => setTimeout(resolve, this.delay))
      : Promise.resolve();
  }
  constructor() {
    const timer = inject(NgZone).runOutsideAngular(() =>
      setInterval(() => this.clock.set(Date.now()), 60000),
    );
    inject(DestroyRef).onDestroy(() => {
      this.alive = false;
      clearInterval(timer);
    });
    effect(() => {
      this.clock();
      if (!this.academy.enabled()) return;
      const workspace = this.academy.store.companyId();
      this.checkRefresherReminders();
      const governance = this.academy.state().governance;
      if (
        governance?.requirements.some((r) => r.autoAssign) &&
        this.academy.can('assign') &&
        governance.schedulerRuns[0]?.at.slice(0, 10) !== londonDate()
      )
        this.governance.runSchedules();
      if (governance?.automaticRecovery && this.academy.can('review'))
        for (const job of this.academy.state().completions ?? [])
          if (
            job.status === 'SYNC_EXCEPTION' &&
            job.nextRetryAt &&
            Date.parse(job.nextRetryAt) <= this.clock() &&
            job.retryCount < 3
          )
            this.retry(job.id);
      if (governance && !governance.offline && this.academy.can('assign'))
        for (const delivery of governance.deliveries.filter(
          (n) =>
            n.status === 'Failed' &&
            n.nextAttemptAt &&
            Date.parse(n.nextAttemptAt) <= this.clock() &&
            n.attempts < 3,
        ))
          this.governance.processDelivery(delivery.id, true);

      if (
        this.academy
          .state()
          .certificates.some(
            (c) =>
              c.sample &&
              !(this.academy.state().completions ?? []).some(
                (j) => j.assignmentId === c.assignmentId,
              ),
          )
      )
        this.reconcile();
      for (const job of this.academy.state().completions ?? []) {
        const certificate = this.academy
          .state()
          .certificates.find((c) =>
            job.certificateId
              ? c.id === job.certificateId
              : c.assignmentId === job.assignmentId && !c.replacesId,
          );
        if (
          job.tenantId === workspace &&
          certificate &&
          !certificate.revokedAt &&
          !['COMPLETE_SYNCED', 'SYNC_EXCEPTION'].includes(job.status)
        )
          void this.process(job.id);
      }
    });
  }
  private checkRefresherReminders() {
    const today = londonDate();
    const workspace = this.academy.store.companyId();
    if (
      !this.academy.state().settings.portalNotifications ||
      !this.academy
        .state()
        .refresherSchedules?.some(
          (s) =>
            s.tenantId === workspace &&
            !s.notifiedAt &&
            !s.cancelledAt &&
            s.remindOn <= today &&
            !this.academy
              .state()
              .certificates.some(
                (c) =>
                  c.revokedAt &&
                  c.assignmentId ===
                    this.academy.state().completions?.find((j) => j.id === s.completionId)
                      ?.assignmentId,
              ),
        )
    )
      return;
    this.academy.store.saveWorkspace((data) => {
      const next = structuredClone(data);
      const academy = next.academy!;
      for (const schedule of academy.refresherSchedules ?? []) {
        if (
          schedule.tenantId !== workspace ||
          schedule.notifiedAt ||
          schedule.cancelledAt ||
          schedule.remindOn > today ||
          academy.certificates.some(
            (c) =>
              c.revokedAt &&
              c.assignmentId ===
                academy.completions?.find((j) => j.id === schedule.completionId)?.assignmentId,
          )
        )
          continue;
        const key = 'scheduled-refresher:' + schedule.id;
        if (!academy.notices.some((n) => n.key === key))
          academy.notices.unshift({
            id: crypto.randomUUID(),
            assignmentId:
              academy.completions?.find((j) => j.id === schedule.completionId)?.assignmentId ?? '',
            personId: schedule.personId,
            title: 'Refresher review due',
            text:
              (academy.courses.find((c) => c.id === schedule.courseId)?.title ?? 'Course') +
              ' requires renewal review by ' +
              schedule.due +
              '.',
            at: new Date().toISOString(),
            key,
          });
        schedule.notifiedAt = new Date().toISOString();
      }
      return next;
    });
  }
  reconcile(): void {
    if (!this.academy.enabled()) return;
    const workspace = this.academy.store.companyId();
    const inconsistent = (this.academy.state().completions ?? [])
      .filter((j) => j.status === 'COMPLETE_SYNCED')
      .filter((j) => {
        const c = this.academy
            .state()
            .certificates.find((c) =>
              j.certificateId
                ? c.id === j.certificateId
                : c.assignmentId === j.assignmentId && !c.replacesId,
            ),
          p = this.academy.store.staff().find((p) => p.id === j.personId);
        return (
          c &&
          !c.revokedAt &&
          p &&
          (!p.documents?.some((d) => d.id === j.documentId) ||
            ![...(p.hr?.training ?? []), ...(p.hr?.trainingHistory ?? [])].some(
              (t) => t.sourceCompletionId === j.id,
            ))
        );
      });
    if (inconsistent.length)
      this.academy.store.saveWorkspace((data) => {
        const next = structuredClone(data),
          academy = next.academy!;
        for (const source of inconsistent) {
          const j = academy.completions!.find((j) => j.id === source.id)!,
            p = next.people.find((p) => p.id === j.personId)!,
            c = academy.certificates.find((c) =>
              j.certificateId
                ? c.id === j.certificateId
                : c.assignmentId === j.assignmentId && !c.replacesId,
            )!;
          if (!p.documents?.some((d) => d.id === j.documentId)) {
            j.documentId = undefined;
            j.trainingRecordId = undefined;
            j.pdfContent = undefined;
            j.acknowledgements = [];
            c.documentId = undefined;
            j.status = 'CERTIFICATE_PENDING';
          } else {
            j.trainingRecordId = undefined;
            j.acknowledgements = j.acknowledgements.filter((a) =>
              ['CERTIFICATE_GENERATED', 'TRAINING_RECORD_PENDING'].includes(a.stage),
            );
            j.status = 'TRAINING_RECORD_PENDING';
          }
          j.error =
            'Reconciliation found a missing saved evidence link; the same certificate will be recovered.';
          j.updatedAt = new Date().toISOString();
        }
        return next;
      });
    const unmatched = this.academy
      .state()
      .attempts.filter(
        (a) =>
          a.passed &&
          a.submittedAt &&
          !a.groupId &&
          !a.invalidatedAt &&
          !a.criticalFailed &&
          !this.academy
            .state()
            .certificates.some(
              (c) => c.passedAttemptId === a.id || c.assignmentId === a.assignmentId,
            ),
      );
    if (unmatched.length)
      this.academy.store.saveWorkspace((data) => {
        const next = structuredClone(data),
          academy = next.academy!;
        for (const a of unmatched) {
          const assignment = academy.assignments.find(
              (x) => x.id === a.assignmentId && x.personId === a.personId,
            ),
            person = next.people.find((p) => p.id === a.personId),
            course = assignment?.courseSnapshot ?? academy.courses.find((c) => c.id === a.courseId);
          if (
            !assignment ||
            !person ||
            !course ||
            (course.evidenceType && course.evidenceType !== 'Internal knowledge completion') ||
            course.lessons.some(
              (l) => l.mandatory !== false && !assignment.completedLessonIds.includes(l.id),
            ) ||
            a.score === null ||
            a.score < a.passMark
          )
            continue;
          const award = a.award;
          academy.certificates.push({
            id: 'CV-' + crypto.randomUUID(),
            personId: a.personId,
            assignmentId: a.assignmentId,
            courseId: a.courseId,
            courseTitle: a.courseTitle,
            courseVersion: a.courseVersion,
            courseCode: course.code,
            passedAttemptId: a.id,
            learner: award?.learner ?? person.name,
            issuer:
              award?.issuer ?? course.issuer ?? this.academy.store.company()?.name ?? 'CareVerity',
            issuedAt: a.submittedAt,
            expires:
              (award?.validityMonths ?? course.validityMonths ?? 0)
                ? addMonths(
                    londonDate(new Date(a.submittedAt)),
                    award?.validityMonths ?? course.validityMonths ?? 0,
                  )
                : '',
            score: a.score,
            cpdHours: award?.cpdHours ?? course.cpdHours,
            sample: award?.sample ?? course.sample,
            branding: structuredClone(award?.branding ?? academy.settings),
            templateVersion: 1,
          });
        }
        return next;
      });
    const candidates = this.academy
      .state()
      .certificates.filter(
        (c) =>
          !c.revokedAt &&
          !(this.academy.state().completions ?? []).some(
            (j) => j.assignmentId === c.assignmentId,
          ) &&
          this.academy
            .state()
            .attempts.some(
              (a) =>
                a.assignmentId === c.assignmentId &&
                a.personId === c.personId &&
                !a.groupId &&
                a.passed &&
                a.submittedAt,
            ),
      );
    if (!candidates.length) return;
    this.academy.store.saveWorkspace((data) => {
      const next = structuredClone(data);
      const academy = next.academy!;
      academy.completions ??= [];
      for (const certificate of candidates) {
        if (academy.completions.some((j) => j.assignmentId === certificate.assignmentId)) continue;
        const attempt = academy.attempts.find(
          (a) =>
            a.assignmentId === certificate.assignmentId &&
            a.personId === certificate.personId &&
            !a.groupId &&
            a.passed &&
            a.submittedAt,
        )!;
        const id = attempt.resultId ?? 'seed-completion:' + attempt.id;
        academy.completions.push({
          id,
          tenantId: workspace,
          personId: certificate.personId,
          assignmentId: certificate.assignmentId,
          attemptId: attempt.id,
          courseVersion: attempt.courseVersion,
          correlationId: attempt.correlationId ?? 'seed-trace:' + attempt.id,
          status: 'CERTIFICATE_PENDING',
          createdAt: attempt.submittedAt,
          updatedAt: new Date().toISOString(),
          retryCount: 0,
          error: '',
          acknowledgements: [],
        });
      }
      return next;
    });
  }
  private update(
    workspace: string,
    id: string,
    action: string,
    apply: (data: WorkspaceData, academy: AcademyData, job: AcademyCompletion) => void,
  ) {
    if (!this.alive || workspace !== this.academy.store.companyId())
      throw new Error('Workspace changed; the workflow will resume when reopened.');
    const saved = this.academy.store.saveWorkspace((data) => {
      const next = structuredClone(data);
      const academy = next.academy!;
      const job = academy.completions?.find((j) => j.id === id && j.tenantId === workspace);
      if (!job || !next.people.some((p) => p.id === job.personId))
        throw new Error('The exact staff record or completion is unavailable.');
      apply(next, academy, job);
      job.updatedAt = new Date().toISOString();
      academy.events.unshift({
        id: crypto.randomUUID(),
        at: job.updatedAt,
        actor: 'CareVerity Academy demo workflow',
        action,
        detail: job.correlationId,
        personId: job.personId,
      });
      return next;
    });
    if (!saved) throw new Error('Browser storage could not save the evidence workflow.');
  }
  async process(id: string): Promise<void> {
    const workspace = this.academy.store.companyId();
    const key = workspace + ':' + id;
    if (this.running.has(key) || !this.academy.enabled()) return;
    const initial = this.academy
      .state()
      .completions?.find((j) => j.id === id && j.tenantId === workspace);
    if (!initial || ['COMPLETE_SYNCED', 'SYNC_EXCEPTION'].includes(initial.status)) return;
    this.running.add(key);
    const ack = (job: AcademyCompletion, stage: AcademySyncStatus, reference: string) => {
      if (!job.acknowledgements.some((a) => a.stage === stage))
        job.acknowledgements.push({ stage, at: new Date().toISOString(), reference });
      job.status = stage;
      job.error = '';
    };
    const current = () => this.academy.state().completions!.find((j) => j.id === id)!;
    const fail = (stage: string) => {
      if (this.academy.state().settings.demoFailure === stage)
        throw new Error(
          'Simulated ' + stage + ' outage. Remove the failure scenario and retry this workflow.',
        );
    };
    try {
      const attempt = this.academy
        .state()
        .attempts.find(
          (a) =>
            a.id === initial.attemptId &&
            a.personId === initial.personId &&
            a.assignmentId === initial.assignmentId,
        );
      const assignment = this.academy
        .state()
        .assignments.find((a) => a.id === initial.assignmentId && a.personId === initial.personId);
      const certificate = this.academy
        .state()
        .certificates.find(
          (c) =>
            c.personId === initial.personId &&
            (initial.certificateId
              ? c.id === initial.certificateId
              : c.assignmentId === initial.assignmentId && !c.replacesId),
        );
      if (
        !attempt?.passed ||
        !!attempt.invalidatedAt ||
        !!attempt.groupId ||
        !attempt.submittedAt ||
        !assignment ||
        !certificate ||
        certificate.revokedAt ||
        (attempt.gradeBreakdown?.length
          ? (attempt.gradeBreakdown.reduce((sum, s) => sum + s.earned, 0) /
              attempt.gradeBreakdown.reduce((sum, s) => sum + s.available, 0)) *
            100
          : gradeAttempt(attempt)) < attempt.passMark ||
        attempt.criticalFailed ||
        attempt.questions.some(
          (q) => q.critical && !questionCorrect(q, attempt.answers[q.id] ?? []),
        ) ||
        initial.courseVersion !== attempt.courseVersion ||
        (certificate.courseVersion !== undefined &&
          certificate.courseVersion !== attempt.courseVersion) ||
        (certificate.passedAttemptId !== undefined && certificate.passedAttemptId !== attempt.id)
      )
        throw new Error(
          'Pass, staff and certificate references do not match verified demo source records.',
        );
      const course =
        assignment.courseSnapshot ??
        this.academy.state().courses.find((c) => c.id === assignment.courseId);
      if (
        !course ||
        course.lessons.some(
          (l) => l.mandatory !== false && !assignment.completedLessonIds.includes(l.id),
        )
      )
        throw new Error('Required lesson gates are incomplete.');
      if (!current().pdfContent && !current().documentId) {
        const artifact = await this.pdf(certificate);
        if (
          !artifact.content.startsWith('data:application/pdf;base64,') ||
          !atob(artifact.content.split(',')[1]).startsWith('%PDF-') ||
          !artifact.checksum
        )
          throw new Error('Invalid certificate artifact.');
        this.update(workspace, id, 'Certificate generated', (data, academy, job) => {
          job.pdfContent = artifact.content;
          job.checksum = artifact.checksum;
          academy.certificates.find((c) => c.id === certificate.id)!.checksum = artifact.checksum;
          ack(job, 'CERTIFICATE_GENERATED', certificate.id);
        });
        await this.pause();
      }
      if (!current().documentId) {
        this.update(workspace, id, 'HR filing pending', (_d, _a, job) => {
          job.status = 'HR_LINK_PENDING';
        });
        fail('HR filing');
        this.update(workspace, id, 'Certificate linked to HR', (data, academy, job) => {
          const person = data.people.find((p) => p.id === job.personId)!;
          const documentId = 'academy-document:' + certificate.id;
          person.documents ??= [];
          if (!person.documents.some((d) => d.id === documentId))
            person.documents.push({
              id: documentId,
              name: certificate.courseTitle + ' — Internal Training Completion Certificate.pdf',
              type: 'application/pdf',
              content: job.pdfContent!,
              category: 'Training & Certificates',
              requirement: 'Training',
              uploadedAt: certificate.issuedAt,
              expiry: certificate.expires,
              status: 'Verified',
              reviewedBy: 'CareVerity Academy',
              reviewedAt: new Date().toISOString(),
              version: 1,
            });
          job.documentId = documentId;
          delete job.pdfContent;
          academy.certificates.find((c) => c.id === certificate.id)!.documentId = documentId;
          ack(job, 'TRAINING_RECORD_PENDING', documentId);
        });
        await this.pause();
      }
      if (!current().trainingRecordId) {
        fail('Training record');
        this.update(workspace, id, 'Training record and matrix updated', (data, academy, job) => {
          const person = data.people.find((p) => p.id === job.personId)!;
          const hr = structuredClone(staffRecord(person));
          const previous = hr.training.find((t) => t.courseId === certificate.courseId);
          const training = {
            ...previous,
            courseId: certificate.courseId,
            completed: londonDate(new Date(certificate.issuedAt)),
            expiry: certificate.expires,
            score: certificate.score,
            assessor: previous?.assessor ?? '',
            competency: previous?.competency ?? ('Not assessed' as const),
            certificateId: certificate.id,
            sourceCompletionId: job.id,
            evidenceStatus: 'Current' as const,
            practicalCompleted:
              previous?.practicalCompleted ??
              (previous?.competency === 'Competent' ? previous.completed : ''),
            practicalReviewDue:
              previous?.practicalReviewDue ??
              (previous?.competency === 'Competent' ? previous.expiry : ''),
          };
          const previousCertificate = academy.certificates.find(
            (c) => c.id === previous?.certificateId,
          );
          const newerEvidence =
            !!previous &&
            (previous.completed > training.completed ||
              (!!previousCertificate && previousCertificate.issuedAt > certificate.issuedAt));
          hr.trainingHistory ??= [];
          if (!hr.trainingHistory.some((t) => t.sourceCompletionId === job.id))
            hr.trainingHistory.push(training);
          if (!newerEvidence)
            hr.training = [
              ...hr.training.filter((t) => t.courseId !== certificate.courseId),
              training,
            ];
          person.hr = hr;
          job.trainingRecordId = 'academy-training:' + job.id;
          job.refresherDue = certificate.expires;
          if (certificate.expires && !newerEvidence) {
            academy.refresherSchedules ??= [];
            academy.refresherSchedules.forEach((s) => {
              if (
                s.personId === job.personId &&
                s.courseId === certificate.courseId &&
                s.completionId !== job.id &&
                !s.cancelledAt
              )
                s.cancelledAt = new Date().toISOString();
            });
            if (!academy.refresherSchedules.some((s) => s.completionId === job.id))
              academy.refresherSchedules.push({
                id: 'refresher:' + job.id,
                tenantId: workspace,
                personId: job.personId,
                courseId: certificate.courseId,
                completionId: job.id,
                due: certificate.expires,
                remindOn: addDays(certificate.expires, -academy.settings.reminderDays),
                notifiedAt: '',
              });
          }
          ack(job, 'COMPLIANCE_PENDING', job.trainingRecordId);
        });
        await this.pause();
      }
      if (!current().acknowledgements.some((a) => a.stage === 'ROTA_REFRESH_PENDING')) {
        fail('Compliance');
        this.update(workspace, id, 'Training compliance recalculated', (_data, _academy, job) =>
          ack(job, 'ROTA_REFRESH_PENDING', 'compliance:' + job.id),
        );
      }
      await this.pause();
      fail('Rota refresh');
      this.update(workspace, id, 'Rota suitability refreshed', (_data, academy, job) => {
        ack(job, 'COMPLETE_SYNCED', 'rota:' + job.id);
        const noticeKey = 'synced:' + job.id;
        if (
          academy.settings.portalNotifications &&
          !academy.notices.some((n) => n.key === noticeKey)
        )
          academy.notices.unshift({
            id: crypto.randomUUID(),
            assignmentId: job.assignmentId,
            personId: job.personId,
            title: 'Completion evidence filed in HR',
            text:
              certificate.courseTitle +
              ' is recorded in your training history. Practical sign-off and visit-specific suitability remain separate.',
            at: new Date().toISOString(),
            key: noticeKey,
          });
      });
    } catch (error) {
      if (this.alive && workspace === this.academy.store.companyId()) {
        try {
          this.update(workspace, id, 'Evidence workflow exception', (_d, academy, job) => {
            job.status = 'SYNC_EXCEPTION';
            if (academy.governance?.automaticRecovery && job.retryCount < 3)
              job.nextRetryAt = new Date(
                Date.now() + Math.min(3600, 30 * 2 ** job.retryCount) * 1000,
              ).toISOString();
            job.error = error instanceof Error ? error.message : 'Evidence workflow interrupted.';
          });
        } catch {}
      }
    } finally {
      this.running.delete(key);
    }
  }
  retry(id: string): string | null {
    if (!this.academy.can('review'))
      return 'Only an authorised Academy manager can retry evidence synchronisation.';
    const workspace = this.academy.store.companyId();
    try {
      this.update(workspace, id, 'Evidence retry requested', (_d, academy, job) => {
        if (
          academy.certificates.some(
            (c) =>
              (job.certificateId
                ? c.id === job.certificateId
                : c.assignmentId === job.assignmentId && !c.replacesId) && c.revokedAt,
          )
        )
          throw new Error('Revoked evidence cannot be reissued by retry.');
        job.retryCount++;
        job.nextRetryAt = '';
        job.error = '';
        job.status = job.trainingRecordId
          ? 'COMPLIANCE_PENDING'
          : job.documentId
            ? 'TRAINING_RECORD_PENDING'
            : job.pdfContent
              ? 'HR_LINK_PENDING'
              : 'CERTIFICATE_PENDING';
      });
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }
}
