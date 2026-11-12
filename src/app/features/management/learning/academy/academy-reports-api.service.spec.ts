import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import { AcademyReportsApi } from './academy-reports-api.service';
import type { AcademyReportRead } from './academy.generated';

describe('Training reports source adapter', () => {
  const scope = signal('first'),
    company = signal('company'),
    allowed = signal(true),
    exportAllowed = signal(true);
  let request: ReturnType<typeof vi.fn>, api: AcademyReportsApi;
  const report = (count = 1) =>
    ({
      count,
      next: null,
      previous: null,
      results: [],
      meta: {
        company_id: company(),
        as_of: '2026-11-12T12:00:00Z',
        request_id: 'read',
        timezone: 'Europe/London',
        filters: { from_date: '2026-10-14', to_date: '2026-11-12', branch: 'All', role: 'All' },
      },
      branches: ['North'],
      roles: ['Carer'],
      stats: [],
      months: [],
      byBranch: [],
      byRole: [],
      risk: [],
      audit: { count: 0, next: null, previous: null, results: [] },
    }) as AcademyReportRead;
  beforeEach(() => {
    scope.set('first');
    company.set('company');
    allowed.set(true);
    exportAllowed.set(true);
    request = vi.fn().mockImplementation(async () => report());
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { api: request } },
        {
          provide: CompanyAccessService,
          useValue: {
            can: (_module: string, _feature: string, action: string) =>
              allowed() && (action !== 'export' || exportAllowed()),
          },
        },
        { provide: ManagementStore, useValue: { companyId: company } },
        { provide: AcademyApi, useValue: { scope } },
      ],
    });
    api = TestBed.inject(AcademyReportsApi);
    TestBed.tick();
  });
  it('loads source data with independent matrix and audit pages', async () => {
    await api.load(
      { branch: 'North & West', role: 'Carer', from_date: '2026-11-01', to_date: '2026-11-12' },
      2,
      3,
    );
    const params = new URLSearchParams(request.mock.calls[0][0].split('?')[1]);
    expect(params.get('branch')).toBe('North & West');
    expect(params.get('page')).toBe('2');
    expect(params.get('audit_page')).toBe('3');
    expect(api.data()?.count).toBe(1);
  });
  it('clears source figures immediately when access changes', async () => {
    await api.load();
    allowed.set(false);
    expect(api.data()).toBeNull();
    await api.load();
    expect(api.error()).toContain('unavailable');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('clears previous records on an unavailable response', async () => {
    await api.load();
    request.mockRejectedValueOnce(Error('Connection unavailable'));
    await api.load();
    expect(api.data()).toBeNull();
    expect(api.error()).toBe('Connection unavailable');
    expect(api.loading()).toBe(false);
  });
  it('rejects a different tenant response', async () => {
    request.mockResolvedValueOnce({ ...report(), meta: { ...report().meta, company_id: 'other' } });
    await api.load();
    expect(api.data()).toBeNull();
    expect(api.error()).toContain('mismatch');
  });
  it('hides data immediately on workspace switch and ignores old success', async () => {
    let resolve!: (value: AcademyReportRead) => void;
    request.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const pending = api.load();
    scope.set('second');
    company.set('other');
    TestBed.tick();
    resolve(report());
    await pending;
    expect(api.data()).toBeNull();
    expect(api.error()).toBe('');
  });
  it('keeps a newer filtered report when an old request completes', async () => {
    let resolve!: (value: AcademyReportRead) => void;
    request.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const old = api.load({ branch: 'North' });
    request.mockResolvedValueOnce(report(2));
    await api.load({ branch: 'South' });
    resolve(report(1));
    await old;
    expect(api.data()?.count).toBe(2);
  });
  it('ignores obsolete network errors', async () => {
    let reject!: (error: Error) => void;
    request.mockReturnValueOnce(new Promise((_r, fail) => (reject = fail)));
    const old = api.load();
    await api.load();
    reject(Error('Old connection failure'));
    await old;
    expect(api.data()).not.toBeNull();
    expect(api.error()).toBe('');
  });
  it('clears newer figures after a same-scope access denial', async () => {
    let reject!: (error: Error) => void;
    request.mockReturnValueOnce(new Promise((_r, fail) => (reject = fail)));
    const old = api.load();
    await api.load();
    reject(Object.assign(Error('Access revoked'), { status: 403 }));
    await old;
    expect(api.data()).toBeNull();
    expect(api.error()).toBe('Access revoked');
  });
  it('read does not grant an export request', async () => {
    await api.load();
    exportAllowed.set(false);
    expect(await api.download('matrix', {})).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('downloads complete filtered server exports without page parameters', async () => {
    request.mockResolvedValueOnce(new Blob(['Staff,Course\r\nJane,Training']));
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await api.download('matrix', { branch: 'North' })).toBe(true);
    expect(request.mock.calls[0][0]).toContain('/reports/export?branch=North&kind=matrix');
    expect(request.mock.calls[0][4]).toBe('blob');
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:report');
    create.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
  });
  it('does not download an export completed after switching company', async () => {
    let resolve!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const create = vi.spyOn(URL, 'createObjectURL');
    const pending = api.download('matrix', {});
    scope.set('second');
    company.set('other');
    resolve(new Blob(['export']));
    await pending;
    expect(create).not.toHaveBeenCalled();
    create.mockRestore();
  });
  it('invalidates an in-flight success after access is denied by an older request', async () => {
    let reject!: (error: Error) => void, resolve!: (value: AcademyReportRead) => void;
    request.mockReturnValueOnce(new Promise((_r, fail) => (reject = fail)));
    const denied = api.load();
    request.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const pending = api.load();
    reject(Object.assign(Error('Access revoked'), { status: 403 }));
    await denied;
    resolve(report());
    await pending;
    expect(api.data()).toBeNull();
    expect(api.error()).toBe('Access revoked');
    expect(api.loading()).toBe(false);
  });
  it('allows the new workspace to export while an old workspace download remains pending', async () => {
    let resolveOld!: (value: Blob) => void, resolveNew!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise((r) => (resolveOld = r)));
    const old = api.download('matrix', {});
    scope.set('second');
    company.set('other');
    TestBed.tick();
    request.mockReturnValueOnce(new Promise((r) => (resolveNew = r)));
    const current = api.download('compliance', {});
    expect(request).toHaveBeenCalledTimes(2);
    resolveOld(new Blob(['old']));
    await old;
    expect(api.exporting()).toBe(true);
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:new-report');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    resolveNew(new Blob(['new']));
    expect(await current).toBe(true);
    expect(api.exporting()).toBe(false);
    expect(create).toHaveBeenCalledOnce();
    create.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
  });
  it('discards a pending download when a report read confirms revoked access', async () => {
    let resolve!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const pending = api.download('matrix', {});
    request.mockRejectedValueOnce(Object.assign(Error('Access revoked'), { status: 403 }));
    await api.load();
    const create = vi.spyOn(URL, 'createObjectURL');
    resolve(new Blob(['old report']));
    expect(await pending).toBe(false);
    expect(create).not.toHaveBeenCalled();
    expect(api.error()).toBe('Access revoked');
    expect(api.exporting()).toBe(false);
    create.mockRestore();
  });
});
