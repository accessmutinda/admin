import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyComplianceApiService } from './company-compliance-api.service';
const record = {
  regulator_number: 'CQC123',
  tax_number: 'TAX123',
  provider_type: 'Stored Provider',
  registration_status: 'Registered',
  inspection_type: 'Full Inspection',
  insurance_expiry: '2030-01-01',
  regulatory_region: 'England',
  data_protection_number: 'ICO123',
  safeguarding_lead: 'Actual Lead',
  medication_lead: 'Medication Lead',
  reminder_preference: 'monthly',
  etag: '"v3"',
  evidence: [
    {
      id: 'evidence-1',
      kind: 'insurance_certificate',
      file_name: 'insurance.pdf',
      content_type: 'application/pdf',
      size: 30,
      owner: 'Actual Owner',
      expires_on: '2030-01-01',
      uploaded_at: '2026-11-07T10:00:00Z',
      uploaded_by: { name: 'Actual Uploader' },
      version: 2,
      scan_state: 'not_available',
    },
  ],
};
describe('Compliance API persistence', () => {
  let api: ReturnType<typeof vi.fn>;
  let service: CompanyComplianceApiService;
  let allowed = true;
  beforeEach(() => {
    allowed = true;
    api = vi.fn().mockResolvedValue(structuredClone(record));
    TestBed.configureTestingModule({
      providers: [
        CompanyComplianceApiService,
        {
          provide: AuthService,
          useValue: {
            api,
            profile: () => ({ id: 'admin', company_id: 'company-1' }),
            canAccessCompany: () => allowed,
          },
        },
      ],
    });
    service = TestBed.inject(CompanyComplianceApiService);
  });
  it('maps stored fields and evidence without downloading or fabricating file bytes', async () => {
    const value = await service.load('company-1');
    expect(api).toHaveBeenCalledExactlyOnceWith('/companies/company-1/compliance');
    expect(value).toMatchObject({
      cqcNumber: 'CQC123',
      taxNumber: 'TAX123',
      providerType: 'Stored Provider',
      reminders: true,
    });
    expect(value.documents.insurance).toMatchObject({
      id: 'evidence-1',
      version: 2,
      owner: 'Actual Owner',
      uploadedBy: 'Actual Uploader',
      content: '',
      scanState: 'not_available',
    });
  });
  it('saves fields and document metadata together with version checks and preserves the stored reminder preference', async () => {
    const value = await service.load('company-1');
    value.safeguardingLead = 'Updated Lead';
    value.documents.insurance!.owner = 'Updated Owner';
    api.mockResolvedValue({ ...record, etag: '"v4"', safeguarding_lead: 'Updated Lead' });
    const saved = await service.save('company-1', value);
    expect(api.mock.calls[1]).toEqual([
      '/companies/company-1/compliance',
      expect.objectContaining({
        safeguarding_lead: 'Updated Lead',
        reminder_preference: 'monthly',
        evidence_updates: [
          { id: 'evidence-1', version: 2, owner: 'Updated Owner', expires_on: '2030-01-01' },
        ],
      }),
      'PATCH',
      { 'If-Match': '"v3"' },
    ]);
    expect(saved.safeguardingLead).toBe('Updated Lead');
  });
  it('uploads multipart evidence with retry-safe keys and a replacement version', async () => {
    const value = await service.load('company-1');
    const file = new File(['%PDF-1.4'], 'replacement.pdf', {
      type: 'application/pdf',
      lastModified: 1,
    });
    api.mockResolvedValue({
      ...record.evidence[0],
      id: 'replacement',
      file_name: 'replacement.pdf',
      version: 1,
    });
    await service.upload('company-1', 'insurance', file, value);
    await service.upload('company-1', 'insurance', file, value);
    const first = api.mock.calls[1];
    const second = api.mock.calls[2];
    expect(first[1]).toBeInstanceOf(FormData);
    expect(first[1].get('replaces_id')).toBe('evidence-1');
    expect(first[1].get('replaces_version')).toBe('2');
    expect(first[1].get('owner')).toBe('Actual Owner');
    expect(first[3]['Idempotency-Key']).toBe(second[3]['Idempotency-Key']);
  });
  it('deletes with an evidence version and downloads through authenticated blob handling', async () => {
    const value = await service.load('company-1');
    api.mockResolvedValue(new Blob(['stored bytes']));
    expect(await service.download('company-1', 'insurance', value)).toBeInstanceOf(Blob);
    expect(api.mock.calls[1]).toEqual([
      '/companies/company-1/evidence/evidence-1',
      undefined,
      undefined,
      undefined,
      'blob',
    ]);
    await service.remove('company-1', 'insurance', value);
    expect(api.mock.calls[2]).toEqual([
      '/companies/company-1/evidence/evidence-1',
      undefined,
      'DELETE',
      { 'If-Match': '"v2"' },
    ]);
    api.mockResolvedValue({ ...record, regulator_number: null });
    await service.clear('company-1');
    expect(api.mock.calls[3]).toEqual([
      '/companies/company-1/compliance',
      undefined,
      'DELETE',
      { 'If-Match': '"v3"' },
    ]);
  });
  it('does not write after the company context becomes unavailable', async () => {
    const value = await service.load('company-1');
    allowed = false;
    await expect(service.save('company-1', value)).rejects.toThrow('context changed');
    expect(api).toHaveBeenCalledTimes(1);
  });
});
