import { AcademyAssets } from './academy-assets.service';
import { academyKpis } from './academy-kpis';
import { Injectable, computed, inject } from '@angular/core';
import { AcademyService } from './academy.service';
import {
  AcademyAssignment,
  AcademyAttempt,
  AcademyCertificate,
  AcademyData,
  addMonths,
  gradeAttempt,
} from './academy.models';
import {
  AcademyAccessGrant,
  AcademyAdjustment,
  AcademyAuthorisation,
  AcademyCapability,
  AcademyDelivery,
  AcademyRequirement,
  AcademyReview,
  emptyGovernance,
  evidenceCurrent,
  requirementsFor,
} from './academy-governance.models';
import { addDays, londonDate } from '../../rota/rota.models';

@Injectable({ providedIn: 'root' })
export class AcademyGovernanceService {
  readonly academy = inject(AcademyService);
  private readonly assets = inject(AcademyAssets);
  readonly data = computed(() => this.academy.state().governance ?? emptyGovernance());
  kpis() {
    return academyKpis(
      this.academy.state(),
      this.academy.store.staff().filter((p) => this.academy.can('evidence', p.id)),
    );
  }
  private workspace() {
    return this.academy.store.companyId();
  }
  private mutate(
    capability: AcademyCapability,
    action: string,
    apply: (d: AcademyData) => string | null,
    personId = '',
    expectedWorkspace = this.workspace(),
  ) {
    if (expectedWorkspace !== this.workspace()) return 'The workspace changed. Reopen this page.';
    if (!this.academy.can(capability, personId))
      return 'Your role does not have permission for this action.';
    const draft = structuredClone(this.academy.state());
    draft.governance ??= emptyGovernance();
    const error = apply(draft);
    if (error) return error;
    draft.events.unshift({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: this.academy.auth.currentUser()!.name,
      action,
      detail: personId || action,
      personId,
    });
    return this.academy.store.saveWorkspace((data) => ({ ...data, academy: draft }))
      ? null
      : 'Could not save. Browser storage may be full.';
  }
  seed() {
    if (this.academy.state().governance) return null;
    return this.mutate('configure', 'Academy governance examples seeded', (d) => {
      const g = d.governance!,
        people = this.academy.store.staff(),
        day = londonDate(),
        now = new Date().toISOString();
      const course = d.courses.find((c) => c.status === 'Published'),
        person = people[1] ?? people[0];
      if (!course || !person) return 'A published course and existing staff records are needed.';
      g.automaticRecovery = true;
      g.requirements = d.courses
        .filter((c) => c.status === 'Published' && c.mandatory)
        .map((c) => ({
          id: 'requirement:' + c.id,
          courseId: c.id,
          roles: c.targetRoles ?? [],
          branches: c.targetBranches ?? [],
          serviceCategory: '',
          effectiveFrom: day,
          effectiveTo: '',
          minimumVersion: 0,
          allowExternal: true,
          reviewRequired: false,
          renewalMonths: c.validityMonths ?? d.settings.validityMonths,
          reminderDays: [30, 14, 7],
          autoAssign: false,
        }));
      if (!d.courses.some((c) => c.id === 'demo-advanced-care')) {
        const modules = Array.from({ length: 4 }, (_, i) => ({
          id: 'demo-module-' + i,
          title: 'Module ' + (i + 1),
          prerequisiteModuleIds: i ? ['demo-module-' + (i - 1)] : [],
        }));
        const lessons = Array.from({ length: 8 }, (_, i) => ({
          id: 'demo-lesson-' + i,
          moduleId: modules[Math.floor(i / 2)].id,
          moduleTitle: modules[Math.floor(i / 2)].title,
          type: 'Reading' as const,
          title: [
            'Recognise concerns',
            'Record observations',
            'Escalate safely',
            'Person-centred responses',
            'Policy and consent',
            'Team communication',
            'Apply a scenario',
            'Review and reflect',
          ][i],
          minutes: 5,
          content:
            'Seeded learning example. Review the approved organisation policy, record objective observations and escalate concerns to an authorised supervisor. This content demonstrates the learning workflow and does not confer practical authority.',
          transcript: '',
          videoId: '',
          thumbnailId: '',
          captionId: '',
          handoutIds: [],
          mandatory: true,
        }));
        const draft = {
          ...structuredClone(course),
          id: 'demo-advanced-care',
          title: 'Advanced Care Practice — Demonstration',
          code: 'DEMO-ACP-01',
          description:
            'An eight-lesson, four-module example with prerequisites, checkpoints, feedback and review.',
          status: 'Published' as const,
          sample: true,
          mandatory: false,
          targetRoles: [people[0].role],
          targetBranches: [people[0].location],
          prerequisiteCourseIds: [course.id],
          evidenceType: 'Internal knowledge completion' as const,
          renewalPolicyRef: 'DEMO-RENEWAL-01',
          cpdJustification:
            'Forty minutes of reading plus an eight-minute assessment; demonstration content.',
          estimatedMinutes: 48,
          assessmentMinutes: 8,
          cpdHours: 0.8,
          owner: 'Demo Training Manager',
          issuer: this.academy.store.company()?.name ?? 'Demo provider',
          approver: 'Demo Registered Manager',
          rights: 'Original fictional training examples for demonstration',
          effectiveDate: day,
          policy: {
            ...this.academy.policyFor(course),
            feedbackMode: 'After delay' as const,
            feedbackDelayHours: 24,
          },
          modules,
          lessons,
          version: 1,
          updatedAt: now,
          publishedAt: now,
          publishedBy: 'Demo Training Manager',
          questionGroups: [
            {
              id: 'demo-checkpoint',
              title: 'Module 2 checkpoint',
              kind: 'Quiz' as const,
              countsTowardGrade: true,
              placement: 'After module' as const,
              moduleId: modules[1].id,
              lessonId: '',
              availableAfterDays: 0,
              dueAfterDays: null,
              required: true,
            },
            {
              id: 'demo-survey',
              title: 'Final module feedback',
              kind: 'Survey' as const,
              countsTowardGrade: false,
              placement: 'Within module' as const,
              moduleId: modules[3].id,
              lessonId: lessons[7].id,
              availableAfterDays: 0,
              dueAfterDays: null,
              required: false,
            },
          ],
          assessmentQuestions: [] as typeof d.questions,
        };
        const base = d.questions.find((q) => q.courseId === course.id && q.status === 'Published');
        if (base) {
          const bank = Array.from({ length: 10 }, (_, i) => ({
            ...structuredClone(base),
            id: 'demo-advanced-question-' + i,
            courseId: draft.id,
            lessonId: lessons[Math.min(7, i)].id,
            text:
              i >= 8
                ? 'How could this module better support your learning?'
                : base.text + ' (scenario ' + (i + 1) + ')',
            groupId: i >= 8 ? 'demo-survey' : i >= 6 ? 'demo-checkpoint' : '',
            type: i >= 8 ? ('Free text' as const) : base.type,
            options: i >= 8 ? [] : structuredClone(base.options),
            correctIds: i >= 8 ? [] : [...base.correctIds],
            critical: i === 0,
            required: i < 8,
            weight: 1,
            order: i,
            explanation: i >= 8 ? '' : base.explanation,
            status: 'Published' as const,
            version: 1,
            updatedAt: now,
          }));
          draft.assessmentQuestions = bank;
          d.questions.push(...bank);
        }
        d.courses.push(draft);
        d.courseVersions ??= [];
        d.courseVersions.push(structuredClone(draft));
        g.requirements.push({
          id: 'demo-future-requirement',
          courseId: draft.id,
          roles: [people[0].role],
          branches: [people[0].location],
          serviceCategory: '',
          effectiveFrom: addDays(day, 7),
          effectiveTo: '',
          minimumVersion: 1,
          allowExternal: false,
          reviewRequired: false,
          renewalMonths: 6,
          reminderDays: [30, 14, 7],
          autoAssign: false,
        });
      }
      const original = d.assignments.find(
        (a) => a.personId === person.id && a.courseId === course.id && !a.archived,
      );
      const questions = structuredClone(
        course.assessmentQuestions ??
          d.questions.filter((q) => q.courseId === course.id && q.status === 'Published'),
      );
      if (questions.length) {
        if (original) original.archived = true;
        const policy = {
          ...this.academy.policyFor(course),
          maxAttempts: 1,
          feedbackMode: 'Manager release' as const,
        };
        const assignment: AcademyAssignment = {
          id: 'demo-remedial:' + person.id,
          personId: person.id,
          courseId: course.id,
          tenantId: this.workspace(),
          courseVersion: course.version,
          courseSnapshot: structuredClone(course),
          questionSnapshot: questions,
          policySnapshot: policy,
          assignedAt: now,
          assignedBy: 'CareVerity Academy demo',
          source: 'Seeded remedial exercise',
          type: 'Refresher',
          priority: 'High',
          supervisorId: people[0]?.id,
          due: addDays(day, 7),
          recurrenceMonths: 0,
          completedLessonIds: course.lessons.map((l) => l.id),
          notes: {},
          positions: {},
          completedAt: '',
          archived: false,
        };
        const attempt: AcademyAttempt = {
          id: 'demo-failed:' + person.id,
          assignmentId: assignment.id,
          personId: person.id,
          courseId: course.id,
          courseTitle: course.title,
          courseVersion: course.version,
          questions: questions.filter((q) => !q.groupId || q.groupId === 'final'),
          answers: {},
          flags: [],
          startedAt: now,
          deadline: new Date(Date.now() + 1800000).toISOString(),
          submittedAt: now,
          passMark: course.passMark ?? d.settings.passMark,
          showFeedback: true,
          score: 0,
          passed: false,
          policy,
          resultId: 'demo-result:' + person.id,
          correlationId: 'demo-trace:' + person.id,
          scorerVersion: 'seeded-rubric-v3',
        };
        attempt.score = gradeAttempt(attempt);
        d.assignments.push(assignment);
        d.attempts.push(attempt);
        g.reviews.push({
          id: 'demo-review:' + person.id,
          personId: person.id,
          assignmentId: assignment.id,
          attemptId: attempt.id,
          kind: 'Remedial review',
          status: 'Open',
          ownerId: people[0]?.id ?? '',
          due: addDays(day, 3),
          reason: 'Seeded example: permitted attempts exhausted',
          actions: 'Review safeguarding scenarios with the supervisor.',
          decision: '',
          resolvedAt: '',
        });
      }
      let a = d.assignments.find(
        (a) => a.personId === people[0]?.id && !a.archived && !a.completedAt,
      );
      if (!a && people[0]) {
        const previous = d.assignments.find(
          (x) => x.personId === people[0].id && x.courseId === course.id && !x.archived,
        );
        if (previous) previous.archived = true;
        const questions = structuredClone(
          course.assessmentQuestions ??
            d.questions.filter((q) => q.courseId === course.id && q.status === 'Published'),
        );
        a = {
          id: 'demo-adjusted:' + people[0].id,
          personId: people[0].id,
          courseId: course.id,
          tenantId: this.workspace(),
          courseVersion: course.version,
          courseSnapshot: structuredClone(course),
          questionSnapshot: questions,
          policySnapshot: {
            ...this.academy.policyFor(course),
            feedbackMode: 'After delay',
            feedbackDelayHours: 24,
          },
          source: 'Seeded adjusted learning example',
          type: 'Initial',
          assignedAt: now,
          assignedBy: 'CareVerity Academy demo',
          due: addDays(day, 14),
          recurrenceMonths: 12,
          completedLessonIds: [],
          notes: {},
          positions: {},
          completedAt: '',
          archived: false,
        };
        d.assignments.push(a);
      }

      if (a)
        g.adjustments.push({
          id: 'demo-adjustment',
          assignmentId: a.id,
          personId: a.personId,
          extraMinutes: 15,
          untimed: false,
          reason: 'Seeded example: approved reading-time adjustment',
          approvedBy: 'Demo Training Manager',
          approvedAt: now,
          expires: addDays(day, 90),
        });
      for (const [i, status] of (['Queued', 'Sent', 'Delivered', 'Failed'] as const).entries())
        g.deliveries.push({
          id: 'demo-delivery:' + i,
          personId: person.id,
          assignmentId:
            d.assignments.find((a) => a.personId === person.id && !a.archived)?.id ?? '',
          channel: i === 3 ? 'SMS' : i === 1 ? 'Email' : 'In-platform',
          title: 'Seeded training reminder',
          text: 'Review your assigned course and renewal date.',
          status,
          attempts: status === 'Queued' ? 0 : 1,
          nextAttemptAt: '',
          updatedAt: now,
          providerId: status === 'Queued' ? '' : 'local-demo:' + i,
          error: status === 'Failed' ? 'Simulated provider outage' : '',
          history: [
            {
              at: now,
              status,
              detail: 'Seeded local delivery simulation; no external message sent.',
            },
          ],
        });
      g.authorisations.push({
        id: 'demo-task-authorisation',
        personId: people[0].id,
        courseId: course.id,
        task: 'Supervised care task',
        clientId: '',
        location: people[0].location,
        assessorId: people[2]?.id ?? people[0].id,
        observedAt: day,
        reviewDue: addDays(day, 90),
        status: 'Restricted',
        evidence: 'Seeded observation: further supervised practice required.',
        restrictions: 'Supervision required; independent deployment is blocked.',
      });
      g.grants.push({
        id: 'demo-reviewer-grant',
        email: 'academy.auditor@example.invalid',
        role: 'QA',
        personIds: [person.id],
        capabilities: ['evidence', 'export'],
        startsAt: now,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        reason: 'Seeded time-limited inspection grant',
        approvedBy: this.academy.auth.currentUser()!.name,
        revokedAt: '',
      });
      d.accessRequests ??= [];
      if (!d.accessRequests.some((r) => r.personId === person.id && r.status === 'Requested'))
        d.accessRequests.push({
          id: 'demo-record-request',
          tenantId: this.workspace(),
          personId: person.id,
          createdAt: now,
          status: 'Requested',
          acknowledgedAt: '',
          acknowledgedBy: '',
          portable: true,
        });
      return null;
    });
  }
  async seedMedia(): Promise<string | null> {
    if (!this.academy.can('configure')) return null;
    const workspace = this.workspace();
    try {
      if (
        !this.academy.state().assets.some((a) => a.name === 'Academy demonstration reading.pdf')
      ) {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF();
        pdf.text('CareVerity Academy — Demonstration Reading', 15, 20);
        pdf.setFontSize(11);
        pdf.text(
          [
            'Fictional learning resource for the frontend demonstration.',
            'Read the approved policy, record objective observations,',
            'and escalate concerns to an authorised supervisor.',
            'This resource does not establish practical competency.',
          ],
          15,
          40,
        );
        const id = await this.assets.upload(
          new File([pdf.output('arraybuffer')], 'Academy demonstration reading.pdf', {
            type: 'application/pdf',
          }),
          workspace,
        );
        const error = this.academy.saveMediaMetadata(
          id,
          { rights: 'Original fictional demonstration resource', language: 'en' },
          workspace,
        );
        if (error) return error;
      }
      if (!this.academy.state().assets.some((a) => a.name === 'Academy English captions.vtt')) {
        const id = await this.assets.upload(
          new File(
            [
              'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nReview the approved care policy and escalate concerns.\n',
            ],
            'Academy English captions.vtt',
            { type: 'text/vtt' },
          ),
          workspace,
        );
        const error = this.academy.saveMediaMetadata(
          id,
          { rights: 'Original demonstration captions', language: 'en' },
          workspace,
        );
        if (error) return error;
      }
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }
  saveRequirement(rule: AcademyRequirement, workspace = this.workspace()) {
    return this.mutate(
      'configure',
      'Requirement policy saved',
      (d) => {
        if (
          !d.courses.some((c) => c.id === rule.courseId) ||
          !rule.effectiveFrom ||
          !/^\d{4}-\d{2}-\d{2}$/.test(rule.effectiveFrom) ||
          (rule.effectiveTo && rule.effectiveTo < rule.effectiveFrom) ||
          !Number.isInteger(rule.minimumVersion) ||
          rule.minimumVersion < 0 ||
          !Number.isInteger(rule.renewalMonths) ||
          rule.renewalMonths < 0 ||
          rule.renewalMonths > 120 ||
          rule.reminderDays.some((n) => !Number.isInteger(n) || n < 0 || n > 365)
        )
          return 'Check course, effective dates, versions, renewal and reminder days.';
        if (
          d.governance!.requirements.some(
            (r) =>
              r.id !== rule.id &&
              r.courseId === rule.courseId &&
              JSON.stringify(r.roles) === JSON.stringify(rule.roles) &&
              JSON.stringify(r.branches) === JSON.stringify(rule.branches) &&
              r.serviceCategory === rule.serviceCategory &&
              (!r.effectiveTo || r.effectiveTo >= rule.effectiveFrom) &&
              (!rule.effectiveTo || rule.effectiveTo >= r.effectiveFrom),
          )
        )
          return 'This requirement overlaps an existing policy. End-date the old policy before adding its successor.';
        const previous = d.governance!.requirements.find((r) => r.id === rule.id);
        if (previous && previous.effectiveFrom < londonDate()) {
          const strip = (r: AcademyRequirement) => ({ ...r, effectiveTo: '' });
          if (
            JSON.stringify(strip(previous)) !== JSON.stringify(strip(rule)) ||
            (!!rule.effectiveTo && rule.effectiveTo < londonDate())
          )
            return 'Create a prospective successor policy; existing effective policy terms are retained.';
        }
        d.governance!.requirements = [
          ...d.governance!.requirements.filter((r) => r.id !== rule.id),
          structuredClone(rule),
        ];
        return null;
      },
      '',
      workspace,
    );
  }
  saveAdjustment(value: AcademyAdjustment, workspace = this.workspace()) {
    return this.mutate(
      'review',
      'Assessment adjustment approved',
      (d) => {
        const a = d.assignments.find((a) => a.id === value.assignmentId && !a.archived);
        if (
          !a ||
          !!a.completedAt ||
          a.personId !== value.personId ||
          !value.reason.trim() ||
          !Number.isInteger(value.extraMinutes) ||
          value.extraMinutes < 0 ||
          value.extraMinutes > 240 ||
          (value.expires && value.expires < londonDate())
        )
          return 'Choose an active assignment, reason, valid adjustment and future expiry.';
        const adjustment = {
          ...structuredClone(value),
          approvedAt: new Date().toISOString(),
          approvedBy: this.academy.auth.currentUser()!.name,
        };
        d.governance!.adjustments = [
          ...d.governance!.adjustments.filter((x) => x.id !== value.id),
          adjustment,
        ];
        return null;
      },
      value.personId,
      workspace,
    );
  }
  saveReview(value: AcademyReview, workspace = this.workspace()) {
    return this.mutate(
      'review',
      'Learning review saved',
      (d) => {
        if (
          !this.academy.store.staff().some((p) => p.id === value.personId) ||
          !d.assignments.some(
            (a) => a.id === value.assignmentId && a.personId === value.personId,
          ) ||
          !value.reason.trim() ||
          (value.status === 'Resolved' && (!value.decision.trim() || !value.actions.trim())) ||
          !this.academy.store.staff().some((p) => p.id === value.ownerId)
        )
          return 'Choose the staff assignment and reviewer; record a reason, actions and resolution decision.';
        const old = d.governance!.reviews.find((r) => r.id === value.id);
        if (old?.status === 'Resolved')
          return 'A resolved review is retained read-only. Open a new review for further action.';
        d.governance!.reviews = [
          ...d.governance!.reviews.filter((r) => r.id !== value.id),
          {
            ...structuredClone(value),
            resolvedAt: value.status === 'Resolved' ? new Date().toISOString() : '',
          },
        ];
        return null;
      },
      value.personId,
      workspace,
    );
  }
  releaseFeedback(id: string) {
    const a = this.academy.attempt(id);
    if (!a) return 'Assessment unavailable.';
    return this.mutate(
      'review',
      'Assessment feedback released',
      (d) => {
        const a = d.attempts.find((a) => a.id === id)!;
        if (!a.submittedAt || a.invalidatedAt)
          return 'Only a submitted valid result can release feedback.';
        a.feedbackReleasedAt = new Date().toISOString();
        a.feedbackAvailableAt = '';
        a.showFeedback = true;
        return null;
      },
      a.personId,
    );
  }
  invalidate(id: string, reason: string) {
    const source = this.academy.attempt(id);
    if (!source) return 'Assessment unavailable.';
    const c = this.academy
      .state()
      .certificates.find(
        (c) => (c.passedAttemptId === id || c.assignmentId === source.assignmentId) && !c.revokedAt,
      );
    if (c && !c.revokedAt) {
      const error = this.academy.revokeCertificate(c.id, reason, this.workspace());
      if (error) return error;
    }
    return this.mutate(
      'correct',
      'Assessment invalidated with original result retained',
      (d) => {
        const a = d.attempts.find((a) => a.id === id);
        if (!a?.submittedAt || !reason.trim() || a.invalidatedAt)
          return 'Select a submitted result and record the invalidation reason.';
        a.invalidatedAt = new Date().toISOString();
        a.invalidationReason = reason;
        return null;
      },
      source.personId,
    );
  }
  reissue(id: string, reason: string) {
    return this.mutate('correct', 'Certificate correction issued', (d) => {
      const c = d.certificates.find((c) => c.id === id);
      if (!c || !reason.trim() || c.replacedById)
        return 'Choose an original certificate and record a correction reason.';
      const a =
        d.attempts.find((a) => a.id === c.passedAttemptId) ??
        d.attempts.find((a) => a.assignmentId === c.assignmentId && a.passed);
      if (!a?.passed || a.invalidatedAt)
        return 'A valid passed attempt is required; an invalidated result cannot be reissued.';
      const oldJob = d.completions?.find((j) => j.assignmentId === c.assignmentId);
      if (!oldJob) return 'The original workflow is unavailable.';
      const next: AcademyCertificate = {
        ...structuredClone(c),
        id: 'CV-' + crypto.randomUUID(),
        learner: this.academy.store.staff().find((p) => p.id === c.personId)?.name ?? c.learner,
        replacesId: c.id,
        replacedById: undefined,
        correctionReason: reason,
        revokedAt: undefined,
        revocationReason: undefined,
        documentId: undefined,
        checksum: undefined,
        templateVersion: (c.templateVersion ?? 1) + 1,
      };
      c.revokedAt ||= new Date().toISOString();
      c.revocationReason = reason;
      c.replacedById = next.id;
      d.certificates.push(next);
      d.completions!.push({
        ...structuredClone(oldJob),
        id: 'correction:' + next.id,
        certificateId: next.id,
        assignmentId: next.assignmentId,
        attemptId: a.id,
        status: 'CERTIFICATE_PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0,
        documentId: undefined,
        trainingRecordId: undefined,
        pdfContent: undefined,
        checksum: undefined,
        correlationId: crypto.randomUUID(),
        acknowledgements: [],
        error: '',
      });
      return null;
    });
  }
  saveAuthorisation(value: AcademyAuthorisation, workspace = this.workspace()) {
    return this.mutate(
      'review',
      'Task authorisation recorded',
      (d) => {
        if (
          !this.academy.store.staff().some((p) => p.id === value.personId) ||
          !this.academy.store.staff().some((p) => p.id === value.assessorId) ||
          !d.courses.some((c) => c.id === value.courseId) ||
          !value.task.trim() ||
          !value.evidence.trim() ||
          !value.observedAt ||
          value.observedAt > londonDate() ||
          value.reviewDue < value.observedAt ||
          (value.status === 'Restricted' && !value.restrictions.trim())
        )
          return 'Choose staff, course and assessor; record observation evidence, valid dates and restrictions.';
        d.governance!.authorisations = [
          ...d.governance!.authorisations.filter((x) => x.id !== value.id),
          structuredClone(value),
        ];
        return null;
      },
      value.personId,
      workspace,
    );
  }
  saveGrant(value: AcademyAccessGrant, workspace = this.workspace()) {
    return this.mutate(
      'configure',
      'Time-limited evidence access granted',
      (d) => {
        if (
          !Number.isFinite(Date.parse(value.startsAt)) ||
          !Number.isFinite(Date.parse(value.expiresAt)) ||
          !/^\S+@\S+\.\S+$/.test(value.email) ||
          !value.reason.trim() ||
          Date.parse(value.expiresAt) <= Date.now() ||
          Date.parse(value.expiresAt) <= Date.parse(value.startsAt) ||
          !value.capabilities.length ||
          value.personIds.some((id) => !this.academy.store.staff().some((p) => p.id === id))
        )
          return 'Enter an email, scope, reason and valid access window.';
        if (value.email.toLowerCase() === this.academy.auth.currentUser()?.email.toLowerCase())
          return 'Ask another administrator to approve your own access grant.';
        d.governance!.grants = [
          ...d.governance!.grants.filter((x) => x.id !== value.id),
          { ...structuredClone(value), approvedBy: this.academy.auth.currentUser()!.name },
        ];
        return null;
      },
      '',
      workspace,
    );
  }
  revokeGrant(id: string) {
    return this.mutate('configure', 'Access grant revoked', (d) => {
      const g = d.governance!.grants.find((g) => g.id === id);
      if (!g) return 'Grant unavailable.';
      g.revokedAt = new Date().toISOString();
      return null;
    });
  }
  saveCapabilities(role: string, values: AcademyCapability[]) {
    return this.mutate('configure', 'Academy role capabilities updated', (d) => {
      if (['CA', 'PO'].includes(role)) return 'Administrator recovery capabilities are retained.';
      d.governance!.capabilityRoles ??= {};
      d.governance!.capabilityRoles[role] = [...new Set(values)];
      return null;
    });
  }
  disclosure(
    id: string,
    status: 'Approved' | 'Declined' | 'Provided',
    decision: string,
    reference: string,
  ) {
    const request = this.academy.state().accessRequests?.find((r) => r.id === id);
    if (!request) return 'Request unavailable.';
    return this.mutate(
      'review',
      'Training records disclosure decision',
      (d) => {
        const r = d.accessRequests!.find((r) => r.id === id)!;
        if (
          !decision.trim() ||
          (status === 'Provided' && (!reference.trim() || r.status !== 'Approved'))
        )
          return 'Record the decision. Provision requires prior approval and a secure delivery reference.';
        if (['Provided', 'Declined'].includes(r.status))
          return 'This request is closed; its disclosure history is retained.';
        r.status = status;
        r.decision = decision;
        r.deliveryReference = reference;
        r.acknowledgedBy = this.academy.auth.currentUser()!.name;
        r.acknowledgedAt ||= new Date().toISOString();
        r.completedAt = ['Provided', 'Declined'].includes(status) ? new Date().toISOString() : '';
        return null;
      },
      request.personId,
    );
  }
  queueDelivery(
    personId: string,
    assignmentId: string,
    channel: AcademyDelivery['channel'],
    text: string,
  ) {
    return this.mutate(
      'assign',
      'Training notification queued',
      (d) => {
        if (
          !d.assignments.some((a) => a.id === assignmentId && a.personId === personId) ||
          !text.trim()
        )
          return 'Select an assignment and notification text.';
        const now = new Date().toISOString();
        d.governance!.deliveries.unshift({
          id: crypto.randomUUID(),
          personId,
          assignmentId,
          channel,
          title: 'Training reminder',
          text,
          status: 'Queued',
          attempts: 0,
          nextAttemptAt: '',
          updatedAt: now,
          providerId: '',
          error: '',
          history: [{ at: now, status: 'Queued', detail: 'Queued in local demonstration' }],
        });
        return null;
      },
      personId,
    );
  }
  processDelivery(id: string, retry = false) {
    return this.mutate(
      'assign',
      retry ? 'Notification retry queued' : 'Notification delivery simulated',
      (d) => {
        const n = d.governance!.deliveries.find((n) => n.id === id);
        if (!n) return 'Notification unavailable.';
        if (retry) {
          if (n.status !== 'Failed') return 'Only failed delivery can be retried.';
          n.status = 'Queued';
          n.nextAttemptAt = '';
        } else if (n.status === 'Queued') {
          n.attempts++;
          n.status = d.governance!.channelFailure ? 'Failed' : 'Sent';
          n.error = n.status === 'Failed' ? 'Simulated channel outage' : '';
          n.nextAttemptAt =
            n.status === 'Failed'
              ? new Date(Date.now() + Math.min(3600, 2 ** n.attempts * 30) * 1000).toISOString()
              : '';
          n.providerId = 'local-demo:' + n.id;
        } else if (n.status === 'Sent') n.status = 'Delivered';
        else return 'No delivery transition is available.';
        n.updatedAt = new Date().toISOString();
        n.history.push({
          at: n.updatedAt,
          status: n.status,
          detail: retry ? 'Manual retry requested' : 'Local simulation only; no external delivery',
        });
        return null;
      },
    );
  }
  setChannelFailure(value: boolean) {
    return this.mutate('configure', 'Notification channel simulation changed', (d) => {
      d.governance!.channelFailure = value;
      return null;
    });
  }
  runSchedules() {
    if (!this.academy.can('assign')) return 'Assignment permission is required.';
    const day = londonDate(),
      state = this.academy.state(),
      people = this.academy.store.staff();
    let count = 0,
      notices = 0;
    for (const p of people.filter((p) => !['Inactive', 'Left'].includes(p.hr?.status ?? '')))
      for (const r of requirementsFor(state, p)) {
        if (!r.autoAssign) continue;
        const t = p.hr?.training.find((t) => t.courseId === r.courseId),
          active = this.academy
            .assignments()
            .find(
              (a) =>
                a.personId === p.id && a.courseId === r.courseId && !a.archived && !a.completedAt,
            );
        const horizon = addDays(day, Math.max(0, ...r.reminderDays));
        if (
          !active &&
          (!t ||
            !evidenceCurrent(state, p, r.courseId, day, r) ||
            (!!t.expiry && t.expiry <= horizon))
        ) {
          const due = t?.expiry && t.expiry >= day ? t.expiry : addDays(day, 14);
          const error = this.academy.assign(
            [p.id],
            [r.courseId],
            due,
            r.renewalMonths,
            'Automatic renewal policy ' + r.id,
            true,
            !!t,
            this.workspace(),
          );
          if (error) return error;
          count++;
        }
      }
    const error = this.mutate('assign', 'Renewal scheduler evaluated', (d) => {
      for (const p of people)
        for (const r of requirementsFor(d, p)) {
          const a = d.assignments.find(
            (a) => a.personId === p.id && a.courseId === r.courseId && !a.archived,
          );
          if (!a?.due || a.completedAt) continue;
          const days = Math.round((Date.parse(a.due) - Date.parse(day)) / 86400000);
          if (!r.reminderDays.includes(days) && !(days < 0 && days >= -7)) continue;
          const key = 'policy-reminder:' + r.id + ':' + a.id + ':' + day;
          if (d.notices.some((n) => n.key === key)) continue;
          d.notices.unshift({
            id: crypto.randomUUID(),
            assignmentId: a.id,
            personId: p.id,
            title: days < 0 ? 'Training overdue' : 'Training renewal due',
            text:
              'Review ' +
              (d.courses.find((c) => c.id === r.courseId)?.title ?? 'course') +
              ' by ' +
              a.due,
            at: new Date().toISOString(),
            key,
          });
          notices++;
        }
      d.governance!.schedulerRuns.unshift({
        at: new Date().toISOString(),
        actor: this.academy.auth.currentUser()!.name,
        assignments: count,
        notices,
      });
      return null;
    });
    return error;
  }
  setOffline(value: boolean) {
    return this.mutate(
      'configure',
      value ? 'Offline demonstration enabled' : 'Local reconnect reconciled',
      (d) => {
        d.governance!.offline = value;
        if (!value)
          for (const event of d.governance!.syncQueue ?? [])
            if (event.status === 'Pending') {
              event.status = 'Reconciled';
              event.reconciledAt = new Date().toISOString();
            }
        return null;
      },
    );
  }
  redactedEvidence() {
    if (
      !this.academy.can('export') &&
      !this.academy.store.staff().some((p) => this.academy.can('export', p.id))
    )
      return null;
    const s = this.academy.state(),
      ids = new Set(
        this.academy.store
          .staff()
          .filter((p) => this.academy.can('evidence', p.id))
          .map((p) => p.id),
      );
    return {
      company: this.workspace(),
      preparedAt: new Date().toISOString(),
      assignments: this.academy
        .assignments()
        .filter((a) => ids.has(a.personId))
        .map((a) => ({
          id: a.id,
          personId: a.personId,
          courseId: a.courseId,
          courseVersion: a.courseVersion,
          source: a.source,
          type: a.type,
          due: a.due,
          completedAt: a.completedAt,
          archived: a.archived,
        })),
      attempts: s.attempts
        .filter((a) => ids.has(a.personId))
        .map((a) => ({
          id: a.id,
          assignmentId: a.assignmentId,
          personId: a.personId,
          courseId: a.courseId,
          score: a.score,
          passed: a.passed,
          groupId: a.groupId,
          submittedAt: a.submittedAt,
          invalidatedAt: a.invalidatedAt,
          resultId: a.resultId,
        })),
      certificates: s.certificates
        .filter((c) => ids.has(c.personId))
        .map((c) => ({
          id: c.id,
          personId: c.personId,
          courseId: c.courseId,
          courseVersion: c.courseVersion,
          issuedAt: c.issuedAt,
          expires: c.expires,
          revokedAt: c.revokedAt,
          documentId: c.documentId,
          checksum: c.checksum,
        })),
    };
  }
}
