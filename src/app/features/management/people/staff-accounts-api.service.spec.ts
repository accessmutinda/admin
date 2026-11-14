import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService, routeAccess } from '../../../core/access/company-access.service';
import { StaffAccountsApi, StaffAccount } from './staff-accounts-api.service';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const row: StaffAccount = {
  id: 'account',
  user_id: 42,
  employee_id: 'employee',
  company_id: 'north',
  name: 'John Smith',
  email: 'jsmith@careverity.com',
  status: 'active',
  account_active: true,
  must_change_password: true,
  last_login_at: null,
  password_changed_at: null,
  mfa_override: 'not-required',
  mfa_required: false,
  mfa_enrolled: false,
  active_sessions: 0,
  version: 2,
  etag: '"v2"',
};

describe('Staff account security requests', () => {
  const companyId = signal('north'),
    manage = signal(true),
    read = signal(true);
  const api = vi.fn();
  let service: StaffAccountsApi;
  beforeEach(() => {
    TestBed.resetTestingModule();
    companyId.set('north');
    manage.set(true);
    read.set(true);
    api.mockReset();
    api.mockResolvedValue({ count: 0, results: [] });
    TestBed.configureTestingModule({
      providers: [
        StaffAccountsApi,
        { provide: AuthService, useValue: { profile: signal({ id: 'manager' }), api } },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId,
            can: (_m: string, _s: string, action: string) =>
              action === 'manage_users' ? manage() : read(),
          },
        },
      ],
    });
    service = TestBed.inject(StaffAccountsApi);
    TestBed.tick();
  });
  it('routes user management independently of recruitment and staff records', () => {
    expect(routeAccess('/manage/people/users')).toEqual([['people', 'users']]);
  });
  it('sends the account version and an explicit MFA policy', async () => {
    api.mockResolvedValue(row);
    expect(await service.save(row, 'set-mfa', 'Staff support request', 'required')).toBe(true);
    expect(api).toHaveBeenLastCalledWith(
      '/companies/north/hr/users/account',
      { action: 'set-mfa', reason: 'Staff support request', mfa_override: 'required' },
      'POST',
      { 'If-Match': '"v2"' },
    );
  });
  it('blocks mutations without permission and across companies', async () => {
    api.mockClear();
    manage.set(false);
    expect(await service.save(row, 'reset-password', 'Staff support request')).toBe(false);
    manage.set(true);
    expect(
      await service.save({ ...row, company_id: 'south' }, 'suspend', 'Staff support request'),
    ).toBe(false);
    expect(api).not.toHaveBeenCalled();
  });
  it('rejects a foreign-company response', async () => {
    api.mockResolvedValue({ count: 1, results: [{ ...row, company_id: 'south' }] });
    await service.load();
    expect(service.page().results).toEqual([]);
    expect(service.error()).toContain('selected company');
  });
  it('discards account results and closes the scope when the workspace changes', async () => {
    let resolve!: (value: unknown) => void;
    api.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const loading = service.load();
    companyId.set('south');
    TestBed.tick();
    resolve({ count: 1, results: [row] });
    await loading;
    expect(service.page().results).toEqual([]);
  });
  it('requires reloading after a stale version and preserves the failure message', async () => {
    api.mockRejectedValue(new Error('This record changed. Reload and retry.'));
    expect(await service.save(row, 'reset-password', 'Staff support request')).toBe(false);
    expect(service.error()).toContain('Reload');
    expect(service.saving()).toBe(false);
  });
});
