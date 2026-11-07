import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Component, computed, effect, inject, signal, untracked, DestroyRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyDemoWorkflow } from './academy-demo-workflow';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyDate } from './academy-date';
import { AcademyImage } from './academy-image';
import { AcademyCertificate, AcademySyncStatus } from './academy.models';
import { RotaService } from '../../rota/rota.service';
import { londonDate } from '../../rota/rota.models';

@Component({
  selector: 'cv-academy-compliance-review',
  host: { class: 'module-page academy-page' },
  imports: [
    RouterLink,
    FormsModule,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyDate,
    AcademyImage,
  ],
  templateUrl: './academy-compliance-review.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-compliance-review.css'],
})
export class AcademyComplianceReview {
  protected readonly academy = inject(AcademyService);
  private readonly workflow = inject(AcademyDemoWorkflow);
  private readonly rota = inject(RotaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly certificate = computed(() =>
    this.academy.canViewEvidence()
      ? this.academy.certificate(this.params().get('certificateId') ?? '')
      : undefined,
  );
  protected readonly person = computed(() =>
    this.academy.store.staff().find((p) => p.id === this.certificate()?.personId),
  );
  protected readonly job = computed(() => {
    const c = this.certificate();
    return c ? this.jobFor(c) : undefined;
  });
  private jobFor(c: AcademyCertificate) {
    return this.academy.state().completions?.find((j) => {
      if (
        j.tenantId !== this.academy.store.companyId() ||
        j.personId !== c.personId ||
        j.assignmentId !== c.assignmentId
      )
        return false;
      if (j.certificateId && j.certificateId !== c.id) return false;
      if (c.replacesId && j.certificateId !== c.id) return false;
      if (c.passedAttemptId) return j.attemptId === c.passedAttemptId;
      const attempt = this.academy.attempt(j.attemptId);
      return (
        !!attempt?.passed &&
        !!attempt.submittedAt &&
        !attempt.groupId &&
        attempt.personId === c.personId &&
        attempt.assignmentId === c.assignmentId &&
        j.acknowledgements.some((a) => a.stage === 'CERTIFICATE_GENERATED' && a.reference === c.id)
      );
    });
  }
  protected readonly document = computed(() => {
    const c = this.certificate(),
      j = this.job();
    return c && j && c.documentId === j.documentId
      ? this.person()?.documents?.find(
          (d) => d.id === j.documentId && d.category === 'Training & Certificates',
        )
      : undefined;
  });
  protected readonly training = computed(() => {
    const c = this.certificate(),
      j = this.job(),
      hr = this.person()?.hr;
    return c && j
      ? [...(hr?.training ?? []), ...(hr?.trainingHistory ?? [])].find(
          (t) => t.certificateId === c.id && t.sourceCompletionId === j.id,
        )
      : undefined;
  });
  protected readonly currentTraining = computed(() =>
    this.person()?.hr?.training.find((t) => t.courseId === this.certificate()?.courseId),
  );
  protected readonly refresher = computed(() =>
    this.academy
      .state()
      .refresherSchedules?.find(
        (s) =>
          s.tenantId === this.academy.store.companyId() &&
          s.completionId === this.job()?.id &&
          s.personId === this.certificate()?.personId &&
          !s.cancelledAt,
      ),
  );
  protected readonly period = signal('30');
  protected readonly auditOpen = signal(false);
  protected readonly matrixOpen = signal(false);
  protected readonly revokeOpen = signal(false);
  protected reason = '';
  protected readonly error = signal('');
  protected readonly notice = signal('');
  private lastAccess = '';
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly pdfPreview = signal<SafeResourceUrl | null>(null);
  private pdfUrl = '';
  protected closePdf() {
    if (this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
    this.pdfUrl = '';
    this.pdfPreview.set(null);
  }
  protected previewFiled() {
    const d = this.document();
    if (!d || !this.academy.canReadCertificate()) return;
    const error = this.academy.recordCertificateAccess(
      this.certificate()!.id,
      'Filed PDF',
      this.academy.store.companyId(),
    );
    if (error) {
      this.error.set(error);
      return;
    }
    this.closePdf();
    const bytes = Uint8Array.from(atob(d.content.split(',')[1]), (c) => c.charCodeAt(0));
    this.pdfUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    this.pdfPreview.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl));
  }
  constructor() {
    inject(DestroyRef).onDestroy(() => this.closePdf());
    effect(() => {
      const certificate = this.certificate();
      const access = this.academy.store.companyId() + ':' + (certificate?.id ?? '');
      if (access === this.lastAccess) return;
      this.lastAccess = access;
      this.closePdf();
      this.auditOpen.set(false);
      this.matrixOpen.set(false);
      this.revokeOpen.set(false);
      this.error.set('');
      this.notice.set('');
      this.reason = '';
      if (certificate)
        untracked(() => {
          const error = this.academy.recordCertificateAccess(
            certificate.id,
            'Preview',
            this.academy.store.companyId(),
          );
          if (error) this.error.set(error);
        });
    });
  }
  protected today() {
    return londonDate();
  }
  protected accessEvents() {
    const c = this.certificate();
    return this.academy
      .state()
      .events.filter(
        (e) =>
          e.personId === c?.personId &&
          e.action === 'Certificate accessed' &&
          e.detail.endsWith(': ' + c?.id),
      );
  }
  protected expired() {
    const c = this.certificate();
    return !!c?.expires && c.expires < this.today();
  }
  protected active() {
    return !!this.certificate() && !this.certificate()?.revokedAt && !this.expired();
  }
  protected ack(stage: AcademySyncStatus) {
    return this.job()?.acknowledgements.find((a) => a.stage === stage);
  }
  protected filed() {
    return !!this.document() && !!this.ack('TRAINING_RECORD_PENDING');
  }
  protected recorded() {
    return !!this.training() && !!this.ack('COMPLIANCE_PENDING');
  }
  protected courseCurrent() {
    return (
      this.active() &&
      this.filed() &&
      this.recorded() &&
      this.currentTraining()?.certificateId === this.certificate()?.id &&
      this.currentTraining()?.evidenceStatus !== 'Revoked' &&
      this.job()?.status === 'COMPLETE_SYNCED'
    );
  }
  protected completed() {
    return (
      this.active() &&
      this.filed() &&
      this.recorded() &&
      this.job()?.status === 'COMPLETE_SYNCED' &&
      this.steps().every((s) => s.done || s.notApplicable)
    );
  }
  protected recordStatus() {
    return this.certificate()?.revokedAt
      ? 'Revoked'
      : this.expired()
        ? 'Expired'
        : !this.recorded()
          ? 'Update pending'
          : this.currentTraining()?.certificateId !== this.certificate()?.id
            ? 'Historical — newer evidence applies'
            : this.courseCurrent()
              ? 'Valid & Active'
              : 'Integration pending';
  }
  protected staffCertificates() {
    return this.academy
      .state()
      .certificates.filter((c) => c.personId === this.certificate()?.personId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }
  protected selectCertificate(id: string) {
    void this.router.navigate(['/manage/learning/certificates', id]);
  }
  protected stats() {
    const c = this.certificate(),
      days = this.period();
    const cutoff =
      days === 'all' ? '' : new Date(Date.now() - Number(days) * 86400000).toISOString();
    const certs = this.academy
      .state()
      .certificates.filter((x) => x.personId === c?.personId && (!cutoff || x.issuedAt >= cutoff));
    const jobs = certs.map((x) => this.jobFor(x)).filter((j) => !!j);
    const synced = certs.filter((x) => {
      const j = this.jobFor(x);
      return (
        j &&
        j.documentId === x.documentId &&
        j.acknowledgements.some((a) => a.stage === 'TRAINING_RECORD_PENDING') &&
        this.person()?.documents?.some((d) => d.id === x.documentId)
      );
    }).length;
    const schedules =
      this.academy
        .state()
        .refresherSchedules?.filter(
          (s) =>
            s.personId === c?.personId &&
            s.tenantId === this.academy.store.companyId() &&
            !s.cancelledAt &&
            certs.some((x) => this.jobFor(x)?.id === s.completionId),
        ) ?? [];
    return [
      {
        label: 'Certificates Issued',
        value: certs.length,
        caption: 'Issued in the selected period',
        icon: 'workspace_premium',
        tone: 'blue',
      },
      {
        label: 'HR File Sync Success',
        value: certs.length ? Math.round((synced / certs.length) * 100) + '%' : '—',
        caption: `${synced} of ${certs.length} attachments acknowledged`,
        icon: 'folder',
        tone: 'blue',
      },
      {
        label: 'Compliance Updates',
        value: jobs.filter((j) =>
          j.acknowledgements.some((a) => a.stage === 'ROTA_REFRESH_PENDING'),
        ).length,
        caption: 'Recorded recalculation acknowledgements',
        icon: 'verified_user',
        tone: 'green',
      },
      {
        label: 'Refreshers Scheduled',
        value: schedules.length,
        caption: 'Active renewal schedules for these issues',
        icon: 'event_available',
        tone: 'purple',
      },
    ];
  }
  protected steps() {
    const r = this.refresher();
    const items: {
      label: string;
      icon: string;
      stage: AcademySyncStatus;
      check?: boolean;
      notApplicable?: boolean;
      detail?: string;
    }[] = [
      { label: 'Certificate Generated', icon: 'workspace_premium', stage: 'CERTIFICATE_GENERATED' },
      {
        label: 'Saved to HR File',
        icon: 'folder',
        stage: 'TRAINING_RECORD_PENDING',
        check: this.filed(),
      },
      {
        label: 'Training Record Updated',
        icon: 'school',
        stage: 'COMPLIANCE_PENDING',
        check: this.recorded(),
      },
      { label: 'Compliance Recalculated', icon: 'verified_user', stage: 'ROTA_REFRESH_PENDING' },
      {
        label: 'Refresher Schedule Created',
        icon: 'event_available',
        stage: 'COMPLIANCE_PENDING',
        check: !!r,
        notApplicable: this.recorded() && !this.certificate()?.expires,
        detail: r
          ? 'Due ' + r.due
          : this.recorded() && !this.certificate()?.expires
            ? 'Not required by frozen validity policy'
            : 'No active schedule recorded',
      },
      { label: 'Rota Training Inputs Updated', icon: 'event_available', stage: 'COMPLETE_SYNCED' },
    ];
    return items.map((s) => ({
      ...s,
      done: !!this.ack(s.stage) && s.check !== false,
      at: this.ack(s.stage)?.at ?? '',
    }));
  }
  protected matrix() {
    const person = this.person();
    return this.academy
      .state()
      .courses.filter(
        (c) =>
          c.status === 'Published' &&
          c.mandatory &&
          (!c.targetRoles?.length || (!!person && c.targetRoles.includes(person.role))) &&
          (!c.effectiveDate || c.effectiveDate <= this.today()),
      )
      .map((c) => ({
        title: c.title,
        missing: this.academy
          .knowledgeCompliance(person?.id ?? '')
          .missing.some((m) => m.id === c.id),
      }));
  }
  protected canViewRota() {
    return this.rota.can('view');
  }
  protected visits() {
    if (!this.canViewRota()) return [];
    const id = this.person()?.id;
    return this.rota
      .data()
      .visits.filter(
        (v) => v.staffIds.includes(id ?? '') && v.date >= this.today() && v.state !== 'Cancelled',
      )
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .slice(0, 5)
      .map((v) => {
        const reasons = this.rota.conflicts(v);
        return {
          id: v.id,
          label:
            v.taskType ||
            this.rota.data().calls.find((c) => c.id === v.callId)?.name ||
            'Assigned visit',
          date: v.date,
          reasons,
          eligible: reasons.length === 0,
        };
      });
  }
  protected outcome() {
    const c = this.certificate();
    if (c?.revokedAt)
      return 'Evidence revoked. The original certificate and processing history are retained; current training and rota checks must use valid evidence.';
    if (this.expired())
      return 'This certificate has expired. Review the staff member’s current training evidence and renewal requirements.';
    if (this.completed())
      return (
        'Certificate issued and stored; training, compliance and rota training updates acknowledged for ' +
        (this.person()?.name ?? c?.learner) +
        '. Visit-specific suitability remains separate.'
      );
    return (
      this.job()?.error ||
      'Certificate and integration review in progress. Only recorded acknowledgements are shown as complete.'
    );
  }
  protected retry() {
    const j = this.job();
    if (j) this.error.set(this.workflow.retry(j.id) ?? '');
  }
  protected revoke() {
    const c = this.certificate();
    if (!c) return;
    const error = this.academy.revokeCertificate(c.id, this.reason, this.academy.store.companyId());
    this.error.set(error ?? '');
    if (!error) {
      this.reason = '';
      this.revokeOpen.set(false);
      this.notice.set(
        'Evidence revoked. Original history is retained and current checks have been refreshed.',
      );
    }
  }
  protected download() {
    if (!this.academy.canReadCertificate()) return;
    const d = this.document();
    if (!this.filed() || !d?.content.startsWith('data:application/pdf;base64,')) {
      this.error.set('The filed PDF is not available yet.');
      return;
    }
    const error = this.academy.recordCertificateAccess(
      this.certificate()!.id,
      'Filed PDF',
      this.academy.store.companyId(),
    );
    if (error) {
      this.error.set(error);
      return;
    }
    const a = window.document.createElement('a');
    a.href = d.content;
    a.download = d.name;
    a.click();
  }
}
