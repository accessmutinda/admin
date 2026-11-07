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
