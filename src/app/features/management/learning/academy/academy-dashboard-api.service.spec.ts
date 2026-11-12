import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import { AcademyDashboardApi } from './academy-dashboard-api.service';
import { dashboardData } from './academy-dashboard-test-data';
import type { AcademyDashboardRead } from './academy.generated';

describe('Academy dashboard source adapter', () => {
  const scope = signal('first'),
    company = signal('company'),
    allowed = signal(true),
    deniedFeature = signal('');
  let api: AcademyDashboardApi,
    request: ReturnType<typeof vi.fn>,
    invalidate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scope.set('first');
    company.set('company');
    allowed.set(true);
    deniedFeature.set('');
    request = vi.fn(async (path: string) =>
      dashboardData(Number(new URL('http://local' + path).searchParams.get('period'))),
    );
    invalidate = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { api: request } },
        {
          provide: CompanyAccessService,
          useValue: {
            can: (_module: string, feature: string, action: string) =>
              allowed() && feature !== deniedFeature() && action === 'read',
            invalidate,
          },
        },
        { provide: ManagementStore, useValue: { companyId: company } },
        { provide: AcademyApi, useValue: { scope } },
      ],
    });
    api = TestBed.inject(AcademyDashboardApi);
    TestBed.tick();
  });
  it('keeps a new-workspace request when the scope effect runs after it starts', async () => {
    await api.load();
    scope.set('second');
    company.set('second');
    const response = dashboardData();
    response.meta.company_id = 'second';
    request.mockResolvedValueOnce(response);
    const loading = api.load();
    TestBed.tick();
    await loading;
    expect(api.data()?.meta.company_id).toBe('second');
  });
  it('loads one authoritative projection without browser workforce or course fixtures', async () => {
    expect(api.data()).toBeNull();
    await api.load();
    expect(request).toHaveBeenCalledWith('/companies/company/academy/dashboard?period=30');
    expect(api.data()?.recent.results[0].learner).toBe('Canonical learner');
    expect(api.data()?.integrations[2].status).toBe('Not configured');
    expect(api.can('courses', 'edit')).toBe(false);
  });
  it('requires reports and every contributing source read grant', async () => {
    await api.load();
    deniedFeature.set('results');
    expect(api.data()).toBeNull();
    await expect(api.load()).rejects.toThrow('access changed');
    expect(request).toHaveBeenCalledOnce();
  });
  it('does not let an older period response overwrite the selected period', async () => {
    let finish!: (value: AcademyDashboardRead) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const old = api.load(7);
    await api.load(90);
    finish(dashboardData(7));
    await old;
    expect(api.data()?.meta.period).toBe(90);
    expect(api.loading()).toBe(false);
  });
  it('clears data during reload and keeps an explicit unavailable state on connection failure', async () => {
    await api.load();
    request.mockRejectedValueOnce(Error('Connection lost'));
    await expect(api.load(30, true)).rejects.toThrow('Connection lost');
    expect(api.data()).toBeNull();
    expect(api.error()).toBe('Connection lost');
  });
  it('clears source data and access after server revocation without automatic request loops', async () => {
    await api.load();
    request.mockRejectedValueOnce(Object.assign(Error('Access revoked'), { status: 403 }));
    await expect(api.load(30, true)).rejects.toThrow('revoked');
    expect(api.data()).toBeNull();
    expect(invalidate).toHaveBeenCalledOnce();
    await expect(api.load()).rejects.toThrow('access is unavailable');
    expect(request).toHaveBeenCalledTimes(2);
    await api.load(30, true);
    expect(api.data()).not.toBeNull();
  });
  it('rejects foreign root or embedded page data', async () => {
    const root = dashboardData();
    root.meta = { ...root.meta, company_id: 'foreign' };
    request.mockResolvedValueOnce(root);
    await expect(api.load()).rejects.toThrow('scope mismatch');
    expect(api.data()).toBeNull();
    const page = dashboardData();
    page.activity = { ...page.activity, meta: { ...page.meta, company_id: 'foreign' } };
    request.mockResolvedValueOnce(page);
    await expect(api.load()).rejects.toThrow('scope mismatch');
    expect(api.data()).toBeNull();
  });
  it('rejects a late previous-workspace response without publishing an old error', async () => {
    let finish!: (value: AcademyDashboardRead) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = api.load();
    scope.set('other');
    company.set('other');
    TestBed.tick();
    finish(dashboardData());
    await expect(pending).rejects.toThrow('workspace');
    expect(api.data()).toBeNull();
    expect(api.error()).toBe('');
  });
  it('shares a pending read and caches only the same current period', async () => {
    let finish!: (value: AcademyDashboardRead) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = api.load(),
      second = api.load();
    expect(request).toHaveBeenCalledOnce();
    finish(dashboardData());
    await Promise.all([first, second]);
    await api.load();
    expect(request).toHaveBeenCalledOnce();
    await api.load(7);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
