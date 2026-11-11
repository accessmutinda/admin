import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { Prescription, Administration } from './care.models';
import type {
  MedicationRead,
  MedicationWorkspace,
  MedicationWrite,
  MarRead,
  MarWrite,
} from './medication.generated';
export type SavedMedication = Prescription & { etag: string; version: number };
export type SavedAdministration = Administration & { etag: string; version: number };
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
      doseUnits: Number(row.doseUnits),
      correctionOf: row.correctionOf ?? undefined,
    } as SavedAdministration;
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
    draft: Omit<Administration, 'id' | 'at' | 'by' | 'userId'>,
    original: SavedAdministration | undefined,
    key: string,
  ): Promise<void> {
    const scope = this.scope();
    const body: MarWrite = {
      date: draft.date,
      time: draft.time,
      outcome: draft.outcome,
      doseUnits: String(draft.doseUnits),
      reason: draft.reason,
      response: draft.response,
      witness: draft.witness,
    };
    const result = await this.auth.api<MarRead>(
      `${this.root(id)}/${row.id}/administrations${original ? '/' + original.id : ''}`,
      body,
      original ? 'PATCH' : 'POST',
      { 'If-Match': original?.etag ?? row.etag, 'Idempotency-Key': key },
    );
    this.validate(result, scope);
  }
  async export(id: string): Promise<Blob> {
    const scope = this.scope();
    if (!this.can('export')) throw Error('Medication export is not permitted.');
    const blob = await this.auth.api<Blob>(
      `${this.root(id)}/export`,
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
