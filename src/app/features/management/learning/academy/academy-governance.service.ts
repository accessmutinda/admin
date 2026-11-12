import { Injectable, computed, inject } from '@angular/core';
import { AcademyService } from './academy.service';
import { AcademyGovernanceApi } from './academy-governance-api.service';
import {
  AcademyAdjustment,
  AcademyAuthorisation,
  AcademyRequirement,
  AcademyReview,
  AcademyAccessGrant,
  AcademyCapability,
} from './academy-governance.models';

@Injectable({ providedIn: 'root' })
export class AcademyGovernanceService {
  readonly academy = inject(AcademyService);
  readonly api = inject(AcademyGovernanceApi);
  readonly data = computed(() => ({
    ...this.api.data(),
    requirements: this.academy.certificatesApi.requirements(),
  }));
  kpis() {
    return (
      this.api.summary() ?? {
        finalPassRate: '—',
        checkpointPassRate: '—',
        exceptions: null,
        currency: '—',
      }
    );
  }
  private workspace() {
    return this.academy.store.companyId();
  }
  private async save(work: () => Promise<unknown>, workspace = this.workspace()) {
    if (workspace !== this.workspace()) return 'The workspace changed. Reopen this page.';
    try {
      await work();
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  }
  saveRequirement(value: AcademyRequirement, workspace = this.workspace()) {
    return this.save(() => this.academy.certificatesApi.saveRequirement(value), workspace);
  }
  saveAdjustment(value: AcademyAdjustment, workspace = this.workspace()) {
    return this.save(() => this.api.approveAdjustment(value), workspace);
  }
  saveReview(value: AcademyReview, workspace = this.workspace()) {
    return this.save(() => this.api.saveReview(value), workspace);
  }
  saveAuthorisation(value: AcademyAuthorisation, workspace = this.workspace()) {
    return this.save(() => this.api.saveObservation(value), workspace);
  }
  releaseFeedback(id: string) {
    return this.save(() => this.academy.resultsApi.releaseFeedback(id));
  }
  invalidate(id: string, reason: string) {
    return this.save(() => this.academy.resultsApi.invalidate(id, reason));
  }
  reissue(id: string, reason: string) {
    return this.save(() => this.academy.certificatesApi.reissue(id, reason));
  }
  queueDelivery(_personId: string, assignmentId: string, channel: string, text: string) {
    return this.save(() => this.api.queue(assignmentId, channel, text));
  }
  async disclosure(
    id: string,
    status: 'Approved' | 'Declined' | 'Provided',
    decision: string,
    reference: string,
  ) {
    const row = this.academy.certificatesApi.requests().find((r) => r.id === id);
    if (!row) return 'Records request unavailable.';
    return this.save(async () => {
      await this.api.disclose(row, status, decision, reference);
      await this.academy.certificatesApi.load();
    });
  }
  runSchedules() {
    if (!this.api.canRead('summary'))
      return Promise.resolve('Requirement evaluation needs access to its source records.');
    return this.save(() => this.api.load());
  }
  processDelivery(_id: string, _retry = false) {
    return 'In-app delivery is acknowledged by the authenticated recipient. External delivery is not configured.';
  }
  setChannelFailure(_value: boolean) {
    return 'Delivery simulations are unavailable. Provider outcomes require actual acknowledgements.';
  }
  setOffline(_value: boolean) {
    return 'Policies require a server connection. Offline changes are not accepted.';
  }
  saveGrant(_value: AcademyAccessGrant, _workspace = this.workspace()) {
    return 'Use Company access. Time-limited and per-person grants require a supported access adapter.';
  }
  revokeGrant(_id: string) {
    return 'Manage grants in Company access.';
  }
  saveCapabilities(_role: string, _values: AcademyCapability[]) {
    return 'Manage role actions in Company access; academy policies do not grant permissions.';
  }
  seed() {
    return 'Policy examples are not available in live workspaces.';
  }
  async seedMedia() {
    return 'Upload approved learning media through Courses & modules.';
  }
  redactedEvidence() {
    return null;
  }
}
