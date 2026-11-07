import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyAssignment } from './academy.models';
import { AcademyService } from './academy.service';
import { AcademyGovernanceService } from './academy-governance.service';
import { AcademyDemoWorkflow } from './academy-demo-workflow';
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
  host: { class: 'module-page academy-page' },
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
  protected readonly workflow = inject(AcademyDemoWorkflow);
  private readonly workspace = this.academy.store.companyId();
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
    return this.allTabs.filter((t) => t !== 'Access controls' || this.academy.can('configure'));
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
  protected selectedCapabilities: AcademyCapability[] = [
    'assign',
    'review',
    'correct',
    'export',
    'evidence',
  ];
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
    if (this.academy.can('configure')) {
      this.result(
        this.operations.seed(),
        'Seeded review, adjustment, delivery, authorisation and access examples are ready.',
      );
      void this.operations.seedMedia().then((error) => {
        if (error) this.error.set(error);
      });
    }
  }
  protected people() {
    return this.academy.store.staff().filter((p) => this.academy.can('evidence', p.id));
  }
  protected assignments() {
    return this.academy
      .assignments()
      .filter((a) => !a.archived && this.academy.can('evidence', a.personId));
  }
  protected name(id: string) {
    return this.academy.store.staff().find((p) => p.id === id)?.name ?? id;
  }
  protected title(id: string) {
    return this.academy.state().courses.find((c) => c.id === id)?.title ?? id;
  }
  protected result(error: string | null, message = 'Changes saved.') {
    this.error.set(error ?? '');
    this.notice.set(error ? '' : message);
  }
  protected newRequirement(): AcademyRequirement {
    return {
      id: crypto.randomUUID(),
      courseId: this.academy.state().courses[0]?.id ?? '',
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
  protected saveRequirement() {
    const list = (s: string) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    this.requirement.roles = list(this.requirementRoles);
    this.requirement.branches = list(this.requirementBranches);
    this.requirement.reminderDays = list(this.reminderDays).map(Number);
    this.result(
      this.operations.saveRequirement(this.requirement, this.workspace),
      'Requirement saved. Existing results and issued certificates are retained.',
    );
  }
  protected newAdjustment(): AcademyAdjustment {
    const a = this.academy.assignments().find((a) => !a.archived);
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
  protected saveAdjustment() {
    this.adjustmentAssignment();
    this.result(
      this.operations.saveAdjustment(this.adjustment, this.workspace),
      'Adjustment approved for new attempts. Running attempts retain their frozen settings.',
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
      ownerId: this.academy.store.staff()[0]?.id ?? '',
      due: addDays(londonDate(), 7),
      reason: '',
      actions: '',
      decision: '',
      resolvedAt: '',
    };
  }
  protected editReview(r: AcademyReview) {
    this.review = structuredClone(r);
  }
  protected saveReview() {
    this.result(this.operations.saveReview(this.review, this.workspace));
  }
  protected newAuthorisation(): AcademyAuthorisation {
    return {
      id: crypto.randomUUID(),
      personId: this.academy.store.staff()[0]?.id ?? '',
      courseId: this.academy.state().courses[0]?.id ?? '',
      task: '',
      clientId: '',
      location: '',
      assessorId: this.academy.store.staff()[1]?.id ?? '',
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
  protected saveAuthorisation() {
    this.result(this.operations.saveAuthorisation(this.authorisation, this.workspace));
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
    const defaults: Record<string, AcademyCapability[]> = {
      HR: ['assign', 'review', 'correct', 'export', 'evidence'],
      TM: ['author', 'publish', 'assign', 'review', 'export', 'evidence'],
      QA: ['evidence', 'export'],
      CO: ['evidence', 'export'],
    };
    this.selectedCapabilities =
      this.operations.data().capabilityRoles?.[this.role] ?? defaults[this.role] ?? [];
  }
  protected saveCapabilities() {
    this.result(this.operations.saveCapabilities(this.role, this.selectedCapabilities));
  }
  protected queue() {
    const a = this.academy.assignment(this.deliveryAssignment);
    this.result(
      a
        ? this.operations.queueDelivery(a.personId, a.id, this.deliveryChannel, this.deliveryText)
        : 'Choose an assignment.',
      'Notification queued for local simulation.',
    );
  }
  protected disclose(id: string, status: 'Approved' | 'Declined' | 'Provided') {
    this.result(
      this.operations.disclosure(id, status, this.disclosureDecision, this.disclosureReference),
    );
  }
  protected invalidate() {
    this.result(
      this.operations.invalidate(this.invalidationAttempt, this.reason),
      'Original result retained and marked invalidated; it cannot issue current evidence.',
    );
  }
  protected reissue() {
    this.result(
      this.operations.reissue(this.correctionCertificate, this.reason),
      'Replacement evidence queued with a traceable link to the original certificate.',
    );
  }
  protected exportEvidence() {
    const data = this.operations.redactedEvidence();
    if (!data) {
      this.result('Export permission is required.');
      return;
    }
    const error = this.academy.recordReport('Redacted Academy evidence', this.workspace);
    this.result(
      error,
      'Redacted evidence prepared without keys, responses, PDF bytes or private notes.',
    );
    if (!error)
      this.academy.store.download(
        'academy-evidence.json',
        JSON.stringify(data, null, 2),
        'application/json',
      );
  }
  protected backup() {
    if (!this.academy.can('configure')) return;
    const snapshot = {
      format: 'careverity-academy-demo-v1',
      workspace: this.workspace,
      createdAt: new Date().toISOString(),
      data: this.academy.store.data(),
    };
    this.academy.store.download(
      'academy-demo-backup.json',
      JSON.stringify(snapshot, null, 2),
      'application/json',
    );
    this.backupStatus =
      'Private demo backup prepared, including protected workspace records. Media blobs remain in this browser.';
  }
  protected async restore(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file || !this.academy.can('configure')) return;
    try {
      const snapshot = JSON.parse(await file.text());
      if (
        snapshot.format !== 'careverity-academy-demo-v1' ||
        snapshot.workspace !== this.workspace ||
        !snapshot.data?.academy ||
        !Array.isArray(snapshot.data.people) ||
        !Array.isArray(snapshot.data.academy.assignments) ||
        !Array.isArray(snapshot.data.academy.attempts)
      )
        throw new Error('Use a valid backup from this workspace.');
      if (this.workspace !== this.academy.store.companyId()) throw new Error('Workspace changed.');
      const ids = new Set(snapshot.data.people.map((p: { id: string }) => p.id));
      if (snapshot.data.academy.assignments.some((a: AcademyAssignment) => !ids.has(a.personId)))
        throw new Error('The backup contains unmatched staff records.');
      this.result(
        this.academy.store.saveWorkspace(() => snapshot.data) ? null : 'Could not restore backup.',
        'Demo records restored. Run reconciliation to verify evidence links. Local media must remain available separately.',
      );
    } catch (e) {
      this.result((e as Error).message);
    }
  }
  protected async reconcile() {
    this.workflow.reconcile();
    for (const j of this.academy.state().completions ?? [])
      if (j.status !== 'COMPLETE_SYNCED') {
        if (j.status === 'SYNC_EXCEPTION') {
          const e = this.workflow.retry(j.id);
          if (e) {
            this.result(e);
            return;
          }
        }
        await this.workflow.process(j.id);
      }
    this.result(null, 'Reconciliation evaluated saved passes, certificates and workflow stages.');
  }
}
