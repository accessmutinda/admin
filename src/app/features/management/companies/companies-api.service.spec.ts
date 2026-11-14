import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/auth/auth-api';
import { CompaniesApiService } from './companies-api.service';
import {
  CompanyPage,
  CompanySummary,
  CreateCompanyRequest,
  CreatedCompany,
} from './companies-api.models';

const company: CompanySummary = {
  id: 'company-1',
  code: 'ONE',
  name: 'Company One',
  lifecycle: 'active',
};
const page = (
  results: CompanySummary[],
  next: string | null = null,
  count = results.length,
): CompanyPage => ({ count, next, previous: null, results, meta: {} });
const payload: CreateCompanyRequest = {
  company: {
    name: 'New Company',
    code: 'new',
    legal_name: 'New Company Ltd',
    timezone: 'Europe/London',
  },
  addresses: [{ line1: '1 High Street', town: 'London', postcode: 'SW1A 1AA' }],
  initial_admin: { email: 'admin@example.com', mfa_override: 'inherit' },
};
const created: CreatedCompany = {
  id: 'company-new',
  code: 'NEW',
  lifecycle: 'pending_setup',
  initial_admin_invitation: { id: 'invitation-1', state: 'pending', delivery_state: 'queued' },
  request_id: 'request-1',
};

