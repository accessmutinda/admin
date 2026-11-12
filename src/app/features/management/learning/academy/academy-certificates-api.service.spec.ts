import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import { AcademyCertificatesApi, CertificateRecord } from './academy-certificates-api.service';

import { certificateRecord } from './academy-certificate-test-data';

describe('Academy certificates source adapter', () => {
  const scope = signal('first'),
    company = signal('company'),
    allowed = signal(true),
    grants = signal<Set<string> | null>(null);
  let api: AcademyCertificatesApi, request: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scope.set('first');
    company.set('company');
    allowed.set(true);
    grants.set(null);
    request = vi.fn(async (path: string, body?: unknown) =>
      body
        ? certificateRecord('certificate', 2)
        : /\/certificates\/[^/?]+$/.test(path)
          ? certificateRecord('certificate', 2)
          : path.includes('/content')
            ? new Blob(['%PDF-'])
            : {
                results: path.includes('/certificates?') ? [certificateRecord()] : [],
                next: null,
                meta: { company_id: company() },
              },
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { api: request } },
        {
          provide: CompanyAccessService,
          useValue: {
            invalidate: vi.fn(),
            can: (_module: string, submodule: string, action = 'read') =>
              allowed() && (!grants() || grants()!.has(submodule + '.' + action)),
          },
        },
        { provide: ManagementStore, useValue: { companyId: company } },
        { provide: AcademyApi, useValue: { scope } },
      ],
    });
    api = TestBed.inject(AcademyCertificatesApi);
  });
  it('reads only a certificate-linked image and clears revoked evidence', async () => {
    const saved = certificateRecord();
    saved.certificate.branding.logoId = 'image';
    request.mockResolvedValueOnce({
      results: [saved],
      next: null,
      meta: { company_id: 'company' },
    });
    await api.load();
    expect(await api.brandingBlob('unrelated')).toBeNull();
    request.mockRejectedValueOnce(Object.assign(Error('Access revoked'), { status: 403 }));
    await expect(api.brandingBlob('image')).rejects.toThrow('revoked');
    expect(api.certificates()).toEqual([]);
    expect(TestBed.inject(CompanyAccessService).invalidate).toHaveBeenCalled();
  });
  it('loads certificates, persisted filing references and separate compliance sources', async () => {
    await api.load();
    expect(api.certificates()[0].id).toBe('certificate');
    expect(api.records()[0].document.content).toBe('');
    expect(api.completions()[0].status).toBe('ROTA_REFRESH_PENDING');
    expect(request.mock.calls.some(([path]) => path.includes('/compliance?'))).toBe(true);
  });
  it('loads every page and retains pending learner identities', async () => {
    request
      .mockResolvedValueOnce({
        results: [certificateRecord('one')],
        next: 2,
        meta: {
          company_id: 'company',
          pending: [
            {
              ...certificateRecord().completion,
              status: 'CERTIFICATE_PENDING',
              person: certificateRecord().person,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        results: [certificateRecord('two')],
        next: null,
        meta: { company_id: 'company' },
      })
      .mockResolvedValueOnce({
        results: [
          {
            ...certificateRecord().completion,
            status: 'CERTIFICATE_PENDING',
            person: certificateRecord().person,
          },
        ],
        next: null,
        meta: { company_id: 'company' },
      });
    await api.load();
    expect(api.certificates().length).toBe(2);
    expect(api.people()[0].name).toBe('Jane Worker');
    expect(api.completions().some((j) => j.status === 'CERTIFICATE_PENDING')).toBe(true);
  });
  it('uses server versions and idempotency for revocation then refreshes the source', async () => {
    await api.load();
    await api.revoke('certificate', 'Evidence review');
    const call = request.mock.calls.find(([path, body]) => path.endsWith('/revoke') && body);
    expect(call?.[1]).toEqual({ reason: 'Evidence review' });
    expect(call?.[3]['If-Match']).toBe('"v1"');
    expect(call?.[3]['Idempotency-Key']).toBeTruthy();
    expect(api.certificates()[0].version).toBe(2);
  });
  it('reuses an idempotency key after an uncertain network outcome', async () => {
    await api.load();
    request.mockRejectedValueOnce(Error('Connection lost'));
    await expect(api.reissue('certificate', 'Correct name')).rejects.toThrow('Connection lost');
    await api.reissue('certificate', 'Correct name');
    const calls = request.mock.calls.filter(([path]) => path.endsWith('/reissue'));
    expect(calls[0][3]['Idempotency-Key']).toBe(calls[1][3]['Idempotency-Key']);
  });
  it('clears certificate records immediately on workspace and permission changes', async () => {
    await api.load();
    scope.set('second');
    company.set('other');
    expect(api.certificates()).toEqual([]);
    expect(api.completions()).toEqual([]);
    expect(api.requests()).toEqual([]);
    company.set('company');
    await api.load();
    allowed.set(false);
    expect(api.certificates()).toEqual([]);
  });
  it('rejects mismatched tenant responses and removes cached data', async () => {
    await api.load();
    request.mockResolvedValueOnce({
      results: [certificateRecord()],
      next: null,
      meta: { company_id: 'foreign' },
    });
    await expect(api.load()).rejects.toThrow('workspace mismatch');
    expect(api.certificates()).toEqual([]);
    expect(api.error()).toContain('workspace mismatch');
  });
  it('uses the owning learner endpoints for records and PDF downloads', async () => {
    await api.load(true);
    await api.pdf('certificate', true);
    expect(
      request.mock.calls.some(([path]) =>
        path.endsWith('/learning/certificates/certificate/content'),
      ),
    ).toBe(true);
    expect(request.mock.calls.some(([path]) => path.includes('/learning/records-requests?'))).toBe(
      true,
    );
    expect(request.mock.calls.some(([path]) => path.includes('/compliance?'))).toBe(false);
  });
  it('clears previous certificates when a protected download is denied', async () => {
    await api.load();
    request.mockRejectedValueOnce(Object.assign(Error('Export denied'), { status: 403 }));
    await expect(api.pdf('certificate')).rejects.toThrow('Export denied');
    expect(api.certificates()).toEqual([]);
    expect(api.error()).toBe('Export denied');
  });
  it('blocks duplicate writes while the source command is pending', async () => {
    await api.load();
    let resolve!: (value: unknown) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = api.issue('attempt');
    await expect(api.issue('attempt')).rejects.toThrow('already saving');
    resolve(certificateRecord());
    await pending;
    expect(api.saving()).toBe(false);
  });
  it('sends an explicit requirement revision with the previous source ETag', async () => {
    const rule = {
      id: 'rule',
      company_id: 'company',
      version: 3,
      etag: '"v3"',
      courseId: 'course',
      roles: [],
      branches: [],
      serviceCategory: '',
      effectiveFrom: '2027-01-01',
      effectiveTo: '',
      minimumVersion: 0,
      allowExternal: false,
      reviewRequired: false,
      renewalMonths: 12,
      reminderDays: [30],
      autoAssign: false,
    };
    request.mockResolvedValueOnce({ results: [rule], next: null, meta: { company_id: 'company' } });
    await api.loadRequirements();
    request.mockResolvedValueOnce({ ...rule, version: 4, etag: '"v4"', renewalMonths: 24 });
    await api.saveRequirement({ ...rule, renewalMonths: 24 });
    const call = request.mock.calls.find(
      ([path, body]) => path.endsWith('/requirements/rule') && body,
    );
    expect(call?.[2]).toBe('PATCH');
    expect(call?.[3]['If-Match']).toBe('"v3"');
    expect(call?.[1]).not.toHaveProperty('company_id');
    expect(call?.[1].effectiveTo).toBeNull();
  });
  it('does not let an older list response replace a newer completed refresh', async () => {
    let resolve!: (value: unknown) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const old = api.load();
    request.mockResolvedValueOnce({
      results: [certificateRecord('fresh', 3)],
      next: null,
      meta: { company_id: 'company' },
    });
    await api.load();
    resolve({
      results: [certificateRecord('old', 1)],
      next: null,
      meta: { company_id: 'company' },
    });
    await old;
    expect(api.certificates().map((c) => c.id)).toEqual(['fresh']);
    expect(api.loading()).toBe(false);
  });
  it('ignores failures from a superseded refresh', async () => {
    let reject!: (error: Error) => void;
    request.mockImplementationOnce(() => new Promise((_resolve, r) => (reject = r)));
    const old = api.load();
    await api.load();
    reject(Error('Older connection failed'));
    await old;
    expect(api.certificates()[0].id).toBe('certificate');
    expect(api.error()).toBe('');
  });
  it('uses the freshest learner evidence even when a manager record has the same root version', async () => {
    await api.load();
    const revoked = certificateRecord();
    revoked.certificate.state = 'Revoked';
    revoked.certificate.revokedAt = '2026-11-12T11:00:00Z';
    request.mockResolvedValueOnce({
      results: [revoked],
      next: null,
      meta: { company_id: 'company' },
    });
    await api.load(true);
    expect(api.certificates()[0].state).toBe('Revoked');
    request.mockResolvedValueOnce(certificateRecord('certificate', 2));
    await api.detail('certificate');
    expect(api.certificates()[0].version).toBe(2);
  });
  it('preserves a detail response that finishes while an earlier list is loading', async () => {
    let resolve!: (value: unknown) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const list = api.load();
    const detail = certificateRecord();
    detail.matrix[0].missing = true;
    request.mockResolvedValueOnce(detail);
    await api.detail('certificate');
    const summary = certificateRecord();
    summary.matrix = [];
    resolve({ results: [summary], next: null, meta: { company_id: 'company' } });
    await list;
    expect(api.records()[0].matrix[0].missing).toBe(true);
  });
  it('retains separate request lists and never rolls an acknowledgement back', async () => {
    const row = {
      id: 'request',
      company_id: 'company',
      tenantId: 'company',
      personId: 'worker',
      version: 1,
      etag: '"v1"',
      status: 'Requested',
      createdAt: '2026-11-12T10:00:00Z',
      acknowledgedAt: '',
      acknowledgedBy: '',
    };
    request.mockImplementation(async (path: string) => ({
      results: path.includes('records-requests?')
        ? [row]
        : path.includes('/certificates?')
          ? [certificateRecord()]
          : [],
      next: null,
      meta: { company_id: 'company' },
    }));
    await api.load();
    request.mockImplementation(async (path: string) => ({
      results: path.includes('records-requests?')
        ? [{ ...row, version: 2, etag: '"v2"', status: 'Acknowledged' }]
        : [],
      next: null,
      meta: { company_id: 'company' },
    }));
    await api.load(true);
    expect(api.requests()[0].status).toBe('Acknowledged');
  });
  it('clears policy course choices when a later requirement read is denied', async () => {
    request
      .mockResolvedValueOnce({ results: [], next: null, meta: { company_id: 'company' } })
      .mockResolvedValueOnce({
        results: [{ id: 'course', title: 'Course', version: 1 }],
        next: null,
        meta: { company_id: 'company' },
      });
    await api.loadRequirements();
    expect(api.requirementCourses()).toHaveLength(1);
    request.mockRejectedValueOnce(Object.assign(Error('Requirement denied'), { status: 403 }));
    await expect(api.loadRequirements()).rejects.toThrow('Requirement denied');
    expect(api.requirementCourses()).toEqual([]);
    expect(api.requirements()).toEqual([]);
  });
  it('does not let an old workspace failure clear current policy choices', async () => {
    let reject!: (error: Error) => void;
    request.mockImplementationOnce(() => new Promise((_resolve, r) => (reject = r)));
    const old = api.loadRequirements();
    scope.set('second');
    request
      .mockResolvedValueOnce({ results: [], next: null, meta: { company_id: 'company' } })
      .mockResolvedValueOnce({
        results: [{ id: 'fresh', title: 'Current course', version: 1 }],
        next: null,
        meta: { company_id: 'company' },
      });
    await api.loadRequirements();
    reject(Error('Old workspace failed'));
    await old;
    expect(api.requirementCourses()[0].id).toBe('fresh');
    expect(api.error()).toBe('');
  });
  it('keeps a committed policy ID and ETag when refreshing the saved policy fails', async () => {
    const rule = {
      id: 'client-draft',
      courseId: 'course',
      roles: [],
      branches: [],
      serviceCategory: '',
      effectiveFrom: '2027-01-01',
      effectiveTo: '',
      minimumVersion: 0,
      allowExternal: false,
      reviewRequired: false,
      renewalMonths: 12,
      reminderDays: [30],
      autoAssign: false,
    };
    const saved = { ...rule, id: 'server-rule', company_id: 'company', version: 1, etag: '"v1"' };
    request.mockResolvedValueOnce(saved).mockRejectedValueOnce(Error('Reload failed'));
    await expect(api.saveRequirement(rule)).rejects.toThrow('Reload failed');
    expect(rule.id).toBe('server-rule');
    request.mockResolvedValueOnce({ ...saved, version: 2, etag: '"v2"' });
    await api.saveRequirement(rule);
    const writes = request.mock.calls.filter(([, body]) => body);
    expect(writes[1][0]).toContain('/requirements/server-rule');
    expect(writes[1][2]).toBe('PATCH');
    expect(writes[1][3]['If-Match']).toBe('"v1"');
  });
  it('refreshes loaded compliance inputs after a successful policy update', async () => {
    const rule = {
      id: 'draft',
      courseId: 'course',
      roles: [],
      branches: [],
      serviceCategory: '',
      effectiveFrom: '2027-01-01',
      effectiveTo: '',
      minimumVersion: 0,
      allowExternal: false,
      reviewRequired: false,
      renewalMonths: 12,
      reminderDays: [30],
      autoAssign: false,
    };
    request.mockResolvedValueOnce({
      ...rule,
      id: 'saved',
      company_id: 'company',
      version: 1,
      etag: '"v1"',
    });
    await api.saveRequirement(rule);
    expect(request.mock.calls.some(([path]) => path.includes('/compliance?'))).toBe(true);
  });
  it('distinguishes policy creation and editing permissions in the form', () => {
    const rule = {
      id: 'draft',
      courseId: 'course',
      roles: [],
      branches: [],
      serviceCategory: '',
      effectiveFrom: '2027-01-01',
      effectiveTo: '',
      minimumVersion: 0,
      allowExternal: false,
      reviewRequired: false,
      renewalMonths: 12,
      reminderDays: [30],
      autoAssign: false,
    };
    grants.set(new Set(['governance.read', 'governance.create']));
    expect(api.canSaveRequirement(rule)).toBe(true);
    expect(api.canSaveRequirement({ ...rule, etag: '"v1"' } as typeof rule)).toBe(false);
    grants.set(new Set(['governance.read', 'governance.edit']));
    expect(api.canSaveRequirement(rule)).toBe(false);
    expect(api.canSaveRequirement({ ...rule, etag: '"v1"' } as typeof rule)).toBe(true);
  });
  it('still clears evidence when an older request reports a current authorisation denial', async () => {
    let reject!: (error: Error) => void;
    request.mockImplementationOnce(() => new Promise((_r, e) => (reject = e)));
    const old = api.load();
    await api.load();
    reject(Object.assign(Error('Access revoked'), { status: 403 }));
    await expect(old).rejects.toThrow('Access revoked');
    expect(api.certificates()).toEqual([]);
    expect(api.error()).toBe('Access revoked');
  });
  it('does not request an old certificate in a new workspace after a committed write', async () => {
    await api.load();
    let resolve!: (value: unknown) => void;
    request
      .mockResolvedValueOnce(certificateRecord('certificate', 2))
      .mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = api.revoke('certificate', 'Review evidence');
    await Promise.resolve();
    await Promise.resolve();
    scope.set('other-scope');
    company.set('other-company');
    const fresh = certificateRecord('other-certificate');
    fresh.certificate.company_id = 'other-company';
    request.mockImplementation(async (path: string) => ({
      results: path.includes('/certificates?') ? [fresh] : [],
      next: null,
      meta: { company_id: 'other-company' },
    }));
    await api.load();
    resolve({ results: [certificateRecord()], next: null, meta: { company_id: 'company' } });
    await expect(pending).rejects.toThrow('workspace');
    expect(api.certificates()[0].id).toBe('other-certificate');
    expect(
      request.mock.calls.some(
        ([path]) =>
          path.includes('/companies/other-company/') && path.endsWith('/certificates/certificate'),
      ),
    ).toBe(false);
  });
  it('keeps the later state if a changing paginated list repeats a certificate', async () => {
    const old = certificateRecord();
    const fresh = certificateRecord();
    fresh.certificate.state = 'Revoked';
    request
      .mockResolvedValueOnce({ results: [old], next: 2, meta: { company_id: 'company' } })
      .mockResolvedValueOnce({ results: [fresh], next: null, meta: { company_id: 'company' } });
    await api.load();
    expect(api.certificates()).toHaveLength(1);
    expect(api.certificates()[0].state).toBe('Revoked');
  });
});
