import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Component, computed, effect, inject, signal, DestroyRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyDate } from './academy-date';
import { AcademyImage } from './academy-image';
import { AcademyCertificate, AcademySyncStatus } from './academy.models';
import { londonDate } from '../../rota/rota.models';

@Component({
  selector: 'cv-academy-compliance-review',
  host: {
    class: 'module-page academy-page',
    '[attr.inert]': 'academy.certificatesApi.saving() ? "" : null',
  },
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly record = computed(() =>
    this.academy.certificatesApi
      .records()
      .find((r) => r.certificate.id === this.params().get('certificateId')),
  );
  protected readonly certificate = computed(() => this.record()?.certificate);
  protected readonly person = computed(() => this.record()?.person);
  protected readonly job = computed(() => this.record()?.completion);
  private jobFor(c: AcademyCertificate) {
    return this.academy.certificatesApi.records().find((r) => r.certificate.id === c.id)
      ?.completion;
  }
  protected readonly document = computed(() => this.record()?.document);
  protected readonly training = computed(() => this.record()?.training);
  protected readonly currentTraining = computed(() => this.record()?.currentTraining);
  protected readonly refresher = computed(() => this.record()?.refresher);
  protected readonly period = signal('30');
  protected readonly auditOpen = signal(false);
  protected readonly matrixOpen = signal(false);
  protected readonly revokeOpen = signal(false);
  protected reason = '';
  protected readonly error = signal('');
  protected readonly notice = signal('');
  private lastAccess = '';
  private lastPdfSource = '';
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly pdfPreview = signal<SafeResourceUrl | null>(null);
  private pdfUrl = '';
  private destroyed = false;
  private pdfSource() {
    const c = this.certificate();
    return this.academy.store.companyId() + ':' + c?.id + ':' + c?.version + ':' + c?.state;
  }
  protected closePdf() {
    if (this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
    this.pdfUrl = '';
    this.pdfPreview.set(null);
  }
  protected async previewFiled() {
    const c = this.certificate();
    if (!c) return;
    const source = this.pdfSource();
    try {
      const blob = await this.academy.certificatesApi.pdf(c.id);
      if (this.destroyed || source !== this.pdfSource()) return;
      this.closePdf();
      this.pdfUrl = URL.createObjectURL(blob);
      this.pdfPreview.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl));
    } catch (e) {
      if (!this.destroyed && source === this.pdfSource()) this.error.set((e as Error).message);
    }
  }
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.closePdf();
    });
    effect(() => {
      const certificate = this.certificate();
      const access = this.academy.store.companyId() + ':' + (certificate?.id ?? '');
      const pdfSource = access + ':' + certificate?.version + ':' + certificate?.state;
      if (pdfSource !== this.lastPdfSource) {
        this.lastPdfSource = pdfSource;
        this.closePdf();
      }
      if (access === this.lastAccess) return;
      this.lastAccess = access;
      this.closePdf();
      this.auditOpen.set(false);
      this.matrixOpen.set(false);
      this.revokeOpen.set(false);
      this.error.set('');
      this.notice.set('');
      this.reason = '';
    });
  }
  protected today() {
    return londonDate();
  }
  protected accessEvents() {
    return this.record()?.events ?? [];
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
      this.certificate()?.state === 'Current' &&
      !this.record()?.matrix.find((r) => r.courseId === this.certificate()?.courseId)?.missing
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
              : this.record()?.matrix.some(
                    (r) => r.courseId === this.certificate()?.courseId && r.missing,
                  )
                ? 'Requirements outstanding'
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
    const synced = certs.filter((x) =>
      this.academy.certificatesApi
        .records()
        .some((r) => r.certificate.id === x.id && r.document.id === x.documentId),
    ).length;
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
        value: jobs.filter((j) => j.acknowledgements.some((a) => a.stage === 'COMPLIANCE_PENDING'))
          .length,
        caption: 'Recorded recalculation acknowledgements',
        icon: 'verified_user',
        tone: 'green',
      },
      {
        label: 'Refresher Reviews Due',
        value: schedules.length,
        caption: 'Calculated from current certificate validity',
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
      { label: 'Compliance Recalculated', icon: 'verified_user', stage: 'COMPLIANCE_PENDING' },
      {
        label: 'Refresher Review Due',
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
    return this.record()?.matrix ?? [];
  }
  protected canViewRota() {
    return false;
  }
  protected visits(): {
    id: string;
    label: string;
    date: string;
    reasons: string[];
    eligible: boolean;
  }[] {
    return [];
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
    this.error.set(this.record()?.integration.detail ?? 'Integration unavailable.');
  }
  protected async revoke() {
    const c = this.certificate();
    if (!c) return;
    const error = await this.academy.revokeCertificate(
      c.id,
      this.reason,
      this.academy.store.companyId(),
    );
    this.error.set(error ?? '');
    if (!error) {
      this.reason = '';
      this.revokeOpen.set(false);
      this.notice.set(
        'Evidence revoked. Original history is retained and current checks have been refreshed.',
      );
    }
  }
  protected async download() {
    const c = this.certificate();
    if (!c) return;
    try {
      await this.academy.certificatesApi.download(c.id);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
