import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PeopleApiService, WorkforcePage, WorkforceSummary } from './people-api.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { AuthService } from '../../../core/auth/auth.service';
const summary = (id: string) =>
  ({
    company_id: id,
    totals: { staff: 0 },
    company: { id, name: 'North' },
    unavailable: {},
    capabilities: {},
  }) as WorkforceSummary;
const page = (id: string) =>
  ({
    count: 0,
    results: [],
    meta: { company_id: id, page: 1, page_size: 10, branches: [], roles: [] },
  }) as unknown as WorkforcePage;
describe('Workforce API ownership', () => {
  const company = signal('north');
  const can = signal(true);
  const request = vi.fn();
  beforeEach(() => {
    company.set('north');
    can.set(true);
    request.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: CompanyAccessService, useValue: { companyId: company, can: () => can() } },
        { provide: AuthService, useValue: { profile: () => ({ id: 'user' }), api: request } },
      ],
    });
  });
  it('loads server summary and a paginated directory without local data fallback', async () => {
    request.mockImplementation((path: string) =>
      Promise.resolve(path.includes('/hr/summary') ? summary('north') : page('north')),
    );
    const service = TestBed.inject(PeopleApiService);
    TestBed.tick();
    await service.load('page=1&page_size=10');
    expect(service.summary()?.totals.staff).toBe(0);
    expect(service.directory()?.count).toBe(0);
    expect(request).toHaveBeenCalledWith('/companies/north/staff?page=1&page_size=10');
  });
  it('clears records and reports API failure instead of returning demo staff', async () => {
    request.mockRejectedValue(new Error('Workforce unavailable'));
    const service = TestBed.inject(PeopleApiService);
    TestBed.tick();
    await service.load('page=1');
    expect(service.directory()).toBeNull();
    expect(service.summary()).toBeNull();
    expect(service.error()).toContain('unavailable');
  });
  it('ignores responses from a previous workspace and clears after access revocation', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => (release = resolve));
    request.mockImplementation(async (path: string) => {
      await pending;
      return path.includes('/hr/summary') ? summary('north') : page('north');
    });
    const service = TestBed.inject(PeopleApiService);
    TestBed.tick();
    const loading = service.load('page=1');
    company.set('south');
    TestBed.tick();
    release();
    await loading;
    expect(service.directory()).toBeNull();
    expect(service.summary()).toBeNull();
    can.set(false);
    TestBed.tick();
    expect(service.directory()).toBeNull();
  });
  it('rejects a response containing records for another company', async () => {
    request.mockImplementation((path: string) =>
      Promise.resolve(path.includes('/hr/summary') ? summary('north') : page('south')),
    );
    const service = TestBed.inject(PeopleApiService);
    TestBed.tick();
    await service.load('page=1');
    expect(service.directory()).toBeNull();
    expect(service.error()).toContain('does not match');
  });
});
