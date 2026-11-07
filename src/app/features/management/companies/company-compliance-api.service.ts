import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CompanyCompliance,
  ComplianceDocumentKey,
  emptyCompliance,
} from './company-compliance.models';

interface EvidenceRecord {
  id: string;
  kind: string;
  file_name: string;
  content_type: string | null;
  size: number;
  owner: string;
  expires_on: string | null;
  uploaded_at: string;
  uploaded_by: { name: string } | null;
  version: number;
  scan_state: string;
}
interface ComplianceRecord {
  regulator_number: string | null;
  tax_number: string | null;
  provider_type: string | null;
  registration_status: string | null;
  inspection_type: string | null;
  insurance_expiry: string | null;
  regulatory_region: string | null;
  data_protection_number: string | null;
  safeguarding_lead: string | null;
  medication_lead: string | null;
  reminder_preference: string | null;
  etag: string;
  evidence?: EvidenceRecord[];
}
const kinds: Record<ComplianceDocumentKey, string> = {
  registration: 'registration_certificate',
  insurance: 'insurance_certificate',
  dataProtection: 'data_protection_policy',
  continuity: 'business_continuity_plan',
};
@Injectable()
export class CompanyComplianceApiService {
  private readonly auth = inject(AuthService);
  private record: ComplianceRecord | null = null;
  private companyId = '';
  private context = '';
  private generation = 0;
  private readonly uploads = new Map<string, string>();
  private identity(): string {
    return `${this.auth.profile()?.id ?? ''}:${this.auth.profile()?.company_id ?? ''}`;
  }
  private assertScope(id: string): void {
    if (
      !this.auth.canAccessCompany(id) ||
      this.context !== this.identity() ||
      this.companyId !== id
    )
      throw new Error('The company context changed. Reload this page before continuing.');
  }
  private map(record: ComplianceRecord): CompanyCompliance {
    const value = emptyCompliance();
    Object.assign(value, {
      cqcNumber: record.regulator_number ?? '',
      taxNumber: record.tax_number ?? '',
      providerType: record.provider_type ?? '',
      registrationStatus: record.registration_status ?? '',
      inspectionType: record.inspection_type ?? '',
      insuranceExpiry: record.insurance_expiry ?? '',
      regulatoryRegion: record.regulatory_region ?? '',
      dataProtectionNumber: record.data_protection_number ?? '',
      safeguardingLead: record.safeguarding_lead ?? '',
      medicationLead: record.medication_lead ?? '',
      reminders:
        !!record.reminder_preference &&
        !['off', 'disabled', 'none', 'false'].includes(record.reminder_preference.toLowerCase()),
    });
    for (const file of record.evidence ?? []) {
      const key = (Object.keys(kinds) as ComplianceDocumentKey[]).find(
        (key) => kinds[key] === file.kind,
      );
      if (!key) continue;
      value.documents[key] = {
        id: file.id,
        version: file.version,
        name: file.file_name,
        type: file.content_type ?? '',
        size: file.size,
        content: '',
        owner: file.owner ?? '',
        expiry: file.expires_on ?? '',
        uploadedAt: file.uploaded_at,
        uploadedBy: file.uploaded_by?.name ?? 'Not recorded',
        scanState: file.scan_state,
      };
    }
    return value;
  }
  async load(id: string): Promise<CompanyCompliance> {
    const generation = ++this.generation;
    this.companyId = id;
    this.context = this.identity();
    this.record = null;
    this.assertScope(id);
    const record = await this.auth.api<ComplianceRecord>(
      `/companies/${encodeURIComponent(id)}/compliance`,
    );
    if (!record || typeof record.etag !== 'string')
      throw new Error('The compliance record could not be read.');
    if (!Array.isArray(record.evidence))
      record.evidence = (
        await this.auth.api<{ results: EvidenceRecord[] }>(
          `/companies/${encodeURIComponent(id)}/evidence`,
        )
      ).results;
    if (!Array.isArray(record.evidence))
      throw new Error('The compliance evidence could not be read.');
    this.assertScope(id);
    if (generation !== this.generation) throw new Error('A newer company record is being loaded.');
    this.record = record;
    return this.map(record);
  }
  async save(id: string, value: CompanyCompliance): Promise<CompanyCompliance> {
    this.assertScope(id);
    if (!this.record) throw new Error('Load the compliance record before saving.');
    const unchangedReminders = this.map(this.record).reminders === value.reminders;
    const payload = {
      regulator_number: value.cqcNumber.trim(),
      tax_number: value.taxNumber.trim(),
      provider_type: value.providerType,
      registration_status: value.registrationStatus,
      inspection_type: value.inspectionType,
      insurance_expiry: value.insuranceExpiry || null,
      regulatory_region: value.regulatoryRegion.trim(),
      data_protection_number: value.dataProtectionNumber.trim(),
      safeguarding_lead: value.safeguardingLead.trim(),
      medication_lead: value.medicationLead.trim(),
      reminder_preference: unchangedReminders
        ? this.record.reminder_preference
        : value.reminders
          ? 'enabled'
          : 'disabled',
      evidence_updates: Object.values(value.documents)
        .filter((file) => !!file.id)
        .map((file) => ({
          id: file.id,
          version: file.version,
          owner: file.owner.trim(),
          expires_on: file.expiry || null,
        })),
    };
    const record = await this.auth.api<ComplianceRecord>(
      `/companies/${encodeURIComponent(id)}/compliance`,
      payload,
      'PATCH',
      { 'If-Match': this.record.etag },
    );
    this.assertScope(id);
    this.record = record;
    return this.map(record);
  }
  async clear(id: string): Promise<CompanyCompliance> {
    this.assertScope(id);
    if (!this.record) throw new Error('Load the compliance record before deleting.');
    const record = await this.auth.api<ComplianceRecord>(
      `/companies/${encodeURIComponent(id)}/compliance`,
      undefined,
      'DELETE',
      { 'If-Match': this.record.etag },
    );
    this.assertScope(id);
    this.record = record;
    return this.map(record);
  }
  async upload(
    id: string,
    key: ComplianceDocumentKey,
    file: File,
    value: CompanyCompliance,
  ): Promise<NonNullable<CompanyCompliance['documents'][ComplianceDocumentKey]>> {
    this.assertScope(id);
    const previous = value.documents[key];
    const signature = JSON.stringify([
      id,
      key,
      file.name,
      file.size,
      file.lastModified,
      previous?.id,
      previous?.version,
      previous?.owner,
      previous?.expiry,
    ]);
    const token = this.uploads.get(signature) ?? crypto.randomUUID();
    this.uploads.set(signature, token);
    const body = new FormData();
    body.set('file', file);
    body.set('kind', kinds[key]);
    body.set('owner', previous?.owner ?? '');
    body.set('expires_on', previous?.expiry ?? '');
    if (previous?.id) {
      body.set('replaces_id', previous.id);
      body.set('replaces_version', String(previous.version));
    }
    const saved = await this.auth.api<EvidenceRecord>(
      `/companies/${encodeURIComponent(id)}/evidence`,
      body,
      'POST',
      { 'Idempotency-Key': token },
    );
    this.assertScope(id);
    return this.map({ ...this.record!, evidence: [saved] }).documents[key]!;
  }
  async remove(id: string, key: ComplianceDocumentKey, value: CompanyCompliance): Promise<void> {
    this.assertScope(id);
    const file = value.documents[key];
    if (!file?.id) return;
    await this.auth.api(
      `/companies/${encodeURIComponent(id)}/evidence/${encodeURIComponent(file.id)}`,
      undefined,
      'DELETE',
      { 'If-Match': `"v${file.version}"` },
    );
    this.assertScope(id);
  }
  async download(id: string, key: ComplianceDocumentKey, value: CompanyCompliance): Promise<Blob> {
    this.assertScope(id);
    const file = value.documents[key];
    if (!file?.id) throw new Error('No saved document is available.');
    const blob = await this.auth.api<Blob>(
      `/companies/${encodeURIComponent(id)}/evidence/${encodeURIComponent(file.id)}`,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    this.assertScope(id);
    return blob;
  }
}
