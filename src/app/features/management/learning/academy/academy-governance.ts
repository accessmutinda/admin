import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyReportsApi } from './academy-reports-api.service';
import { AcademyService } from './academy.service';
import { AcademyGovernanceService } from './academy-governance.service';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyDate } from './academy-date';
import {
  AcademyAccessGrant,
  AcademyAdjustment,
  AcademyAuthorisation,
  AcademyCapability,
  AcademyRequirement,
  AcademyReview,
} from './academy-governance.models';
import { addDays, londonDate } from '../../rota/rota.models';
import { ROLES } from '../../../../core/auth/models/role';
@Component({
  selector: 'cv-academy-governance',
  host: {
    class: 'module-page academy-page',
    '[attr.inert]':
      'academy.governanceApi.saving() || academy.certificatesApi.saving() || academy.resultsApi.saving() ? "" : null',
  },
  imports: [
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyDate,
  ],
  templateUrl: './academy-governance.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-governance.css'],
})
export class AcademyGovernancePage {
  protected readonly academy = inject(AcademyService);
  protected readonly operations = inject(AcademyGovernanceService);
  private get workspace() {
    return this.academy.store.companyId();
  }
  protected readonly reports = inject(AcademyReportsApi);
  protected readonly tab = signal('Reviews');
  private readonly allTabs = [
    'Reviews',
    'Requirements & renewals',
    'Adjustments & feedback',
    'Task authorisations',
    'Notifications',
    'Access controls',
    'Records disclosure',
    'Recovery & data',
    'KPI definitions',
  ];
  protected get tabs() {
    const kinds: Record<string, string> = {
      Reviews: 'reviews',
      'Adjustments & feedback': 'adjustments',
      'Task authorisations': 'observations',
      Notifications: 'notifications',
      'Records disclosure': 'disclosures',
      'Recovery & data': 'disclosures',
      'KPI definitions': 'summary',
    };
    return this.allTabs.filter((tab) =>
      tab === 'Access controls'
        ? this.academy.governanceApi.can('edit')
        : !kinds[tab] || this.academy.governanceApi.canRead(kinds[tab]),
    );
  }
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly capabilities: AcademyCapability[] = [
    'author',
    'publish',
    'assign',
    'review',
    'correct',
    'configure',
    'export',
    'evidence',
    'diagnostics',
  ];
  protected readonly roles = Object.values(ROLES);
  protected role = 'HR';
  protected selectedCapabilities: AcademyCapability[] = [];
  protected readonly today = londonDate();
  protected requirement = this.newRequirement();
  protected adjustment = this.newAdjustment();
  protected review = this.newReview();
  protected authorisation = this.newAuthorisation();
  protected grant = this.newGrant();
  protected requirementRoles = '';
  protected requirementBranches = '';
  protected reminderDays = '30, 14, 7';
  protected reason = '';
  protected disclosureDecision = '';
  protected disclosureReference = '';
  protected deliveryText = 'Please review your training assignment.';
  protected deliveryChannel: 'Email' | 'SMS' | 'App' | 'In-platform' = 'In-platform';
  protected deliveryAssignment = '';
  protected correctionCertificate = '';
  protected invalidationAttempt = '';
  protected connected = true;
  protected backupStatus = '';
  constructor() {
    effect(() => {
      const tabs = this.tabs;
      if (!tabs.includes(this.tab())) this.tab.set(tabs[0] ?? 'Requirements & renewals');
    });
    effect(() => {
      if (this.tab() === 'Recovery & data' && this.academy.api.available())
        untracked(() => {
          void this.academy.api
            .load(true)
            .catch((error) => this.error.set((error as Error).message));
        });
    });
    let previous = this.academy.governanceApi.scope();
    effect(() => {
      const scope = this.academy.governanceApi.scope();
      if (scope !== previous) {
        previous = scope;
        untracked(() => {
          this.error.set('');
          this.notice.set('');
          this.review = this.newReview();
          this.adjustment = this.newAdjustment();
          this.authorisation = this.newAuthorisation();
          this.resetRequirement();
          this.reason =
            this.disclosureDecision =
            this.disclosureReference =
            this.deliveryAssignment =
            this.correctionCertificate =
            this.invalidationAttempt =
              '';
          if (this.academy.governanceApi.available())
            void Promise.all([
              this.academy.governanceApi.load(),
              ...(this.academy.assignmentApi.available()
                ? [this.academy.assignmentApi.load(true)]
                : []),
              this.academy.certificatesApi.loadRequirements(),
            ]).catch((error) => {
              if (scope === this.academy.governanceApi.scope())
                this.error.set((error as Error).message);
            });
        });
      }
    });
  }
  protected people() {
    return this.academy.governanceApi
      .people()
      .filter((p) => ['Active', 'Onboarding'].includes(p.status));
  }
  protected assignments() {
    return this.academy.assignments().filter((a) => !a.archived);
  }
  protected name(id: string) {
    return (
      this.academy.governanceApi.people().find((p) => p.id === id)?.name ??
      this.academy.certificatesApi.people().find((p) => p.id === id)?.name ??
      id
    );
  }
  protected title(id: string) {
    return (
      this.academy.governanceApi.courses().find((c) => c.id === id)?.title ??
      this.academy.assignmentApi.courses().find((c) => c.id === id)?.title ??
      this.academy.certificatesApi.requirementCourses().find((c) => c.id === id)?.title ??
      id
    );
  }
  protected result(error: string | null, message = 'Changes saved.') {
    this.error.set(error ?? '');
    this.notice.set(error ? '' : message);
  }
  protected newRequirement(): AcademyRequirement {
    return {
      id: crypto.randomUUID(),
      courseId:
        this.academy.certificatesApi.requirementCourses()[0]?.id ??
        this.academy.governanceApi.courses()[0]?.id ??
        '',
      roles: [],
      branches: [],
      serviceCategory: '',
      effectiveFrom: londonDate(),
      effectiveTo: '',
      minimumVersion: 0,
      allowExternal: false,
      reviewRequired: false,
      renewalMonths: 12,
      reminderDays: [30, 14, 7],
      autoAssign: false,
    };
  }
  protected editRequirement(r: AcademyRequirement) {
    this.requirement = structuredClone(r);
    this.requirementRoles = r.roles.join(', ');
    this.requirementBranches = r.branches.join(', ');
    this.reminderDays = r.reminderDays.join(', ');
  }
  protected resetRequirement() {
    this.requirement = this.newRequirement();
    this.requirementRoles = '';
    this.requirementBranches = '';
    this.reminderDays = '30, 14, 7';
  }
  protected async saveRequirement() {
    const list = (s: string) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    this.requirement.roles = list(this.requirementRoles);
    this.requirement.branches = list(this.requirementBranches);
    this.requirement.reminderDays = list(this.reminderDays).map(Number);
    this.result(
      await this.operations.saveRequirement(this.requirement, this.workspace),
      'Requirement saved. Existing results and issued certificates are retained.',
    );
  }
  protected newAdjustment(): AcademyAdjustment {
    const a = this.academy.assignments().find((a) => !a.archived && !a.completedAt);
    return {
      id: crypto.randomUUID(),
      assignmentId: a?.id ?? '',
      personId: a?.personId ?? '',
      extraMinutes: 15,
      untimed: false,
      reason: '',
      approvedBy: '',
      approvedAt: '',
      expires: addDays(londonDate(), 90),
    };
  }
  protected adjustmentAssignment() {
    this.adjustment.personId =
      this.academy.assignments().find((a) => a.id === this.adjustment.assignmentId)?.personId ?? '';
  }
  protected async saveAdjustment() {
    this.adjustmentAssignment();
    this.result(
      await this.operations.saveAdjustment(this.adjustment, this.workspace),
      'Adjustment approved for new attempts. Running attempts retain their frozen settings.',
    );
  }
  protected canSaveReview() {
    const versioned = this.review as AcademyReview & { version?: number };
    const current = this.operations.data().reviews.find((r) => r.id === this.review.id);
    const transition =
      this.review.status === 'Resolved' ||
      (this.review.status === 'In progress' && current?.status !== 'In progress') ||
      (this.review.status === 'Open' && current?.status === 'In progress');
    return (
      this.academy.governanceApi.can(
        transition ? 'approve' : versioned.version ? 'edit' : 'create',
      ) &&
      (!!versioned.version || this.academy.governanceApi.can('create'))
    );
  }
  protected newReview(): AcademyReview {
    const a = this.academy.assignments().find((a) => !a.archived);
    return {
      id: crypto.randomUUID(),
      personId: a?.personId ?? '',
      assignmentId: a?.id ?? '',
      attemptId: '',
      kind: 'Remedial review',
      status: 'Open',
      ownerId: this.people()[0]?.id ?? '',
      due: addDays(londonDate(), 7),
      reason: '',
      actions: '',
      decision: '',
      resolvedAt: '',
    };
  }
  protected versioned(value: { id: string }) {
    return !!(value as { version?: number }).version;
  }
  protected reviewAssignmentChanged(id: string) {
    if (this.versioned(this.review)) return;
    this.review.personId = this.academy.assignment(id)?.personId ?? '';
    this.review.attemptId = '';
  }
  protected observationReadOnly() {
    return (
      this.operations.data().authorisations.find((row) => row.id === this.authorisation.id)
        ?.status === 'Revoked'
    );
  }
  protected editReview(r: AcademyReview) {
    this.review = structuredClone(r);
    if (!(r as AcademyReview & { version?: number }).version) {
      this.review.ownerId = this.people()[0]?.id ?? '';
      this.review.due = addDays(londonDate(), 7);
    }
  }
  protected async saveReview() {
    this.result(await this.operations.saveReview(this.review, this.workspace));
  }
  protected newAuthorisation(): AcademyAuthorisation {
    return {
      id: crypto.randomUUID(),
      personId: this.people()[0]?.id ?? '',
      courseId: this.academy.governanceApi.courses()[0]?.id ?? '',
      task: '',
      clientId: '',
      location: '',
      assessorId: this.people()[1]?.id ?? '',
      observedAt: londonDate(),
      reviewDue: addDays(londonDate(), 90),
      status: 'Restricted',
      evidence: '',
      restrictions: '',
    };
  }
  protected editAuthorisation(a: AcademyAuthorisation) {
    this.authorisation = structuredClone(a);
  }
  protected async saveAuthorisation() {
    this.result(await this.operations.saveAuthorisation(this.authorisation, this.workspace));
  }
  protected newGrant(): AcademyAccessGrant {
    return {
      id: crypto.randomUUID(),
      email: '',
      role: 'QA',
      personIds: [],
      capabilities: ['evidence'],
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      reason: '',
      approvedBy: '',
      revokedAt: '',
    };
  }
  protected saveGrant() {
    this.result(this.operations.saveGrant(this.grant, this.workspace));
  }
  protected roleChanged() {
    this.selectedCapabilities = [];
  }
  protected saveCapabilities() {
    this.result(this.operations.saveCapabilities(this.role, this.selectedCapabilities));
  }
  protected async queue() {
    const a = this.academy.assignment(this.deliveryAssignment);
    this.result(
      a
        ? await this.operations.queueDelivery(
            a.personId,
            a.id,
            this.deliveryChannel,
            this.deliveryText,
          )
        : 'Choose an assignment.',
      'Notification saved in the recipient’s academy inbox.',
    );
  }
  protected async disclose(id: string, status: 'Approved' | 'Declined' | 'Provided') {
    this.result(
      await this.operations.disclosure(
        id,
        status,
        this.disclosureDecision,
        this.disclosureReference,
      ),
    );
  }
  protected async releaseFeedback(id: string) {
    this.result(await this.operations.releaseFeedback(id));
  }
  protected async invalidate() {
    this.result(
      await this.operations.invalidate(this.invalidationAttempt, this.reason),
      'Original result retained and marked invalidated; it cannot issue current evidence.',
    );
  }
  protected async reissue() {
    this.result(
      await this.operations.reissue(this.correctionCertificate, this.reason),
      'Replacement certificate issued with a traceable link to the original.',
    );
  }
  protected async evaluateRenewals() {
    this.result(
      await this.operations.runSchedules(),
      `${this.academy.governanceApi.summary()?.outstanding ?? 0} outstanding requirement records. Automatic assignment and external delivery require configured workers.`,
    );
  }
  protected async retryMedia(id: string) {
    try {
      await this.academy.api.process(id);
      this.result(null, 'Media processing checked against the saved upload.');
    } catch (error) {
      this.result((error as Error).message);
    }
  }
  protected async exportEvidence() {
    const success = await this.reports.download('evidence-pack', {});
    this.result(
      success ? null : this.reports.error(),
      'Evidence export prepared from authorised server records.',
    );
  }
  protected backup() {
    this.backupStatus = 'Private backups are managed by authorised server operations.';
  }
  protected restore(event: Event) {
    (event.target as HTMLInputElement).value = '';
    this.backupStatus =
      'Browser workspace imports are unavailable. Restore through authorised server operations.';
  }
  protected async retryCertificate(attemptId: string) {
    try {
      await this.academy.certificatesApi.issue(attemptId);
      this.result(null, 'Certificate issued and linked to the staff training file.');
    } catch (e) {
      this.result((e as Error).message);
    }
  }
  protected async reconcile() {
    try {
      await this.academy.certificatesApi.load();
      for (const job of this.academy.certificatesApi
        .completions()
        .filter((j) => j.status === 'CERTIFICATE_PENDING'))
        await this.academy.certificatesApi.issue(job.attemptId);
      this.result(
        null,
        'Valid passing results processed. External integration stages require recorded provider acknowledgements.',
      );
    } catch (e) {
      this.result((e as Error).message);
    }
  }
}