describe('Companies API service', () => {
  const role = signal('PO');
  const user = signal('user-1');
  const assigned = signal('company-1');
  const signedIn = signal(true);
  let request: ReturnType<typeof vi.fn>;
  let service: CompaniesApiService;
  beforeEach(() => {
    role.set('PO');
    user.set('user-1');
    assigned.set('company-1');
    signedIn.set(true);
    localStorage.clear();
    request = vi.fn().mockResolvedValue(page([company]));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            api: request,
            canAccessCompany: (id: string) => signedIn() && (role() === 'PO' || id === assigned()),
            isAuthenticated: signedIn,
            isSuperAdmin: () => signedIn() && role() === 'PO',
            profile: () => (signedIn() ? { id: user(), company_id: assigned() } : null),
          },
        },
      ],
    });
    service = TestBed.inject(CompaniesApiService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('uses the platform listing for Super Admin without creating companies', async () => {
    await service.load();
    expect(request).toHaveBeenCalledExactlyOnceWith('/platform/companies');
    expect(service.companies()).toEqual([company]);
    expect(service.count()).toBe(1);
  });
  it('loads company detail without using directory placeholders and hides it after logout', async () => {
    const detail = {
      ...company,
      version: 2,
      etag: '"v2"',
      description: 'Stored description',
      registered_places: 0,
    };
    request.mockResolvedValue(detail);
    await service.loadDetail(company.id);
    expect(request).toHaveBeenCalledExactlyOnceWith('/companies/company-1');
    expect(service.details()[company.id]).toEqual(detail);
    signedIn.set(false);
    expect(service.details()).toEqual({});
  });
  it('rejects mismatched detail records and preserves errors for retry', async () => {
    request.mockResolvedValue({ ...company, id: 'other-company', version: 1 });
    await service.loadDetail(company.id);
    expect(service.details()).toEqual({});
    expect(service.detailError(company.id)).toContain('could not be read');
    request.mockResolvedValue({ ...company, version: 2, etag: '"v2"' });
    await service.loadDetail(company.id);
    expect(service.detailError(company.id)).toBe('');
    expect(service.details()[company.id].version).toBe(2);
  });
  it('saves general information with the current profile version', async () => {
    await service.load();
    const detail = { ...company, version: 3, etag: '"v3"', description: 'Stored' };
    request.mockResolvedValueOnce(detail);
    await service.loadDetail(company.id);
    const saved = {
      ...detail,
      version: 4,
      etag: '"v4"',
      name: 'Updated Care',
      description: 'Updated description',
    };
    request.mockResolvedValueOnce(saved);
    const result = await service.updateDetail(company.id, {
      name: 'Updated Care',
      trading_name: 'Updated Trading',
      code: 'UPD',
      service_type: 'Domiciliary care',
      description: 'Updated description',
      staff_size_band: '11–50 staff',
      registration_number: 'SQE3333',
      head_office_name: 'Test Office',
      registered_places: 1,
      primary_language: 'English',
      date_established: '2026-11-14',
    });
    expect(request).toHaveBeenLastCalledWith(
      '/companies/company-1',
      expect.objectContaining({ name: 'Updated Care', registered_places: 1 }),
      'PATCH',
      { 'If-Match': '"v3"' },
    );
    expect(result.etag).toBe('"v4"');
    expect(service.details()[company.id].name).toBe('Updated Care');
    expect(service.companies()[0].name).toBe('Updated Care');
  });
  it('does not request another company profile for a company account', async () => {
    role.set('CA');
    await service.loadDetail('other-company');
    expect(request).not.toHaveBeenCalled();
  });
  it('discards a profile response after the account changes', async () => {
    let resolve!: (value: unknown) => void;
    request.mockReturnValue(new Promise((value) => (resolve = value)));
    const loading = service.loadDetail(company.id);
    user.set('another-user');
    resolve({ ...company, version: 1, etag: '"v1"' });
    await loading;
    expect(service.details()).toEqual({});
  });

  it('exposes per-company detail loading until the request completes', async () => {
    let complete!: (value: unknown) => void;
    request.mockReturnValue(new Promise((resolve) => (complete = resolve)));
    const loading = service.loadDetail(company.id);
    expect(service.detailLoading(company.id)).toBe(true);
    expect(service.detailLoading('other-company')).toBe(false);
    complete({ ...company, version: 1, etag: '"v1"' });
    await loading;
    expect(service.detailLoading(company.id)).toBe(false);
  });

  it('uses the assigned-company listing for a company account', async () => {
    role.set('CA');
    await service.load();
    expect(request).toHaveBeenCalledExactlyOnceWith('/companies');
    expect(service.companies()).toEqual([company]);
    expect(service.canCreate()).toBe(false);
  });
  it('follows server pagination through the local API path', async () => {
    request
      .mockResolvedValueOnce(
        page([company], 'http://backend.internal/api/v1/platform/companies?page=2', 2),
      )
      .mockResolvedValueOnce(page([{ ...company, id: 'company-2', code: 'TWO' }], null, 2));
    await service.load();
    expect(request.mock.calls.map((call) => call[0])).toEqual([
      '/platform/companies',
      '/platform/companies?page=2',
    ]);
    expect(service.companies()).toHaveLength(2);
    expect(service.count()).toBe(2);
  });
  it('reads server overview totals and follows numeric page links', async () => {
    const meta = {
      authorised_total: 2,
      active_total: 1,
      pending_setup_total: 1,
      profile_completion_percent: 50,
      open_admin_tasks: 7,
    };
    request
      .mockResolvedValueOnce({ ...page([company], null, 2), next: 2, meta })
      .mockResolvedValueOnce({
        ...page([{ ...company, id: 'company-2', lifecycle: 'pending_setup' }], null, 2),
        meta,
      });
    await service.load();
    expect(request.mock.calls.map((call) => call[0])).toEqual([
      '/platform/companies',
      '/platform/companies?page=2',
    ]);
    expect(service.overview()).toEqual(meta);
    expect(service.companies()).toHaveLength(2);
    signedIn.set(false);
    expect(service.overview()).toBeNull();
    expect(service.loaded()).toBe(false);
  });

  it('does not follow a pagination link to a different endpoint', async () => {
    request.mockResolvedValue(page([company], '/api/v1/auth/state'));
    await service.load();
    expect(request).toHaveBeenCalledTimes(1);
    expect(service.error()).toContain('invalid page');
    expect(service.companies()).toEqual([]);
  });
  it('stops repeated pages instead of looping', async () => {
    request.mockResolvedValue(page([company], '/api/v1/platform/companies'));
    await service.load();
    expect(request).toHaveBeenCalledTimes(1);
    expect(service.error()).toContain('could not be completed');
  });
  it('rejects foreign-company records in a company account response', async () => {
    role.set('CA');
    assigned.set('other-company');
    await service.load();
    expect(service.companies()).toEqual([]);
    expect(service.error()).toContain('account assignment');
  });
  it('discards a late response after the account changes', async () => {
    let finish!: (value: CompanyPage) => void;
    request.mockReturnValueOnce(
      new Promise<CompanyPage>((resolve) => {
        finish = resolve;
      }),
    );
    const previous = service.load();
    user.set('user-2');
    role.set('CA');
    assigned.set('company-2');
    expect(service.companies()).toEqual([]);
    const second = { ...company, id: 'company-2', code: 'TWO' };
    request.mockResolvedValueOnce(page([second]));
    await service.load();
    finish(page([company]));
    await previous;
    expect(service.companies()).toEqual([second]);
  });
  it('clears private data immediately on logout and avoids signed-out requests', async () => {
    await service.load();
    signedIn.set(false);
    expect(service.companies()).toEqual([]);
    expect(service.count()).toBe(0);
    await service.load();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('shows list failures without using local company caches and supports retry', async () => {
    localStorage.setItem('cv_companies_v1', JSON.stringify([company]));
    localStorage.setItem('cv_api_company_details_v1', JSON.stringify([company]));
    request.mockRejectedValueOnce(new Error('Service unavailable.'));
    await service.load();
    expect(service.error()).toBe('Service unavailable.');
    expect(service.companies()).toEqual([]);
    await service.load();
    expect(service.error()).toBe('');
    expect(service.companies()).toEqual([company]);
  });
  it('creates only through the platform endpoint with the supplied idempotency key', async () => {
    request.mockResolvedValue(created);
    expect(await service.create(payload, 'same-request')).toEqual(created);
    expect(request).toHaveBeenCalledExactlyOnceWith('/platform/companies', payload, undefined, {
      'Idempotency-Key': 'same-request',
    });
    expect(localStorage.getItem('cv_api_company_details_v1')).toBeNull();
  });
  it('blocks Company Admin creation before a network request', async () => {
    role.set('CA');
    await expect(service.create(payload, 'key')).rejects.toThrow('Only Super Admin');
    expect(request).not.toHaveBeenCalled();
  });
  it('preserves server validation and conflict errors', async () => {
    const error = new ApiError('Company code already exists.', 409, 'conflict', {
      'company.code': ['Already exists.'],
    });
    request.mockRejectedValue(error);
    await expect(service.create(payload, 'key')).rejects.toBe(error);
  });
  it('does not replace missing invitation details with a simulated success', async () => {
    request.mockResolvedValue({ id: 'company-new', code: 'NEW', lifecycle: 'pending_setup' });
    await expect(service.create(payload, 'key')).rejects.toThrow(
      'creation response could not be read',
    );
  });
});
