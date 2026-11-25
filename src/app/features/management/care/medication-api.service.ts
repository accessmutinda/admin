import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { Prescription } from './care.models';
import { isMarMonth } from './medication-time';
import type {
  MedicationRead,
  MedicationMarReport,
  MedicationWorkspace,
  MedicationWrite,
  MedicationWitnessRead,
  CovertAuthorityRead,
  CovertAuthorityRegister,
  CovertAuthorityWrite,
  CovertAuthorityTransition,
  MarRead,
  MarWrite,
} from './medication.generated';
export type SavedMedication = Prescription & { etag: string; version: number };
export type SavedAdministration = Omit<MarRead, 'doseUnits' | 'correctionOf'> & {
  doseUnits: number | null;
  correctionOf?: string;
};
export type MarRecordDraft = Pick<
  MarWrite,
  | 'date'
  | 'time'
  | 'outcome'
  | 'actualAt'
  | 'witnessApprovalId'
  | 'covertAuthorityId'
  | 'covertAcknowledged'
> & {
  doseUnits: number | null;
  reason: string;
  response: string;
};
export type MedicationData = Omit<MedicationWorkspace, 'prescriptions' | 'administrations'> & {
  prescriptions: SavedMedication[];
  administrations: SavedAdministration[];
};
@Injectable()
export class MedicationApi {
  readonly records = inject(ServiceUsersApi);
  readonly access = this.records.access;
  private readonly auth = inject(AuthService);
  readonly scope = this.records.scope;
  readonly readable = computed(
    () => this.records.allowed() && this.access.can('care', 'medication', 'read'),
  );
  can(action: string): boolean {
    return (
      this.readable() &&
      this.access.can('care', 'medication', action) &&
      (action !== 'export' || this.access.can('care', 'records', 'export'))
    );
  }
  private root(id: string): string {
    if (!this.readable() || !this.records.companyId() || !id)
      throw Error('Medication records are unavailable.');
    return `/companies/${this.records.companyId()}/service-users/${id}/medications`;
  }
  private validate<T extends { company_id: string }>(row: T, scope: string): T {
    if (scope !== this.scope() || !this.readable() || row.company_id !== this.records.companyId())
      throw Error('The workspace changed. Reopen the medication record.');
    return row;
  }
  project(row: MedicationRead): SavedMedication {
    return {
      ...row,
      end: row.end ?? '',
      stock: row.stock === null ? null : Number(row.stock),
      lowStock: Number(row.lowStock),
      prnMax: row.prnMax == null ? null : Number(row.prnMax),
      prnInterval: row.prnInterval == null ? null : Number(row.prnInterval),
    } as SavedMedication;
  }
  private administration(row: MarRead): SavedAdministration {
    return {
      ...row,
      doseUnits: row.outcome === 'Given' && row.doseUnits !== null ? Number(row.doseUnits) : null,
      correctionOf: row.correctionOf ?? undefined,
    };
  }
  async load(id: string): Promise<MedicationData> {
    const scope = this.scope();
    const row = this.validate(await this.auth.api<MedicationWorkspace>(this.root(id)), scope);
    if (row.service_user_id !== id)
      throw Error('The returned medication workspace belongs to another service user.');
    return {
      ...row,
      prescriptions: row.prescriptions.map((m) => this.project(m)),
      administrations: row.administrations.map((a) => this.administration(a)),
    };
  }
  async marReport(
    id: string,
    month: string,
    sheet: MedicationMarReport['sheet'],
  ): Promise<MedicationMarReport> {
    const scope = this.scope();
    const query = new URLSearchParams({ month, sheet });
    const report = this.validate(
      await this.auth.api<MedicationMarReport>(`${this.root(id)}/mar?${query}`),
      scope,
    );
    if (report.service_user_id !== id || report.month !== month || report.sheet !== sheet)
      throw Error('The returned MAR report does not match the selected record and period.');
    if (
      !Array.isArray(report.notes) ||
      !Array.isArray(report.staff) ||
      !Array.isArray(report.summary?.outcomes) ||
      !Array.isArray(report.codes) ||
      report.codes.some((code) => typeof code.description !== 'string') ||
      !Array.isArray(report.dates) ||
      !Array.isArray(report.prescriptions) ||
      !report.prescriptions.every((prescription) =>
        prescription.slots.every(
          (slot) =>
            slot.cells.length === report.dates.length &&
            slot.cells.every((cell, index) => cell.date === report.dates[index]),
        ),
      )
    )
      throw Error('The saved MAR report is incomplete.');
    return report;
  }
  async detail(id: string, medication: string): Promise<SavedMedication> {
    const scope = this.scope();
    const row = this.validate(
      await this.auth.api<MedicationRead>(`${this.root(id)}/${medication}`),
      scope,
    );
    if (row.service_user_id !== id || row.id !== medication)
      throw Error('The returned medication does not match this editor.');
    return this.project(row);
  }
  async save(
    id: string,
    draft: Prescription,
    original: SavedMedication | undefined,
    key: string,
  ): Promise<void> {
    const scope = this.scope();
    const fields = [
      'name',
      'strength',
      'form',
      'route',
      'dose',
      'frequency',
      'weekdays',
      'times',
      'start',
      'end',
      'prescriber',
      'pharmacy',
      'indication',
      'support',
      'controlled',
      'requiresMar',
      'stock',
      'lowStock',
      'stockLocation',
      'dispensing',
      'covert',
      'covertAuthority',
      'monitoring',
      'notes',
      'prnIndication',
      'prnMax',
      'prnInterval',
    ] satisfies (keyof MedicationWrite)[];
    const body = Object.fromEntries(
      fields.map((field) => [field, draft[field]]),
    ) as MedicationWrite;
    body.end = draft.end || null;
    for (const field of ['stock', 'lowStock', 'prnMax', 'prnInterval'] as const) {
      const value = draft[field];
      (body as Record<string, unknown>)[field] = value === null ? null : String(value);
    }
    const row = await this.auth.api<MedicationRead>(
      `${this.root(id)}${original ? '/' + original.id : ''}`,
      body,
      original ? 'PATCH' : 'POST',
      original ? { 'If-Match': original.etag } : { 'Idempotency-Key': key },
    );
    this.validate(row, scope);
  }
  async command(
    id: string,
    row: SavedMedication,
    command: string,
    reason: string,
    amount: number,
    key: string,
  ): Promise<void> {
    const scope = this.scope();
    this.validate(
      await this.auth.api<MedicationRead>(
        `${this.root(id)}/${row.id}/${command}`,
        command === 'stock' ? { reason, amount: String(amount) } : { reason },
        'POST',
        { 'If-Match': row.etag, 'Idempotency-Key': key },
      ),
      scope,
    );
  }
  async record(
    id: string,
    row: SavedMedication,
    draft: MarRecordDraft,
    original: SavedAdministration | undefined,
    key: string,
  ): Promise<void> {
    const scope = this.scope();
    const result = await this.auth.api<MarRead>(
      `${this.root(id)}/${row.id}/administrations${original ? '/' + original.id : ''}`,
      this.marBody(draft),
      original ? 'PATCH' : 'POST',
      { 'If-Match': original?.etag ?? row.etag, 'Idempotency-Key': key },
    );
    this.validate(result, scope);
  }
  private marBody(draft: MarRecordDraft): MarWrite {
    return {
      date: draft.date,
      time: draft.time,
      outcome: draft.outcome,
      actualAt: draft.actualAt,
      doseUnits: draft.doseUnits === null ? null : String(draft.doseUnits),
      reason: draft.reason,
      response: draft.response,
      witnessApprovalId: draft.witnessApprovalId,
      covertAuthorityId: draft.covertAuthorityId,
      covertAcknowledged: draft.covertAcknowledged,
    };
  }
  async covertAuthorities(
    id: string,
    medication: SavedMedication,
    proposal?: { draft: CovertAuthorityWrite; key: string },
    transition?: { authority: CovertAuthorityRead; body: CovertAuthorityTransition },
  ): Promise<CovertAuthorityRead[]> {
    const scope = this.scope();
    const path = `${this.root(id)}/${medication.id}/covert-authorities`;
    const response = this.validate(
      await this.auth.api<CovertAuthorityRegister>(
        transition ? `${path}/${transition.authority.id}` : path,
        transition?.body ?? proposal?.draft,
        transition ? 'PATCH' : proposal ? 'POST' : undefined,
        transition
          ? { 'If-Match': transition.authority.etag }
          : proposal
            ? { 'If-Match': medication.etag, 'Idempotency-Key': proposal.key }
            : undefined,
      ),
      scope,
    );
    if (response.medicationId !== medication.id || !Array.isArray(response.records))
      throw Error('The covert authority register is unavailable.');
    return response.records;
  }
  async requestWitness(
    id: string,
    row: SavedMedication,
    draft: MarRecordDraft,
    original?: SavedAdministration,
  ): Promise<MedicationWitnessRead> {
    const scope = this.scope();
    return this.validate(
      await this.auth.api<MedicationWitnessRead>(
        `${this.root(id)}/${row.id}/witness-approvals`,
        { draft: this.marBody(draft), correctionOf: original?.id ?? null },
        'POST',
        { 'If-Match': original?.etag ?? row.etag },
      ),
      scope,
    );
  }
  async witnessApproval(
    id: string,
    medicationId: string,
    approvalId: string,
    attest = false,
  ): Promise<MedicationWitnessRead> {
    const scope = this.scope();
    const result = this.validate(
      await this.auth.api<MedicationWitnessRead>(
        `${this.root(id)}/${medicationId}/witness-approvals/${approvalId}`,
        attest ? { attested: true } : undefined,
        attest ? 'PATCH' : undefined,
      ),
      scope,
    );
    if (result.id !== approvalId || result.medicationId !== medicationId)
      throw Error('The witness request is unavailable.');
    return result;
  }
  async export(
    id: string,
    period?: { month: string; sheet: MedicationMarReport['sheet'] },
  ): Promise<Blob> {
    const scope = this.scope();
    if (!this.can('export')) throw Error('Medication export is not permitted.');
    if (period && !isMarMonth(period.month)) throw Error('Choose a valid MAR reporting month.');
    const path = period ? `/mar/export?${new URLSearchParams(period)}` : '/export';
    const blob = await this.auth.api<Blob>(
      this.root(id) + path,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    if (scope !== this.scope() || !this.can('export'))
      throw Error('The workspace changed. Retry the export.');
    return blob;
  }
}
